import {
  fechaFinMes,
  hoyAsuncion,
  type FacturaGenerada,
  type FacturaPreview,
  type FacturaPreviewFila,
  type Periodo,
} from "@aguateria/shared";
import { and, asc, eq, inArray, isNotNull, isNull, lt, ne, notExists, or, sql } from "drizzle-orm";
import { db } from "../db";
import { clientes, facturas, lecturas, pagos, periodos } from "../db/schema";
import { calcularMonto } from "./tarifas";
import {
  aTarifaInput,
  aTarifaResumen,
  obtenerTarifaEnFecha,
  type TarifaConTramos,
} from "./tarifa-vigente";

type PeriodoRow = typeof periodos.$inferSelect;

export class FacturacionError extends Error {}

function aPeriodo(fila: PeriodoRow): Periodo {
  return {
    id: fila.id,
    anio: fila.anio,
    mes: fila.mes,
    estado: fila.estado,
    fechaVencimiento: fila.fechaVencimiento,
  };
}

async function cargarPeriodo(periodoId: number): Promise<PeriodoRow> {
  const [periodo] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, periodoId))
    .limit(1);

  if (!periodo) throw new FacturacionError("Período no encontrado");
  return periodo;
}

async function cargarTarifa(periodo: PeriodoRow): Promise<TarifaConTramos> {
  const tarifa = await obtenerTarifaEnFecha(fechaFinMes(periodo.anio, periodo.mes));

  if (!tarifa) {
    throw new FacturacionError(
      `No hay una tarifa vigente para el período ${String(periodo.mes).padStart(2, "0")}/${periodo.anio}`,
    );
  }

  return tarifa;
}

/**
 * Deuda arrastrada por cliente al momento de emitir la factura.
 * = facturas no anuladas de períodos anteriores − pagos aplicados a esas facturas
 *   − créditos a favor (pagos sin factura). Nunca negativa.
 */
async function saldosAnterioresPorCliente(
  clienteIds: number[],
  anio: number,
  mes: number,
): Promise<Map<number, number>> {
  const saldos = new Map<number, number>();
  if (clienteIds.length === 0) return saldos;

  const facturasPrevias = await db
    .select({
      id: facturas.id,
      clienteId: facturas.clienteId,
      totalAPagar: facturas.totalAPagar,
    })
    .from(facturas)
    .innerJoin(periodos, eq(periodos.id, facturas.periodoId))
    .where(
      and(
        inArray(facturas.clienteId, clienteIds),
        ne(facturas.estado, "anulada"),
        or(
          lt(periodos.anio, anio),
          and(eq(periodos.anio, anio), lt(periodos.mes, mes)),
        ),
      ),
    );

  const totalPorCliente = new Map<number, number>();
  for (const factura of facturasPrevias) {
    totalPorCliente.set(
      factura.clienteId,
      (totalPorCliente.get(factura.clienteId) ?? 0) + factura.totalAPagar,
    );
  }

  const idsFacturas = facturasPrevias.map((factura) => factura.id);
  const facturaACliente = new Map(
    facturasPrevias.map((factura) => [factura.id, factura.clienteId]),
  );

  if (idsFacturas.length > 0) {
    const aplicados = await db
      .select({ facturaId: pagos.facturaId, monto: pagos.monto })
      .from(pagos)
      .where(and(inArray(pagos.facturaId, idsFacturas), eq(pagos.anulado, false)));

    for (const pago of aplicados) {
      if (pago.facturaId === null) continue;
      const clienteId = facturaACliente.get(pago.facturaId);
      if (clienteId === undefined) continue;
      totalPorCliente.set(
        clienteId,
        (totalPorCliente.get(clienteId) ?? 0) - pago.monto,
      );
    }
  }

  const creditos = await db
    .select({ clienteId: pagos.clienteId, monto: pagos.monto })
    .from(pagos)
    .where(
      and(
        inArray(pagos.clienteId, clienteIds),
        isNull(pagos.facturaId),
        eq(pagos.anulado, false),
      ),
    );

  for (const credito of creditos) {
    totalPorCliente.set(
      credito.clienteId,
      (totalPorCliente.get(credito.clienteId) ?? 0) - credito.monto,
    );
  }

  for (const [clienteId, total] of totalPorCliente) {
    saldos.set(clienteId, Math.max(0, total));
  }

  return saldos;
}

async function contarPendientesSinLectura(periodoId: number): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clientes)
    .where(
      and(
        ne(clientes.estado, "baja"),
        notExists(
          db
            .select({ uno: sql`1` })
            .from(lecturas)
            .where(
              and(
                eq(lecturas.periodoId, periodoId),
                eq(lecturas.clienteId, clientes.id),
                isNotNull(lecturas.lecturaActual),
              ),
            ),
        ),
      ),
    );

  return fila?.total ?? 0;
}

async function contarFacturasPeriodo(periodoId: number): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(facturas)
    .where(eq(facturas.periodoId, periodoId));

  return fila?.total ?? 0;
}

