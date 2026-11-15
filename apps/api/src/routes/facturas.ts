import {
  facturaPreviewQuerySchema,
  facturaQuerySchema,
  facturaRecibosQuerySchema,
  hoyAsuncion,
  idSchema,
  type FacturaDetalle,
  type FacturaListItem,
  type Paginated,
  type Pago,
} from "@aguateria/shared";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { clientes, facturas, lecturas, pagos, periodos } from "../db/schema";
import { requireRole } from "../middleware/auth";
import { previsualizarFacturasPeriodo, FacturacionError } from "../services/facturacion";
import { aPago, anularFactura } from "../services/pagos";
import type { AppEnv } from "../types";
import { parseQuery } from "./helpers";

type FacturaRow = typeof facturas.$inferSelect;

function saldoFactura(totalAPagar: number, pagado: number): number {
  return Math.max(0, totalAPagar - pagado);
}

function aFacturaBase(fila: FacturaRow, pagado: number) {
  const saldo = fila.estado === "anulada" ? 0 : saldoFactura(fila.totalAPagar, pagado);
  return {
    id: fila.id,
    numero: fila.numero,
    periodoId: fila.periodoId,
    clienteId: fila.clienteId,
    lecturaId: fila.lecturaId,
    consumoM3: fila.consumoM3,
    cargoFijo: fila.cargoFijo,
    montoConsumo: fila.montoConsumo,
    otrosCargos: fila.otrosCargos,
    saldoAnterior: fila.saldoAnterior,
    total: fila.total,
    totalAPagar: fila.totalAPagar,
    pagado,
    saldo,
    estado: fila.estado,
    fechaEmision: fila.fechaEmision,
    fechaVencimiento: fila.fechaVencimiento,
    vencida:
      fila.estado !== "anulada" && saldo > 0 && fila.fechaVencimiento < hoyAsuncion(),
    creadoEn: fila.creadoEn.toISOString(),
  };
}

async function pagadoPorFactura(
  facturaIds: number[],
): Promise<Map<number, number>> {
  const mapa = new Map<number, number>();
  if (facturaIds.length === 0) return mapa;

  const filas = await db
    .select({
      facturaId: pagos.facturaId,
      total: sql<number>`coalesce(sum(${pagos.monto}), 0)::int`,
    })
    .from(pagos)
    .where(and(inArray(pagos.facturaId, facturaIds), eq(pagos.anulado, false)))
    .groupBy(pagos.facturaId);

  for (const fila of filas) {
    if (fila.facturaId !== null) mapa.set(fila.facturaId, fila.total);
  }

  return mapa;
}

export const facturasRoutes = new Hono<AppEnv>();

facturasRoutes.get("/", async (c) => {
  const query = parseQuery(c, facturaQuerySchema);
  if (query instanceof Response) return query;

  const condiciones: SQL[] = [];

  if (query.periodoId !== undefined) {
    condiciones.push(eq(facturas.periodoId, query.periodoId));
  }
  if (query.clienteId !== undefined) {
    condiciones.push(eq(facturas.clienteId, query.clienteId));
  }
  if (query.estado !== undefined) {
    condiciones.push(eq(facturas.estado, query.estado));
  }
  if (query.q) {
    const patron = `%${query.q}%`;
    const busqueda = or(
      ilike(facturas.numero, patron),
      ilike(clientes.nombre, patron),
      ilike(clientes.codigo, patron),
      ilike(clientes.ciRuc, patron),
    );
    if (busqueda) condiciones.push(busqueda);
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.clienteId, clientes.id))
    .where(where);

  const filas = await db
    .select({
      factura: facturas,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
        ciRuc: clientes.ciRuc,
        direccion: clientes.direccion,
      },
      periodo: { id: periodos.id, anio: periodos.anio, mes: periodos.mes },
    })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(periodos, eq(facturas.periodoId, periodos.id))
    .where(where)
    .orderBy(
      desc(periodos.anio),
      desc(periodos.mes),
      desc(facturas.fechaVencimiento),
      asc(clientes.codigo),
    )
    .limit(query.size)
    .offset((query.page - 1) * query.size);

  const pagados = await pagadoPorFactura(filas.map((fila) => fila.factura.id));

  const data: FacturaListItem[] = filas.map((fila) => ({
    ...aFacturaBase(fila.factura, pagados.get(fila.factura.id) ?? 0),
    cliente: fila.cliente,
    periodo: fila.periodo,
  }));

  const respuesta: Paginated<FacturaListItem> = {
    data,
    page: query.page,
    size: query.size,
    total: conteo?.total ?? 0,
  };

  return c.json(respuesta);
});

