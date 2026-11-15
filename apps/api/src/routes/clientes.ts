import {
  clienteCreateSchema,
  clienteQuerySchema,
  clienteSuspensionSchema,
  clienteUpdateSchema,
  hoyAsuncion,
  idSchema,
  medidorCreateSchema,
  type Cliente,
  type ClienteDetalle,
  type ClienteListItem,
  type Medidor,
} from "@aguateria/shared";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { esViolacionUnica } from "../db/errors";
import { auditoria, clientes, lecturas, medidores, periodos } from "../db/schema";
import { requireRole } from "../middleware/auth";
import {
  EstadoCuentaError,
  obtenerEstadoCuenta,
} from "../services/estado-cuenta";
import type { AppEnv } from "../types";
import { parseJson, parseQuery } from "./helpers";

type ClienteRow = typeof clientes.$inferSelect;
type MedidorRow = typeof medidores.$inferSelect;

function aCliente(fila: ClienteRow): Cliente {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    ciRuc: fila.ciRuc,
    telefono: fila.telefono,
    direccion: fila.direccion,
    fechaAlta: fila.fechaAlta,
    estado: fila.estado,
    fechaSuspension: fila.fechaSuspension,
    motivoSuspension: fila.motivoSuspension,
    observaciones: fila.observaciones,
  };
}

function aMedidor(fila: MedidorRow): Medidor {
  return {
    id: fila.id,
    clienteId: fila.clienteId,
    numeroSerie: fila.numeroSerie,
    lecturaInicial: fila.lecturaInicial,
    fechaInstalacion: fila.fechaInstalacion,
    fechaRetiro: fila.fechaRetiro,
    activo: fila.activo,
  };
}

export const clientesRoutes = new Hono<AppEnv>();

clientesRoutes.get("/", async (c) => {
  const query = parseQuery(c, clienteQuerySchema);
  if (query instanceof Response) return query;

  const condiciones: SQL[] = [];

  if (query.q) {
    const patron = `%${query.q}%`;
    const busqueda = or(
      ilike(clientes.nombre, patron),
      ilike(clientes.codigo, patron),
      ilike(clientes.ciRuc, patron),
    );
    if (busqueda) condiciones.push(busqueda);
  }

  if (query.estado) {
    condiciones.push(eq(clientes.estado, query.estado));
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clientes)
    .where(where);

  const filas = await db
    .select({ cliente: clientes, medidor: medidores })
    .from(clientes)
    .leftJoin(medidores, and(eq(medidores.clienteId, clientes.id), eq(medidores.activo, true)))
    .where(where)
    .orderBy(asc(clientes.codigo))
    .limit(query.size)
    .offset((query.page - 1) * query.size);

  const data: ClienteListItem[] = filas.map((fila) => ({
    ...aCliente(fila.cliente),
    medidor: fila.medidor ? aMedidor(fila.medidor) : null,
  }));

  return c.json({
    data,
    page: query.page,
    size: query.size,
    total: conteo?.total ?? 0,
  });
});

clientesRoutes.get("/:id", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  const [fila] = await db.select().from(clientes).where(eq(clientes.id, id.data)).limit(1);
  if (!fila) return c.json({ error: "Cliente no encontrado" }, 404);

  const medidoresCliente = await db
    .select()
    .from(medidores)
    .where(eq(medidores.clienteId, id.data))
    .orderBy(desc(medidores.activo), desc(medidores.fechaInstalacion), desc(medidores.id));

  const historial = await db
    .select({
      id: lecturas.id,
      periodoId: lecturas.periodoId,
      anio: periodos.anio,
      mes: periodos.mes,
      lecturaAnterior: lecturas.lecturaAnterior,
      lecturaActual: lecturas.lecturaActual,
      consumoM3: lecturas.consumoM3,
      fechaLectura: lecturas.fechaLectura,
    })
    .from(lecturas)
    .innerJoin(periodos, eq(periodos.id, lecturas.periodoId))
    .where(eq(lecturas.clienteId, id.data))
    .orderBy(desc(periodos.anio), desc(periodos.mes))
    .limit(24);

  const activo = medidoresCliente.find((medidor) => medidor.activo);

  const detalle: ClienteDetalle = {
    cliente: aCliente(fila),
    medidorActivo: activo ? aMedidor(activo) : null,
    medidores: medidoresCliente.map(aMedidor),
    historial,
  };

  return c.json(detalle);
});

