import { hoyAsuncion, rangoMesActual } from "@aguateria/shared";
import { and, desc, eq, gte, inArray, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { clientes, facturas, lecturas, pagos, periodos } from "../db/schema";
import type { AppEnv } from "../types";

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.get("/", async (c) => {
  const porEstado = await db
    .select({ estado: clientes.estado, cantidad: sql<number>`count(*)::int` })
    .from(clientes)
    .groupBy(clientes.estado);

  const activos = porEstado.find((fila) => fila.estado === "activo")?.cantidad ?? 0;
  const suspendidos = porEstado.find((fila) => fila.estado === "suspendido")?.cantidad ?? 0;
  const total = porEstado.reduce((suma, fila) => suma + fila.cantidad, 0);

  const [periodo] = await db
    .select()
    .from(periodos)
    .orderBy(desc(periodos.anio), desc(periodos.mes))
    .limit(1);

  let cargadas = 0;
  let facturadoMes = 0;

  if (periodo) {
    const [cargadasRow] = await db
      .select({ cantidad: sql<number>`count(*)::int` })
      .from(lecturas)
      .where(and(eq(lecturas.periodoId, periodo.id), isNotNull(lecturas.lecturaActual)));

    cargadas = cargadasRow?.cantidad ?? 0;

    const [facturadoRow] = await db
      .select({ total: sql<number>`coalesce(sum(${facturas.total}), 0)::int` })
      .from(facturas)
      .where(and(eq(facturas.periodoId, periodo.id), ne(facturas.estado, "anulada")));

    facturadoMes = facturadoRow?.total ?? 0;
  }

  const { desde, hasta } = rangoMesActual();

  const [cobradoRow] = await db
    .select({ total: sql<number>`coalesce(sum(${pagos.monto}), 0)::int` })
    .from(pagos)
    .where(and(eq(pagos.anulado, false), gte(pagos.fecha, desde), lte(pagos.fecha, hasta)));

  const [totalFacturadoRow] = await db
    .select({ total: sql<number>`coalesce(sum(${facturas.totalAPagar}), 0)::int` })
    .from(facturas)
    .where(ne(facturas.estado, "anulada"));

  const [totalPagosRow] = await db
    .select({ total: sql<number>`coalesce(sum(${pagos.monto}), 0)::int` })
    .from(pagos)
    .where(eq(pagos.anulado, false));

  const hoy = hoyAsuncion();

  const morososRows = await db
    .select({
      clienteId: facturas.clienteId,
      monto: sql<number>`coalesce(sum(${facturas.totalAPagar}), 0)::int`,
    })
    .from(facturas)
    .where(
      and(inArray(facturas.estado, ["pendiente", "parcial"]), lt(facturas.fechaVencimiento, hoy)),
    )
    .groupBy(facturas.clienteId);

  return c.json({
    clientes: { activos, suspendidos, total },
    periodo: periodo
      ? {
          id: periodo.id,
          anio: periodo.anio,
          mes: periodo.mes,
          estado: periodo.estado,
          fechaVencimiento: periodo.fechaVencimiento,
        }
      : null,
    lecturas: {
      cargadas,
      faltantes: Math.max(0, activos - cargadas),
      total: activos,
    },
    facturacion: {
      facturadoMes,
      cobradoMes: cobradoRow?.total ?? 0,
      pendienteTotal: Math.max(0, (totalFacturadoRow?.total ?? 0) - (totalPagosRow?.total ?? 0)),
    },
    morosos: {
      cantidad: morososRows.length,
      monto: morososRows.reduce((suma, fila) => suma + fila.monto, 0),
    },
  });
});