facturasRoutes.get("/preview", async (c) => {
  const query = parseQuery(c, facturaPreviewQuerySchema);
  if (query instanceof Response) return query;

  try {
    const preview = await previsualizarFacturasPeriodo(query.periodoId);
    return c.json(preview);
  } catch (error) {
    if (error instanceof FacturacionError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

facturasRoutes.get("/recibos", async (c) => {
  const query = parseQuery(c, facturaRecibosQuerySchema);
  if (query instanceof Response) return query;

  const filas = await db
    .select({
      factura: facturas,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
        ciRuc: clientes.ciRuc,
        direccion: clientes.direccion,
      },
      periodo: { id: periodos.id, anio: periodos.anio, mes: periodos.mes },
      lectura: {
        lecturaAnterior: lecturas.lecturaAnterior,
        lecturaActual: lecturas.lecturaActual,
        fechaLectura: lecturas.fechaLectura,
      },
    })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(periodos, eq(facturas.periodoId, periodos.id))
    .leftJoin(lecturas, eq(facturas.lecturaId, lecturas.id))
    .where(
      and(
        eq(facturas.periodoId, query.periodoId),
        ne(facturas.estado, "anulada"),
      ),
    )
    .orderBy(asc(clientes.codigo), asc(facturas.id));

  const ids = filas.map((fila) => fila.factura.id);
  const pagados = await pagadoPorFactura(ids);

  const pagosAsociados =
    ids.length > 0
      ? await db
          .select()
          .from(pagos)
          .where(and(inArray(pagos.facturaId, ids), eq(pagos.anulado, false)))
          .orderBy(desc(pagos.fecha), desc(pagos.id))
      : [];

  const pagosPorFactura = new Map<number, Pago[]>();
  for (const pago of pagosAsociados) {
    if (pago.facturaId === null) continue;
    const lista = pagosPorFactura.get(pago.facturaId) ?? [];
    lista.push(aPago(pago));
    pagosPorFactura.set(pago.facturaId, lista);
  }

  const data: FacturaDetalle[] = filas.map((fila) => ({
    ...aFacturaBase(fila.factura, pagados.get(fila.factura.id) ?? 0),
    cliente: fila.cliente,
    periodo: fila.periodo,
    lectura: fila.lectura?.lecturaAnterior ? fila.lectura : null,
    pagos: pagosPorFactura.get(fila.factura.id) ?? [],
  }));

  return c.json({ data });
});

facturasRoutes.get("/:id", async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  const [fila] = await db
    .select({
      factura: facturas,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
        ciRuc: clientes.ciRuc,
        direccion: clientes.direccion,
      },
      periodo: { id: periodos.id, anio: periodos.anio, mes: periodos.mes },
      lectura: {
        lecturaAnterior: lecturas.lecturaAnterior,
        lecturaActual: lecturas.lecturaActual,
        fechaLectura: lecturas.fechaLectura,
      },
    })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(periodos, eq(facturas.periodoId, periodos.id))
    .leftJoin(lecturas, eq(facturas.lecturaId, lecturas.id))
    .where(eq(facturas.id, parsed.data))
    .limit(1);

  if (!fila) return c.json({ error: "Factura no encontrada" }, 404);

  const pagados = await pagadoPorFactura([fila.factura.id]);
  const pagosAsociados = await db
    .select()
    .from(pagos)
    .where(and(eq(pagos.facturaId, fila.factura.id), eq(pagos.anulado, false)))
    .orderBy(desc(pagos.fecha), desc(pagos.id));

  const detalle: FacturaDetalle = {
    ...aFacturaBase(fila.factura, pagados.get(fila.factura.id) ?? 0),
    cliente: fila.cliente,
    periodo: fila.periodo,
    lectura: fila.lectura?.lecturaAnterior ? fila.lectura : null,
    pagos: pagosAsociados.map(aPago) satisfies Pago[],
  };

  return c.json(detalle);
});

facturasRoutes.post("/:id/anular", requireRole("admin"), async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  const usuarioId = c.get("user").id;

  try {
    await anularFactura(parsed.data, usuarioId);
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});
