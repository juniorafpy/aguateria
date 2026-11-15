import {
  cargoCreateSchema,
  cargoQuerySchema,
  idSchema,
  type CargoExtra,
  type CargoExtraListItem,
  type Paginated,
} from "@aguateria/shared";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { auditoria, cargosExtra, clientes, facturas } from "../db/schema";
import { requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";
import { parseJson, parseQuery } from "./helpers";

type CargoRow = typeof cargosExtra.$inferSelect;

function aCargo(fila: CargoRow): CargoExtra {
  return {
    id: fila.id,
    clienteId: fila.clienteId,
    concepto: fila.concepto,
    monto: fila.monto,
    fecha: fila.fecha,
    facturado: fila.facturado,
    anulado: fila.anulado,
    facturaId: fila.facturaId,
    usuarioId: fila.usuarioId,
    creadoEn: fila.creadoEn.toISOString(),
  };
}

export const cargosRoutes = new Hono<AppEnv>();

cargosRoutes.get("/", async (c) => {
  const query = parseQuery(c, cargoQuerySchema);
  if (query instanceof Response) return query;

  const condiciones: SQL[] = [];

  if (query.clienteId !== undefined) {
    condiciones.push(eq(cargosExtra.clienteId, query.clienteId));
  }

  if (query.estado === "pendiente") {
    condiciones.push(eq(cargosExtra.facturado, false), eq(cargosExtra.anulado, false));
  } else if (query.estado === "facturado") {
    condiciones.push(eq(cargosExtra.facturado, true), eq(cargosExtra.anulado, false));
  } else if (query.estado === "anulado") {
    condiciones.push(eq(cargosExtra.anulado, true));
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cargosExtra)
    .where(where);

  const filas = await db
    .select({
      cargo: cargosExtra,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
      },
      factura: {
        id: facturas.id,
        numero: facturas.numero,
      },
    })
    .from(cargosExtra)
    .innerJoin(clientes, eq(clientes.id, cargosExtra.clienteId))
    .leftJoin(facturas, eq(facturas.id, cargosExtra.facturaId))
    .where(where)
    .orderBy(desc(cargosExtra.fecha), desc(cargosExtra.id))
    .limit(query.size)
    .offset((query.page - 1) * query.size);

  const data: CargoExtraListItem[] = filas.map((fila) => ({
    ...aCargo(fila.cargo),
    cliente: fila.cliente,
    factura: fila.factura?.id ? fila.factura : null,
  }));

  const respuesta: Paginated<CargoExtraListItem> = {
    data,
    page: query.page,
    size: query.size,
    total: conteo?.total ?? 0,
  };

  return c.json(respuesta);
});

cargosRoutes.post("/", requireRole("admin"), async (c) => {
  const body = await parseJson(c, cargoCreateSchema);
  if (body instanceof Response) return body;

  const [cliente] = await db
    .select({ id: clientes.id, estado: clientes.estado })
    .from(clientes)
    .where(eq(clientes.id, body.clienteId))
    .limit(1);

  if (!cliente) return c.json({ error: "Cliente no encontrado" }, 404);
  if (cliente.estado === "baja") {
    return c.json({ error: "No se pueden agregar cargos a un cliente dado de baja" }, 400);
  }

  const usuarioId = c.get("user").id;

  const [creado] = await db
    .insert(cargosExtra)
    .values({
      clienteId: body.clienteId,
      concepto: body.concepto,
      monto: body.monto,
      fecha: body.fecha,
      usuarioId,
    })
    .returning();

  if (!creado) throw new Error("No se pudo crear el cargo");

  await db.insert(auditoria).values({
    usuarioId,
    accion: "crear_cargo",
    entidad: "cargo_extra",
    entidadId: String(creado.id),
    detalle: {
      clienteId: body.clienteId,
      concepto: body.concepto,
      monto: body.monto,
      fecha: body.fecha,
    },
  });

  return c.json(aCargo(creado), 201);
});

cargosRoutes.post("/:id/anular", requireRole("admin"), async (c) => {
  const id = idSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Id de cargo inválido" }, 400);

  const [cargo] = await db
    .select()
    .from(cargosExtra)
    .where(eq(cargosExtra.id, id.data))
    .limit(1);

  if (!cargo) return c.json({ error: "Cargo no encontrado" }, 404);
  if (cargo.anulado) return c.json({ error: "El cargo ya está anulado" }, 409);
  if (cargo.facturado) {
    return c.json(
      { error: "El cargo ya fue incluido en una factura y no se puede anular" },
      400,
    );
  }

  const [anulado] = await db
    .update(cargosExtra)
    .set({ anulado: true })
    .where(
      and(
        eq(cargosExtra.id, id.data),
        eq(cargosExtra.anulado, false),
        eq(cargosExtra.facturado, false),
      ),
    )
    .returning();

  if (!anulado) {
    return c.json({ error: "El cargo cambió de estado; recargá la lista" }, 409);
  }

  await db.insert(auditoria).values({
    usuarioId: c.get("user").id,
    accion: "anular_cargo",
    entidad: "cargo_extra",
    entidadId: String(id.data),
    detalle: {
      clienteId: cargo.clienteId,
      concepto: cargo.concepto,
      monto: cargo.monto,
    },
  });

  return c.json(aCargo(anulado));
});
