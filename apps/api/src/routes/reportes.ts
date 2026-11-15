import {
  hoyAsuncion,
  reporteConsumoQuerySchema,
  reporteFormatoSchema,
  reporteRecaudacionQuerySchema,
} from "@aguateria/shared";
import { Hono } from "hono";
import { generarCsv, respuestaCsv } from "../services/csv";
import {
  obtenerReporteConsumo,
  obtenerReporteMorosos,
  obtenerReporteRecaudacion,
} from "../services/reportes";
import type { AppEnv } from "../types";
import { parseQuery } from "./helpers";

export const reportesRoutes = new Hono<AppEnv>();

reportesRoutes.get("/morosos", async (c) => {
  const query = parseQuery(c, reporteFormatoSchema);
  if (query instanceof Response) return query;

  const reporte = await obtenerReporteMorosos();

  if (query.formato === "csv") {
    const csv = generarCsv(
      [
        "Código",
        "Cliente",
        "Teléfono",
        "Dirección",
        "Facturas pendientes",
        "Deuda (Gs.)",
        "Meses de atraso",
        "Vencida desde",
      ],
      reporte.filas.map((fila) => [
        fila.codigo,
        fila.nombre,
        fila.telefono,
        fila.direccion,
        fila.facturasPendientes,
        fila.deuda,
        fila.mesesAtraso,
        fila.vencidaDesde,
      ]),
    );

    return respuestaCsv(c, `morosos-${hoyAsuncion()}.csv`, csv);
  }

  return c.json(reporte);
});

reportesRoutes.get("/consumo", async (c) => {
  const query = parseQuery(c, reporteConsumoQuerySchema);
  if (query instanceof Response) return query;

  const reporte = await obtenerReporteConsumo(query.periodoId);

  if (query.formato === "csv") {
    const nombrePeriodo = reporte.periodo
      ? `${reporte.periodo.anio}-${String(reporte.periodo.mes).padStart(2, "0")}`
      : "sin-periodo";

    const csv = generarCsv(
      [
        "Código",
        "Cliente",
        "Lectura anterior (m³)",
        "Lectura actual (m³)",
        "Consumo (m³)",
      ],
      reporte.filas.map((fila) => [
        fila.codigo,
        fila.nombre,
        fila.lecturaAnterior,
        fila.lecturaActual,
        fila.consumoM3,
      ]),
    );

    return respuestaCsv(c, `consumo-${nombrePeriodo}.csv`, csv);
  }

  return c.json(reporte);
});

reportesRoutes.get("/recaudacion", async (c) => {
  const query = parseQuery(c, reporteRecaudacionQuerySchema);
  if (query instanceof Response) return query;

  if (query.desde > query.hasta) {
    return c.json({ error: "El rango de fechas es inválido" }, 400);
  }

  const reporte = await obtenerReporteRecaudacion(query.desde, query.hasta);

  if (query.formato === "csv") {
    const csv = generarCsv(
      [
        "Recibo",
        "Fecha",
        "Cliente",
        "Código",
        "Factura",
        "Método",
        "Monto (Gs.)",
      ],
      reporte.pagos.map((pago) => [
        pago.numeroRecibo,
        pago.fecha,
        pago.cliente.nombre,
        pago.cliente.codigo,
        pago.factura?.numero ?? "Saldo a favor",
        pago.metodo,
        pago.monto,
      ]),
    );

    return respuestaCsv(
      c,
      `recaudacion-${query.desde}-${query.hasta}.csv`,
      csv,
    );
  }

  return c.json(reporte);
});
