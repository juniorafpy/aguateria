import {
  hoyAsuncion,
  type PagoListItem,
  type ReporteConsumo,
  type ReporteConsumoFila,
  type ReporteMoroso,
  type ReporteMorosos,
  type ReporteRecaudacion,
  type ReporteRecaudacionDia,
} from "@aguateria/shared";
import { and, asc, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "../db";
import { clientes, facturas, lecturas, pagos, periodos } from "../db/schema";
import { obtenerCierreCaja } from "./pagos";

/**
 * Meses completos de atraso entre dos fechas aaaa-mm-dd.
 * Si la fecha de vencimiento ya pasó, devuelve al menos 1.
 */
export function calcularMesesAtraso(desde: string, hasta: string): number {
  const [anioDesde, mesDesde, diaDesde] = desde.slice(0, 10).split("-").map(Number);
  const [anioHasta, mesHasta, diaHasta] = hasta.slice(0, 10).split("-").map(Number);

  if (!anioDesde || !mesDesde || !diaDesde || !anioHasta || !mesHasta || !diaHasta) {
    return 0;
  }

  let meses = (anioHasta - anioDesde) * 12 + (mesHasta - mesDesde);
  if (diaHasta < diaDesde) meses -= 1;

  return Math.max(1, meses);
}

export function agruparPorDia(pagos: PagoListItem[]): ReporteRecaudacionDia[] {
  const mapa = new Map<string, { cantidad: number; total: number }>();

  for (const pago of pagos) {
    const actual = mapa.get(pago.fecha) ?? { cantidad: 0, total: 0 };
    actual.cantidad += 1;
    actual.total += pago.monto;
    mapa.set(pago.fecha, actual);
  }

  return [...mapa.entries()]
    .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
    .map(([fecha, acumulado]) => ({ fecha, ...acumulado }));
}

export interface DeudorConEstado {
  clienteId: number;
  codigo: string;
  nombre: string;
  telefono: string | null;
  direccion: string;
  estado: "activo" | "suspendido" | "baja";
  fechaSuspension: string | null;
  motivoSuspension: string | null;
  facturasPendientes: number;
  deuda: number;
  vencidaDesde: string;
}

/** Clientes con facturas vencidas e impagas, con su estado de servicio. */
export async function obtenerDeudoresConEstado(): Promise<DeudorConEstado[]> {
  const filas = await db
    .select({
      factura: facturas,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        direccion: clientes.direccion,
        estado: clientes.estado,
        fechaSuspension: clientes.fechaSuspension,
        motivoSuspension: clientes.motivoSuspension,
      },
    })
    .from(facturas)
    .innerJoin(clientes, eq(clientes.id, facturas.clienteId))
    .where(
      and(
        inArray(facturas.estado, ["pendiente", "parcial"]),
        lt(facturas.fechaVencimiento, hoyAsuncion()),
      ),
    )
    .orderBy(asc(facturas.fechaVencimiento), asc(clientes.codigo));

  const idsFacturas = filas.map((fila) => fila.factura.id);

  const aplicados =
    idsFacturas.length > 0
      ? await db
          .select({ facturaId: pagos.facturaId, monto: pagos.monto })
          .from(pagos)
          .where(
            and(
              inArray(pagos.facturaId, idsFacturas),
              eq(pagos.anulado, false),
            ),
          )
      : [];

  const pagadoPorFactura = new Map<number, number>();
  for (const pago of aplicados) {
    if (pago.facturaId === null) continue;
    pagadoPorFactura.set(
      pago.facturaId,
      (pagadoPorFactura.get(pago.facturaId) ?? 0) + pago.monto,
    );
  }

  const porCliente = new Map<number, DeudorConEstado>();

  for (const { factura, cliente } of filas) {
    const pagado = pagadoPorFactura.get(factura.id) ?? 0;
    const saldo = Math.max(0, factura.totalAPagar - pagado);
    if (saldo <= 0) continue;

    const actual = porCliente.get(cliente.id) ?? {
      clienteId: cliente.id,
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      estado: cliente.estado,
      fechaSuspension: cliente.fechaSuspension,
      motivoSuspension: cliente.motivoSuspension,
      facturasPendientes: 0,
      deuda: 0,
      vencidaDesde: factura.fechaVencimiento,
    };

    actual.facturasPendientes += 1;
    actual.deuda += saldo;
    if (factura.fechaVencimiento < actual.vencidaDesde) {
      actual.vencidaDesde = factura.fechaVencimiento;
    }

    porCliente.set(cliente.id, actual);
  }

  return [...porCliente.values()].sort(
    (a, b) => b.deuda - a.deuda || a.nombre.localeCompare(b.nombre),
  );
}

