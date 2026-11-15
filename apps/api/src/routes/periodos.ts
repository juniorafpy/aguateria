import {
  formatPeriodo,
  idSchema,
  periodoCreateSchema,
  periodoQuerySchema,
  type Periodo,
} from "@aguateria/shared";
import { and, asc, desc, eq, inArray, isNotNull, lt, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { esViolacionUnica } from "../db/errors";
import { clientes, lecturas, medidores, periodos, auditoria } from "../db/schema";
import { requireRole } from "../middleware/auth";
import {
  FacturacionError,
  generarFacturasPeriodo,
} from "../services/facturacion";
import type { AppEnv } from "../types";
import { parseJson, parseQuery } from "./helpers";

type PeriodoRow = typeof periodos.$inferSelect;

function aPeriodo(fila: PeriodoRow): Periodo {
  return {
    id: fila.id,
    anio: fila.anio,
    mes: fila.mes,
    estado: fila.estado,
    fechaVencimiento: fila.fechaVencimiento,
  };
}

export const periodosRoutes = new Hono<AppEnv>();

periodosRoutes.get("/", async (c) => {
  const query = parseQuery(c, periodoQuerySchema);
  if (query instanceof Response) return query;

  const condiciones: SQL[] = [];
  if (query.anio !== undefined) condiciones.push(eq(periodos.anio, query.anio));
  if (query.mes !== undefined) condiciones.push(eq(periodos.mes, query.mes));

  const filas = await db
    .select()
    .from(periodos)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(periodos.anio), desc(periodos.mes));

  return c.json({ data: filas.map(aPeriodo) });
});

periodosRoutes.post("/", requireRole("admin"), async (c) => {
  const body = await parseJson(c, periodoCreateSchema);
  if (body instanceof Response) return body;

  const [existente] = await db
    .select({ id: periodos.id })
    .from(periodos)
    .where(and(eq(periodos.anio, body.anio), eq(periodos.mes, body.mes)))
    .limit(1);

  if (existente) {
    return c.json(
      { error: `El período ${formatPeriodo(body.anio, body.mes)} ya existe` },
      409,
    );
  }

  const usuarioId = c.get("user").id;

  try {
    const creado = await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(periodos)
        .values({
          anio: body.anio,
          mes: body.mes,
          fechaVencimiento: body.fechaVencimiento,
          estado: "abierto",
        })
        .returning();

      if (!nuevo) throw new Error("No se pudo abrir el período");

      const activos = await tx
        .select({
          clienteId: clientes.id,
          medidorId: medidores.id,
          lecturaInicial: medidores.lecturaInicial,
        })
        .from(clientes)
        .innerJoin(
          medidores,
          and(eq(medidores.clienteId, clientes.id), eq(medidores.activo, true)),
        )
        .where(eq(clientes.estado, "activo"))
        .orderBy(asc(clientes.codigo));

      if (activos.length === 0) return nuevo;

      const anteriores = await tx
        .select({
          clienteId: lecturas.clienteId,
          lecturaActual: lecturas.lecturaActual,
          anio: periodos.anio,
          mes: periodos.mes,
        })
        .from(lecturas)
        .innerJoin(periodos, eq(periodos.id, lecturas.periodoId))
        .where(
          and(
            inArray(
              lecturas.clienteId,
              activos.map((fila) => fila.clienteId),
            ),
            isNotNull(lecturas.lecturaActual),
            or(
              lt(periodos.anio, body.anio),
              and(eq(periodos.anio, body.anio), lt(periodos.mes, body.mes)),
            ),
          ),
        )
        .orderBy(asc(lecturas.clienteId), desc(periodos.anio), desc(periodos.mes));

      const ultimaPorCliente = new Map<number, string>();
      for (const fila of anteriores) {
        if (fila.lecturaActual !== null && !ultimaPorCliente.has(fila.clienteId)) {
          ultimaPorCliente.set(fila.clienteId, fila.lecturaActual);
        }
      }

      await tx.insert(lecturas).values(
        activos.map((fila) => ({
          periodoId: nuevo.id,
          clienteId: fila.clienteId,
          medidorId: fila.medidorId,
          lecturaAnterior: ultimaPorCliente.get(fila.clienteId) ?? fila.lecturaInicial,
          lecturaActual: null,
          consumoM3: null,
          fechaLectura: null,
          usuarioId,
        })),
      );

      return nuevo;
    });

    return c.json(aPeriodo(creado), 201);
  } catch (error) {
    if (esViolacionUnica(error)) {
      return c.json({ error: "Ese período ya existe" }, 409);
    }
    throw error;
  }
});

periodosRoutes.post("/:id/facturar", requireRole("admin"), async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  try {
    const resultado = await generarFacturasPeriodo(parsed.data);
    return c.json(resultado, 201);
  } catch (error) {
    if (error instanceof FacturacionError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

periodosRoutes.post("/:id/cerrar", requireRole("admin"), async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  const [periodo] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, parsed.data))
    .limit(1);

  if (!periodo) return c.json({ error: "Período no encontrado" }, 404);
  if (periodo.estado === "cerrado") {
    return c.json({ error: "El período ya está cerrado" }, 409);
  }

  const usuarioId = c.get("user").id;

  await db.transaction(async (tx) => {
    await tx
      .update(periodos)
      .set({ estado: "cerrado" })
      .where(eq(periodos.id, periodo.id));

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "cerrar_periodo",
      entidad: "periodo",
      entidadId: String(periodo.id),
      detalle: {
        anio: periodo.anio,
        mes: periodo.mes,
        estadoAnterior: periodo.estado,
      },
    });
  });

  const [actualizado] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, periodo.id))
    .limit(1);

  return c.json(aPeriodo(actualizado ?? periodo));
});

periodosRoutes.post("/:id/reabrir", requireRole("admin"), async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  const [periodo] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, parsed.data))
    .limit(1);

  if (!periodo) return c.json({ error: "Período no encontrado" }, 404);
  if (periodo.estado === "abierto") {
    return c.json({ error: "El período ya está abierto" }, 409);
  }

  const usuarioId = c.get("user").id;

  await db.transaction(async (tx) => {
    await tx
      .update(periodos)
      .set({ estado: "abierto" })
      .where(eq(periodos.id, periodo.id));

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "reabrir_periodo",
      entidad: "periodo",
      entidadId: String(periodo.id),
      detalle: {
        anio: periodo.anio,
        mes: periodo.mes,
        estadoAnterior: periodo.estado,
      },
    });
  });

  const [actualizado] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, periodo.id))
    .limit(1);

  return c.json(aPeriodo(actualizado ?? periodo));
});
