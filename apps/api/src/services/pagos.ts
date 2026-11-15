import {
  hoyAsuncion,
  type CierreCaja,
  type CierreCajaMetodo,
  type Pago,
  type PagoCreateInput,
  type PagoListItem,
} from "@aguateria/shared";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { auditoria, clientes, facturas, pagos, periodos } from "../db/schema";
import { distribuirPago } from "./pago-aplicacion";

export class PagoError extends Error {}

type PagoRow = typeof pagos.$inferSelect;

type Tx = Pick<typeof db, "select" | "update" | "insert">;

interface FacturaPendiente {
  id: number;
  clienteId: number;
  totalAPagar: number;
  estado: "pendiente" | "parcial" | "pagada" | "anulada";
}

export function numeroReciboPago(id: number): string {
  return `REC-${String(id).padStart(6, "0")}`;
}

export function aPago(fila: PagoRow): Pago {
  return {
    id: fila.id,
    numeroRecibo: numeroReciboPago(fila.id),
    clienteId: fila.clienteId,
    facturaId: fila.facturaId,
    fecha: fila.fecha,
    monto: fila.monto,
    metodo: fila.metodo,
    referencia: fila.referencia,
    anulado: fila.anulado,
    creadoEn: fila.creadoEn.toISOString(),
  };
}

/** Total pagado (no anulado) por factura. */
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

/** Recalcula el estado (pendiente/parcial/pagada) de una factura según sus pagos. */
async function recalcularEstadoFactura(
  tx: Tx,
  facturaId: number,
): Promise<void> {
  const [factura] = await tx
    .select({
      id: facturas.id,
      totalAPagar: facturas.totalAPagar,
      estado: facturas.estado,
    })
    .from(facturas)
    .where(eq(facturas.id, facturaId))
    .limit(1);

  if (!factura || factura.estado === "anulada") return;

  const [fila] = await tx
    .select({ pagado: sql<number>`coalesce(sum(${pagos.monto}), 0)::int` })
    .from(pagos)
    .where(and(eq(pagos.facturaId, facturaId), eq(pagos.anulado, false)));

  const pagado = fila?.pagado ?? 0;
  const estado =
    pagado >= factura.totalAPagar
      ? "pagada"
      : pagado > 0
        ? "parcial"
        : "pendiente";

  await tx.update(facturas).set({ estado }).where(eq(facturas.id, facturaId));
}

export interface ResultadoPago {
  pagos: Pago[];
  /** Monto que quedó como saldo a favor (sin factura asignada). */
  saldoAFavor: number;
  /** Total efectivamente aplicado a facturas. */
  aplicado: number;
}

/**
 * Registra un pago. Si viene `facturaId`, se aplica a esa factura (el excedente
 * queda como saldo a favor). Si no, se aplica FIFO a las facturas impagas del
 * cliente, de la más antigua a la más nueva.
 */
