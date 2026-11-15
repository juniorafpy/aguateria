import {
  hoyAsuncion,
  type EstadoCuentaCliente,
  type EstadoCuentaFactura,
  type EstadoCuentaPago,
} from "@aguateria/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { clientes, facturas, pagos, periodos } from "../db/schema";
import { numeroReciboPago } from "./pagos";

export class EstadoCuentaError extends Error {}

/**
 * Estado de cuenta completo de un cliente: facturas, pagos y saldos.
 * La deuda se calcula por factura (total a pagar − pagos no anulados) y los
 * pagos sin factura se informan aparte como saldo a favor.
 */
export async function obtenerEstadoCuenta(
  clienteId: number,
): Promise<EstadoCuentaCliente> {
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!cliente) throw new EstadoCuentaError("Cliente no encontrado");

  const filasFacturas = await db
    .select({
      factura: facturas,
      anio: periodos.anio,
      mes: periodos.mes,
    })
    .from(facturas)
    .innerJoin(periodos, eq(periodos.id, facturas.periodoId))
    .where(eq(facturas.clienteId, clienteId))
    .orderBy(asc(periodos.anio), asc(periodos.mes), asc(facturas.id));

  const idsFacturas = filasFacturas.map((fila) => fila.factura.id);

  const pagosAplicados =
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
  for (const pago of pagosAplicados) {
    if (pago.facturaId === null) continue;
    pagadoPorFactura.set(
      pago.facturaId,
      (pagadoPorFactura.get(pago.facturaId) ?? 0) + pago.monto,
    );
  }

  const hoy = hoyAsuncion();

  const facturasCliente: EstadoCuentaFactura[] = filasFacturas.map(
    ({ factura, anio, mes }) => {
      const pagado = pagadoPorFactura.get(factura.id) ?? 0;
      const saldo =
        factura.estado === "anulada"
          ? 0
          : Math.max(0, factura.totalAPagar - pagado);

      return {
        id: factura.id,
        numero: factura.numero,
        periodo: { anio, mes },
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        totalAPagar: factura.totalAPagar,
        pagado,
        saldo,
        estado: factura.estado,
        vencida:
          factura.estado !== "anulada" &&
          saldo > 0 &&
          factura.fechaVencimiento < hoy,
      };
    },
  );

  const filasPagos = await db
    .select({
      pago: pagos,
      facturaNumero: facturas.numero,
    })
    .from(pagos)
    .leftJoin(facturas, eq(facturas.id, pagos.facturaId))
    .where(eq(pagos.clienteId, clienteId))
    .orderBy(asc(pagos.fecha), asc(pagos.id));

  const pagosCliente: EstadoCuentaPago[] = filasPagos.map(
    ({ pago, facturaNumero }) => ({
      id: pago.id,
      numeroRecibo: numeroReciboPago(pago.id),
      fecha: pago.fecha,
      monto: pago.monto,
      metodo: pago.metodo,
      referencia: pago.referencia,
      facturaNumero,
      anulado: pago.anulado,
    }),
  );

  const facturado = facturasCliente
    .filter((factura) => factura.estado !== "anulada")
    .reduce((suma, factura) => suma + factura.totalAPagar, 0);

  const pagado = pagosCliente
    .filter((pago) => !pago.anulado)
    .reduce((suma, pago) => suma + pago.monto, 0);

  const deuda = facturasCliente.reduce(
    (suma, factura) => suma + factura.saldo,
    0,
  );

  const saldoAFavor = pagosCliente
    .filter((pago) => !pago.anulado && pago.facturaNumero === null)
    .reduce((suma, pago) => suma + pago.monto, 0);

  return {
    cliente,
    generadoEn: new Date().toISOString(),
    resumen: {
      facturado,
      pagado,
      deuda,
      saldoAFavor,
      saldoNeto: deuda - saldoAFavor,
    },
    facturas: facturasCliente,
    pagos: pagosCliente,
  };
}
