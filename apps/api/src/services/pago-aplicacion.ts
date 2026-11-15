export interface FacturaAplicable {
  id: number;
  /** Saldo pendiente de la factura (totalAPagar − pagos no anulados). */
  pendiente: number;
}

export interface AplicacionPago {
  facturaId: number;
  monto: number;
}

/**
 * Reparte un monto entre facturas pendientes, en el orden recibido (FIFO).
 * El sobrante queda como saldo a favor.
 *
 * Regla de negocio pura: sin acceso a base de datos ni a configuración.
 */
export function distribuirPago(
  monto: number,
  facturasPendientes: FacturaAplicable[],
): { aplicaciones: AplicacionPago[]; saldoAFavor: number } {
  if (!Number.isInteger(monto) || monto <= 0) {
    throw new RangeError("El monto debe ser un entero mayor a 0");
  }

  let restante = monto;
  const aplicaciones: AplicacionPago[] = [];

  for (const factura of facturasPendientes) {
    if (restante <= 0) break;
    if (factura.pendiente <= 0) continue;

    const aplicado = Math.min(restante, factura.pendiente);
    aplicaciones.push({ facturaId: factura.id, monto: aplicado });
    restante -= aplicado;
  }

  return { aplicaciones, saldoAFavor: restante };
}