clientesRoutes.get("/:id/estado-cuenta", async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  try {
    const estado = await obtenerEstadoCuenta(id.data);
    return c.json(estado);
  } catch (error) {
    if (error instanceof EstadoCuentaError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

clientesRoutes.post("/", requireRole("admin"), async (c) => {
  const body = await parseJson(c, clienteCreateSchema);
  if (body instanceof Response) return body;

  try {
    const resultado = await db.transaction(async (tx) => {
      const [creado] = await tx
        .insert(clientes)
        .values({
          codigo: body.codigo,
          nombre: body.nombre,
          ciRuc: body.ciRuc ?? null,
          telefono: body.telefono ?? null,
          direccion: body.direccion,
          fechaAlta: body.fechaAlta,
          estado: body.estado,
          fechaSuspension: body.estado === "suspendido" ? hoyAsuncion() : null,
          motivoSuspension:
            body.estado === "suspendido" ? "Suspensión manual" : null,
          observaciones: body.observaciones ?? null,
        })
        .returning();

      if (!creado) throw new Error("No se pudo crear el cliente");

      let medidorCreado: MedidorRow | null = null;

      if (body.medidor) {
        const [medidor] = await tx
          .insert(medidores)
          .values({
            clienteId: creado.id,
            numeroSerie: body.medidor.numeroSerie,
            lecturaInicial: body.medidor.lecturaInicial.toFixed(2),
            fechaInstalacion: body.medidor.fechaInstalacion,
            activo: true,
          })
          .returning();

        medidorCreado = medidor ?? null;
      }

      return { cliente: creado, medidor: medidorCreado };
    });

    return c.json(
      {
        cliente: aCliente(resultado.cliente),
        medidor: resultado.medidor ? aMedidor(resultado.medidor) : null,
      },
      201,
    );
  } catch (error) {
    if (esViolacionUnica(error)) {
      return c.json({ error: "Ya existe un cliente con ese código" }, 409);
    }
    throw error;
  }
});

clientesRoutes.put("/:id", requireRole("admin"), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  const body = await parseJson(c, clienteUpdateSchema);
  if (body instanceof Response) return body;

  const [actual] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id.data))
    .limit(1);

  if (!actual) return c.json({ error: "Cliente no encontrado" }, 404);

  const cambios: Partial<typeof clientes.$inferInsert> = {};

  if (body.codigo !== undefined) cambios.codigo = body.codigo;
  if (body.nombre !== undefined) cambios.nombre = body.nombre;
  if (body.ciRuc !== undefined) cambios.ciRuc = body.ciRuc ?? null;
  if (body.telefono !== undefined) cambios.telefono = body.telefono ?? null;
  if (body.direccion !== undefined) cambios.direccion = body.direccion;
  if (body.fechaAlta !== undefined) cambios.fechaAlta = body.fechaAlta;
  if (body.observaciones !== undefined) cambios.observaciones = body.observaciones ?? null;

  if (body.estado !== undefined) {
    cambios.estado = body.estado;

    if (body.estado === "activo") {
      cambios.fechaSuspension = null;
      cambios.motivoSuspension = null;
    } else if (body.estado === "suspendido" && actual.estado !== "suspendido") {
      cambios.fechaSuspension = hoyAsuncion();
      cambios.motivoSuspension = "Suspensión manual";
    }
  }

  if (Object.keys(cambios).length === 0) {
    return c.json({ error: "No hay cambios para guardar" }, 400);
  }

  try {
    const [actualizado] = await db
      .update(clientes)
      .set(cambios)
      .where(eq(clientes.id, id.data))
      .returning();

    if (!actualizado) return c.json({ error: "Cliente no encontrado" }, 404);

    await db.insert(auditoria).values({
      usuarioId: c.get("user").id,
      accion: "actualizar_cliente",
      entidad: "cliente",
      entidadId: String(id.data),
      detalle: { campos: Object.keys(cambios) },
    });

    const [medidorActivo] = await db
      .select()
      .from(medidores)
      .where(and(eq(medidores.clienteId, id.data), eq(medidores.activo, true)))
      .limit(1);

    return c.json({
      cliente: aCliente(actualizado),
      medidor: medidorActivo ? aMedidor(medidorActivo) : null,
    });
  } catch (error) {
    if (esViolacionUnica(error)) {
      return c.json({ error: "Ya existe un cliente con ese código" }, 409);
    }
    throw error;
  }
});