/** Vista previa: qué se facturaría para el período (sin escribir en la base). */
export async function previsualizarFacturasPeriodo(
  periodoId: number,
): Promise<FacturaPreview> {
  const periodo = await cargarPeriodo(periodoId);
  const tarifa = await cargarTarifa(periodo);
  const tarifaInput = aTarifaInput(tarifa);

  const lecturasCargadas = await db
    .select({
      lecturaId: lecturas.id,
      clienteId: lecturas.clienteId,
      consumoM3: lecturas.consumoM3,
      codigo: clientes.codigo,
      nombre: clientes.nombre,
      direccion: clientes.direccion,
    })
    .from(lecturas)
    .innerJoin(clientes, eq(lecturas.clienteId, clientes.id))
    .where(
      and(
        eq(lecturas.periodoId, periodoId),
        isNotNull(lecturas.lecturaActual),
        ne(clientes.estado, "baja"),
      ),
    )
    .orderBy(asc(clientes.codigo));

  const yaFacturadas = await db
    .select({ clienteId: facturas.clienteId })
    .from(facturas)
    .where(eq(facturas.periodoId, periodoId));
  const facturadosSet = new Set(yaFacturadas.map((fila) => fila.clienteId));

  const pendientes = lecturasCargadas.filter(
    (lectura) => !facturadosSet.has(lectura.clienteId),
  );

  const saldos = await saldosAnterioresPorCliente(
    pendientes.map((lectura) => lectura.clienteId),
    periodo.anio,
    periodo.mes,
  );

  const filas: FacturaPreviewFila[] = pendientes.map((lectura) => {
    const calculo = calcularMonto(tarifaInput, lectura.consumoM3 ?? "0");
    const saldoAnterior = saldos.get(lectura.clienteId) ?? 0;

    return {
      lecturaId: lectura.lecturaId,
      clienteId: lectura.clienteId,
      codigo: lectura.codigo,
      nombre: lectura.nombre,
      direccion: lectura.direccion,
      consumoM3: lectura.consumoM3 ?? "0.00",
      cargoFijo: calculo.cargoFijo,
      montoConsumo: calculo.montoConsumo,
      otrosCargos: 0,
      saldoAnterior,
      total: calculo.total,
      totalAPagar: calculo.total + saldoAnterior,
    };
  });

  return {
    periodo: aPeriodo(periodo),
    tarifa: aTarifaResumen(tarifa),
    filas,
    pendientesSinLectura: await contarPendientesSinLectura(periodoId),
    totales: {
      facturas: filas.length,
      montoTotal: filas.reduce((suma, fila) => suma + fila.total, 0),
      montoAPagar: filas.reduce((suma, fila) => suma + fila.totalAPagar, 0),
    },
  };
}

/**
 * Genera las facturas del período para todos los clientes con lectura cargada
 * que todavía no tengan factura. Es idempotente por (período, cliente).
 */
export async function generarFacturasPeriodo(
  periodoId: number,
): Promise<FacturaGenerada> {
  const periodo = await cargarPeriodo(periodoId);

  if (periodo.estado === "cerrado") {
    throw new FacturacionError("El período está cerrado; reabrilo antes de facturar");
  }

  const preview = await previsualizarFacturasPeriodo(periodoId);
  const yaFacturadas = await contarFacturasPeriodo(periodoId);
  const fechaEmision = hoyAsuncion();

  if (preview.filas.length === 0) {
    return {
      generadas: 0,
      pendientesSinLectura: preview.pendientesSinLectura,
      yaFacturadas,
      periodo: preview.periodo,
    };
  }

  const generadas = await db.transaction(async (tx) => {
    let insertadas = 0;
    let correlativo = yaFacturadas;

    for (const fila of preview.filas) {
      correlativo += 1;
      const numero = `F-${periodo.anio}${String(periodo.mes).padStart(2, "0")}-${String(correlativo).padStart(4, "0")}`;

      const [insertada] = await tx
        .insert(facturas)
        .values({
          numero,
          periodoId: periodo.id,
          clienteId: fila.clienteId,
          lecturaId: fila.lecturaId,
          consumoM3: fila.consumoM3,
          cargoFijo: fila.cargoFijo,
          montoConsumo: fila.montoConsumo,
          otrosCargos: fila.otrosCargos,
          saldoAnterior: fila.saldoAnterior,
          total: fila.total,
          totalAPagar: fila.totalAPagar,
          estado: "pendiente",
          fechaEmision,
          fechaVencimiento: periodo.fechaVencimiento,
        })
        .onConflictDoNothing({
          target: [facturas.periodoId, facturas.clienteId],
        })
        .returning({ id: facturas.id });

      if (insertada) insertadas += 1;
    }

    return insertadas;
  });

  return {
    generadas,
    pendientesSinLectura: preview.pendientesSinLectura,
    yaFacturadas: yaFacturadas + generadas,
    periodo: preview.periodo,
  };
}