/** Clientes con facturas vencidas e impagas, agrupados y ordenados por deuda. */
export async function obtenerReporteMorosos(): Promise<ReporteMorosos> {
  const hoy = hoyAsuncion();
  const deudores = await obtenerDeudoresConEstado();

  const reporteFilas: ReporteMoroso[] = deudores.map((fila) => ({
    clienteId: fila.clienteId,
    codigo: fila.codigo,
    nombre: fila.nombre,
    telefono: fila.telefono,
    direccion: fila.direccion,
    facturasPendientes: fila.facturasPendientes,
    deuda: fila.deuda,
    vencidaDesde: fila.vencidaDesde,
    mesesAtraso: calcularMesesAtraso(fila.vencidaDesde, hoy),
  }));

  return {
    generadoEn: new Date().toISOString(),
    totales: {
      clientes: reporteFilas.length,
      deuda: reporteFilas.reduce((suma, fila) => suma + fila.deuda, 0),
    },
    filas: reporteFilas,
  };
}

/** Consumo por período: todos los clientes no dados de baja y su lectura. */
export async function obtenerReporteConsumo(
  periodoId?: number,
): Promise<ReporteConsumo> {
  const [periodo] = periodoId
    ? await db
        .select()
        .from(periodos)
        .where(eq(periodos.id, periodoId))
        .limit(1)
    : await db
        .select()
        .from(periodos)
        .orderBy(desc(periodos.anio), desc(periodos.mes))
        .limit(1);

  const generadoEn = new Date().toISOString();

  if (!periodo) {
    return {
      periodo: null,
      generadoEn,
      totales: { clientes: 0, cargadas: 0, consumoM3: "0.00" },
      filas: [],
    };
  }

  const filas = await db
    .select({
      clienteId: clientes.id,
      codigo: clientes.codigo,
      nombre: clientes.nombre,
      lecturaAnterior: lecturas.lecturaAnterior,
      lecturaActual: lecturas.lecturaActual,
      consumoM3: lecturas.consumoM3,
    })
    .from(clientes)
    .leftJoin(
      lecturas,
      and(
        eq(lecturas.clienteId, clientes.id),
        eq(lecturas.periodoId, periodo.id),
      ),
    )
    .where(ne(clientes.estado, "baja"))
    .orderBy(asc(clientes.codigo));

  const reporteFilas: ReporteConsumoFila[] = filas.map((fila) => ({
    clienteId: fila.clienteId,
    codigo: fila.codigo,
    nombre: fila.nombre,
    lecturaAnterior: fila.lecturaAnterior,
    lecturaActual: fila.lecturaActual,
    consumoM3: fila.consumoM3,
  }));

  const cargadas = reporteFilas.filter(
    (fila) => fila.lecturaActual !== null,
  ).length;

  const totalCentesimas = reporteFilas.reduce((suma, fila) => {
    if (fila.consumoM3 === null) return suma;
    return suma + Math.round(Number(fila.consumoM3) * 100);
  }, 0);

  return {
    periodo: {
      id: periodo.id,
      anio: periodo.anio,
      mes: periodo.mes,
      estado: periodo.estado,
      fechaVencimiento: periodo.fechaVencimiento,
    },
    generadoEn,
    totales: {
      clientes: reporteFilas.length,
      cargadas,
      consumoM3: (totalCentesimas / 100).toFixed(2),
    },
    filas: reporteFilas,
  };
}

/** Recaudación por rango: reutiliza el cierre de caja y agrega el detalle diario. */
export async function obtenerReporteRecaudacion(
  desde: string,
  hasta: string,
): Promise<ReporteRecaudacion> {
  const cierre = await obtenerCierreCaja(desde, hasta);

  return {
    desde,
    hasta,
    generadoEn: cierre.generadoEn,
    cantidad: cierre.cantidad,
    total: cierre.total,
    anulados: cierre.anulados,
    porMetodo: cierre.porMetodo,
    porDia: agruparPorDia(cierre.pagos),
    pagos: cierre.pagos,
  };
}