export async function registrarPago(
  input: PagoCreateInput,
  usuarioId: string,
): Promise<ResultadoPago> {
  if (input.monto <= 0) throw new PagoError("El monto debe ser mayor a 0");

  let clienteId = input.clienteId ?? null;
  let facturaObjetivo: FacturaPendiente | undefined;

  if (input.facturaId !== undefined) {
    const [factura] = await db
      .select({
        id: facturas.id,
        clienteId: facturas.clienteId,
        totalAPagar: facturas.totalAPagar,
        estado: facturas.estado,
      })
      .from(facturas)
      .where(eq(facturas.id, input.facturaId))
      .limit(1);

    if (!factura) throw new PagoError("Factura no encontrada");
    if (factura.estado === "anulada") {
      throw new PagoError("No se puede cobrar una factura anulada");
    }

    facturaObjetivo = factura;
    clienteId = factura.clienteId;
  }

  if (clienteId === null) {
    throw new PagoError("Indicá el cliente o la factura a cobrar");
  }

  const [cliente] = await db
    .select({ id: clientes.id, estado: clientes.estado })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!cliente) throw new PagoError("Cliente no encontrado");

  const fecha = input.fecha ?? hoyAsuncion();
  const referencia = input.referencia ?? null;

  const facturasCandidatas: FacturaPendiente[] = [];

  if (facturaObjetivo) {
    facturasCandidatas.push(facturaObjetivo);
  } else {
    const filas = await db
      .select({
        id: facturas.id,
        clienteId: facturas.clienteId,
        totalAPagar: facturas.totalAPagar,
        estado: facturas.estado,
      })
      .from(facturas)
      .innerJoin(periodos, eq(periodos.id, facturas.periodoId))
      .where(
        and(
          eq(facturas.clienteId, clienteId),
          inArray(facturas.estado, ["pendiente", "parcial"]),
        ),
      )
      .orderBy(
        asc(facturas.fechaVencimiento),
        asc(periodos.anio),
        asc(periodos.mes),
        asc(facturas.id),
      );

    facturasCandidatas.push(...filas);
  }

  const pagados = await pagadoPorFactura(
    facturasCandidatas.map((factura) => factura.id),
  );

  const pendientes = facturasCandidatas.map((factura) => ({
    id: factura.id,
    pendiente: factura.totalAPagar - (pagados.get(factura.id) ?? 0),
  }));

  const { aplicaciones, saldoAFavor } = distribuirPago(input.monto, pendientes);

  const creados = await db.transaction(async (tx) => {
    const insertados: PagoRow[] = [];

    for (const aplicacion of aplicaciones) {
      const [pago] = await tx
        .insert(pagos)
        .values({
          clienteId: clienteId as number,
          facturaId: aplicacion.facturaId,
          fecha,
          monto: aplicacion.monto,
          metodo: input.metodo,
          referencia,
          usuarioId,
        })
        .returning();

      if (pago) insertados.push(pago);
      await recalcularEstadoFactura(tx, aplicacion.facturaId);
    }

    if (saldoAFavor > 0) {
      const [pago] = await tx
        .insert(pagos)
        .values({
          clienteId: clienteId as number,
          facturaId: null,
          fecha,
          monto: saldoAFavor,
          metodo: input.metodo,
          referencia,
          usuarioId,
        })
        .returning();

      if (pago) insertados.push(pago);
    }

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "registrar_pago",
      entidad: "pago",
      detalle: {
        monto: input.monto,
        metodo: input.metodo,
        facturaId: facturaObjetivo?.id ?? null,
        clienteId,
        saldoAFavor,
      },
    });

    return insertados;
  });

  return {
    pagos: creados.map(aPago),
    saldoAFavor,
    aplicado: input.monto - saldoAFavor,
  };
}

/** Anula un pago (solo admin). Recalcula el estado de la factura asociada. */
export async function anularPago(
  pagoId: number,
  usuarioId: string,
  motivo?: string,
): Promise<Pago> {
  return db.transaction(async (tx) => {
    const [pago] = await tx
      .select()
      .from(pagos)
      .where(eq(pagos.id, pagoId))
      .limit(1);

    if (!pago) throw new PagoError("Pago no encontrado");
    if (pago.anulado) throw new PagoError("El pago ya está anulado");

    const [actualizado] = await tx
      .update(pagos)
      .set({ anulado: true })
      .where(eq(pagos.id, pagoId))
      .returning();

    if (!actualizado) throw new PagoError("No se pudo anular el pago");

    if (pago.facturaId !== null) {
      await recalcularEstadoFactura(tx, pago.facturaId);
    }

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "anular_pago",
      entidad: "pago",
      entidadId: String(pago.id),
      detalle: {
        monto: pago.monto,
        facturaId: pago.facturaId,
        clienteId: pago.clienteId,
        motivo: motivo ?? null,
      },
    });

    return aPago(actualizado);
  });
}

/** Anula una factura (solo admin). No borra pagos ni la factura. */
export async function anularFactura(
  facturaId: number,
  usuarioId: string,
  motivo?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [factura] = await tx
      .select()
      .from(facturas)
      .where(eq(facturas.id, facturaId))
      .limit(1);

    if (!factura) throw new PagoError("Factura no encontrada");
    if (factura.estado === "anulada") {
      throw new PagoError("La factura ya está anulada");
    }

    await tx
      .update(facturas)
      .set({ estado: "anulada" })
      .where(eq(facturas.id, facturaId));

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "anular_factura",
      entidad: "factura",
      entidadId: String(factura.id),
      detalle: {
        numero: factura.numero,
        clienteId: factura.clienteId,
        totalAPagar: factura.totalAPagar,
        motivo: motivo ?? null,
      },
    });
  });
}

