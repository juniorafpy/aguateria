import {
  usuarioCreateSchema,
  usuarioEstadoSchema,
  usuarioPasswordSchema,
  usuarioUpdateSchema,
  type UsuarioListItem,
} from "@aguateria/shared";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth";
import { db } from "../db";
import { esViolacionUnica } from "../db/errors";
import { auditoria, user } from "../db/schema";
import { requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";
import { parseJson } from "./helpers";

type UsuarioRow = typeof user.$inferSelect;

function aUsuario(fila: UsuarioRow): UsuarioListItem {
  return {
    id: fila.id,
    name: fila.name,
    username: fila.username,
    email: fila.email,
    role: fila.role === "admin" ? "admin" : "operador",
    banned: fila.banned,
    banReason: fila.banReason,
    createdAt: fila.createdAt.toISOString(),
  };
}

async function buscarUsuario(id: string): Promise<UsuarioRow | null> {
  const [fila] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return fila ?? null;
}

async function esUltimoAdmin(usuarioId: string): Promise<boolean> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(user)
    .where(
      and(
        eq(user.role, "admin"),
        eq(user.banned, false),
        ne(user.id, usuarioId),
      ),
    );

  return (fila?.total ?? 0) === 0;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

export const usuariosRoutes = new Hono<AppEnv>();

usuariosRoutes.use("*", requireRole("admin"));

usuariosRoutes.get("/", async (c) => {
  const filas = await db
    .select()
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.name));

  return c.json({ data: filas.map(aUsuario) });
});