clientesRoutes.post("/:id/medidores", requireRole("admin"), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  const body = await parseJson(c, medidorCreateSchema);
  if (body instanceof Response) return body;

  const [cliente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.id, id.data))
    .limit(1);

  if (!cliente) return c.json({ error: "Cliente no encontrado" }, 404);

  const medidor = await db.transaction(async (tx) => {
    await tx
      .update(medidores)
      .set({ activo: false, fechaRetiro: body.fechaInstalacion })
      .where(and(eq(medidores.clienteId, id.data), eq(medidores.activo, true)));

    const [nuevo] = await tx
      .insert(medidores)
      .values({
        clienteId: id.data,
        numeroSerie: body.numeroSerie,
        lecturaInicial: body.lecturaInicial.toFixed(2),
        fechaInstalacion: body.fechaInstalacion,
        activo: true,
      })
      .returning();

    if (!nuevo) throw new Error("No se pudo crear el medidor");
    return nuevo;
  });

  return c.json(aMedidor(medidor), 201);
});

clientesRoutes.post("/:id/suspender", requireRole("admin"), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  const body = await parseJson(c, clienteSuspensionSchema);
  if (body instanceof Response) return body;

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id.data))
    .limit(1);

  if (!cliente) return c.json({ error: "Cliente no encontrado" }, 404);
  if (cliente.estado === "baja") {
    return c.json({ error: "El cliente está dado de baja" }, 400);
  }
  if (cliente.estado === "suspendido") {
    return c.json({ error: "El servicio ya está suspendido" }, 409);
  }

  const motivo = body.motivo?.trim() || "Corte por mora";
  const usuarioId = c.get("user").id;

  const [actualizado] = await db
    .update(clientes)
    .set({
      estado: "suspendido",
      fechaSuspension: hoyAsuncion(),
      motivoSuspension: motivo,
    })
    .where(eq(clientes.id, id.data))
    .returning();

  if (!actualizado) return c.json({ error: "Cliente no encontrado" }, 404);

  await db.insert(auditoria).values({
    usuarioId,
    accion: "suspender_cliente",
    entidad: "cliente",
    entidadId: String(id.data),
    detalle: { motivo, estadoAnterior: cliente.estado },
  });

  return c.json(aCliente(actualizado));
});

clientesRoutes.post("/:id/reconectar", requireRole("admin"), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cliente inválido" }, 400);

  const body = await parseJson(c, clienteSuspensionSchema);
  if (body instanceof Response) return body;

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id.data))
    .limit(1);

  if (!cliente) return c.json({ error: "Cliente no encontrado" }, 404);
  if (cliente.estado === "baja") {
    return c.json({ error: "El cliente está dado de baja" }, 400);
  }
  if (cliente.estado === "activo") {
    return c.json({ error: "El servicio ya está activo" }, 409);
  }

  const usuarioId = c.get("user").id;

  const [actualizado] = await db
    .update(clientes)
    .set({
      estado: "activo",
      fechaSuspension: null,
      motivoSuspension: null,
    })
    .where(eq(clientes.id, id.data))
    .returning();

  if (!actualizado) return c.json({ error: "Cliente no encontrado" }, 404);

  await db.insert(auditoria).values({
    usuarioId,
    accion: "reconectar_cliente",
    entidad: "cliente",
    entidadId: String(id.data),
    detalle: {
      fechaSuspensionAnterior: cliente.fechaSuspension,
      motivoSuspensionAnterior: cliente.motivoSuspension,
      motivo: body.motivo?.trim() || null,
    },
  });

  return c.json(aCliente(actualizado));
});