export interface PagoQueryFiltros {
  clienteId?: number;
  facturaId?: number;
  desde?: string;
  hasta?: string;
  page: number;
  size: number;
}

export interface PagoListado {
  data: PagoListItem[];
  page: number;
  size: number;
  total: number;
}

export async function listarPagos(filtros: PagoQueryFiltros): Promise<PagoListado> {
  const condiciones: SQL[] = [];

  if (filtros.clienteId !== undefined) {
    condiciones.push(eq(pagos.clienteId, filtros.clienteId));
  }
  if (filtros.facturaId !== undefined) {
    condiciones.push(eq(pagos.facturaId, filtros.facturaId));
  }
  if (filtros.desde !== undefined) {
    condiciones.push(gte(pagos.fecha, filtros.desde));
  }
  if (filtros.hasta !== undefined) {
    condiciones.push(lte(pagos.fecha, filtros.hasta));
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(pagos)
    .where(where);

  const filas = await db
    .select({
      pago: pagos,
      cliente: { id: clientes.id, codigo: clientes.codigo, nombre: clientes.nombre },
      facturaId: facturas.id,
      facturaNumero: facturas.numero,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .leftJoin(facturas, eq(pagos.facturaId, facturas.id))
    .where(where)
    .orderBy(desc(pagos.fecha), desc(pagos.id))
    .limit(filtros.size)
    .offset((filtros.page - 1) * filtros.size);

  return {
    data: filas.map((fila) => ({
      ...aPago(fila.pago),
      cliente: fila.cliente,
      factura:
        fila.facturaId === null || fila.facturaNumero === null
          ? null
          : { id: fila.facturaId, numero: fila.facturaNumero },
    })),
    page: filtros.page,
    size: filtros.size,
    total: conteo?.total ?? 0,
  };
}

/**
 * Cierre de caja simple: pagos vigentes de un rango, total recaudado y
 * desglose por método. Los pagos anulados se informan por separado.
 */
export async function obtenerCierreCaja(
  desde: string,
  hasta: string,
): Promise<CierreCaja> {
  const filas = await db
    .select({
      pago: pagos,
      cliente: {
        id: clientes.id,
        codigo: clientes.codigo,
        nombre: clientes.nombre,
      },
      facturaId: facturas.id,
      facturaNumero: facturas.numero,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .leftJoin(facturas, eq(pagos.facturaId, facturas.id))
    .where(and(gte(pagos.fecha, desde), lte(pagos.fecha, hasta)))
    .orderBy(asc(pagos.fecha), asc(pagos.id));

  const vigentes = filas.filter((fila) => !fila.pago.anulado);

  const metodos: Array<"efectivo" | "transferencia" | "otro"> = [
    "efectivo",
    "transferencia",
    "otro",
  ];

  const porMetodo: CierreCajaMetodo[] = metodos.map((metodo) => {
    const delMetodo = vigentes.filter((fila) => fila.pago.metodo === metodo);

    return {
      metodo,
      cantidad: delMetodo.length,
      total: delMetodo.reduce((suma, fila) => suma + fila.pago.monto, 0),
    };
  });

  const pagosCierre: PagoListItem[] = vigentes.map((fila) => ({
    ...aPago(fila.pago),
    cliente: fila.cliente,
    factura:
      fila.facturaId === null || fila.facturaNumero === null
        ? null
        : { id: fila.facturaId, numero: fila.facturaNumero },
  }));

  return {
    desde,
    hasta,
    generadoEn: new Date().toISOString(),
    cantidad: pagosCierre.length,
    total: pagosCierre.reduce((suma, pago) => suma + pago.monto, 0),
    anulados: filas.length - vigentes.length,
    porMetodo,
    pagos: pagosCierre,
  };
}