usuariosRoutes.post("/", async (c) => {
  const body = await parseJson(c, usuarioCreateSchema);
  if (body instanceof Response) return body;

  const username = body.username.toLowerCase();

  const [existente] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.username}) = ${username}`)
    .limit(1);

  if (existente) {
    return c.json({ error: "Ya existe un usuario con ese nombre de usuario" }, 409);
  }

  try {
    const creado = await auth.api.createUser({
      body: {
        email: `${username}@aguateria.local`,
        password: body.password,
        name: body.name,
        data: {
          username,
          displayUsername: body.username,
          emailVerified: true,
          role: body.role,
        },
      },
      headers: c.req.raw.headers,
    });

    const fila = await buscarUsuario(creado.user.id);
    if (!fila) throw new Error("El usuario se creó pero no se pudo leer");

    await db.insert(auditoria).values({
      usuarioId: c.get("user").id,
      accion: "crear_usuario",
      entidad: "usuario",
      entidadId: fila.id,
      detalle: { username: fila.username, rol: fila.role },
    });

    return c.json(aUsuario(fila), 201);
  } catch (error) {
    if (esViolacionUnica(error) || /already exists/i.test(mensajeError(error))) {
      return c.json({ error: "Ya existe un usuario con ese nombre de usuario" }, 409);
    }
    return c.json({ error: mensajeError(error) }, 400);
  }
});

usuariosRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const actual = await buscarUsuario(id);
  if (!actual) return c.json({ error: "Usuario no encontrado" }, 404);

  const body = await parseJson(c, usuarioUpdateSchema);
  if (body instanceof Response) return body;

  const actorId = c.get("user").id;

  if (body.role !== undefined && body.role !== actual.role) {
    if (id === actorId) {
      return c.json({ error: "No podés cambiar tu propio rol" }, 400);
    }
    if (actual.role === "admin" && (await esUltimoAdmin(id))) {
      return c.json(
        { error: "No podés quitar el rol al último administrador activo" },
        400,
      );
    }
  }

  const cambios: Partial<typeof user.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) cambios.name = body.name;

  if (body.username !== undefined) {
    const username = body.username.toLowerCase();
    const [repetido] = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          sql`lower(${user.username}) = ${username}`,
          ne(user.id, id),
        ),
      )
      .limit(1);

    if (repetido) {
      return c.json({ error: "Ya existe un usuario con ese nombre de usuario" }, 409);
    }

    cambios.username = username;
    cambios.displayUsername = body.username;
  }

  if (body.role !== undefined) cambios.role = body.role;

  try {
    const [actualizado] = await db
      .update(user)
      .set(cambios)
      .where(eq(user.id, id))
      .returning();

    if (!actualizado) return c.json({ error: "Usuario no encontrado" }, 404);

    await db.insert(auditoria).values({
      usuarioId: actorId,
      accion: "actualizar_usuario",
      entidad: "usuario",
      entidadId: id,
      detalle: {
        campos: Object.keys(cambios).filter((campo) => campo !== "updatedAt"),
        rolAnterior: actual.role,
        rolNuevo: actualizado.role,
      },
    });

    return c.json(aUsuario(actualizado));
  } catch (error) {
    if (esViolacionUnica(error)) {
      return c.json({ error: "Ya existe un usuario con ese nombre de usuario" }, 409);
    }
    throw error;
  }
});

usuariosRoutes.put("/:id/password", async (c) => {
  const id = c.req.param("id");
  const actual = await buscarUsuario(id);
  if (!actual) return c.json({ error: "Usuario no encontrado" }, 404);

  const body = await parseJson(c, usuarioPasswordSchema);
  if (body instanceof Response) return body;

  try {
    await auth.api.setUserPassword({
      body: { userId: id, newPassword: body.newPassword },
      headers: c.req.raw.headers,
    });

    const actorId = c.get("user").id;

    if (id !== actorId) {
      await auth.api.revokeUserSessions({
        body: { userId: id },
        headers: c.req.raw.headers,
      });
    }

    await db.insert(auditoria).values({
      usuarioId: actorId,
      accion: "cambiar_password_usuario",
      entidad: "usuario",
      entidadId: id,
      detalle: { sesionesRevocadas: id !== actorId },
    });

    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: mensajeError(error) }, 400);
  }
});

usuariosRoutes.post("/:id/estado", async (c) => {
  const id = c.req.param("id");
  const actual = await buscarUsuario(id);
  if (!actual) return c.json({ error: "Usuario no encontrado" }, 404);

  const body = await parseJson(c, usuarioEstadoSchema);
  if (body instanceof Response) return body;

  const actorId = c.get("user").id;

  if (!body.activo && id === actorId) {
    return c.json({ error: "No podés desactivar tu propio usuario" }, 400);
  }

  if (!body.activo && actual.role === "admin" && (await esUltimoAdmin(id))) {
    return c.json(
      { error: "No podés desactivar al último administrador activo" },
      400,
    );
  }

  try {
    if (body.activo) {
      await auth.api.unbanUser({
        body: { userId: id },
        headers: c.req.raw.headers,
      });
    } else {
      await auth.api.banUser({
        body: {
          userId: id,
          banReason: body.motivo?.trim() || "Desactivado por administrador",
        },
        headers: c.req.raw.headers,
      });
    }

    const actualizado = await buscarUsuario(id);
    if (!actualizado) return c.json({ error: "Usuario no encontrado" }, 404);

    await db.insert(auditoria).values({
      usuarioId: actorId,
      accion: body.activo ? "activar_usuario" : "desactivar_usuario",
      entidad: "usuario",
      entidadId: id,
      detalle: { motivo: body.motivo?.trim() || null },
    });

    return c.json(aUsuario(actualizado));
  } catch (error) {
    return c.json({ error: mensajeError(error) }, 400);
  }
});

usuariosRoutes.post("/:id/sesiones/revocar", async (c) => {
  const id = c.req.param("id");
  const actual = await buscarUsuario(id);
  if (!actual) return c.json({ error: "Usuario no encontrado" }, 404);

  try {
    await auth.api.revokeUserSessions({
      body: { userId: id },
      headers: c.req.raw.headers,
    });

    await db.insert(auditoria).values({
      usuarioId: c.get("user").id,
      accion: "revocar_sesiones_usuario",
      entidad: "usuario",
      entidadId: id,
    });

    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: mensajeError(error) }, 400);
  }
});
