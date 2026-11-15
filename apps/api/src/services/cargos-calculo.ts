export interface CargoCalculable {
  monto: number;
}

export interface OtrosCargosCalculados {
  cargosExtra: number;
  cargoMora: number;
  otrosCargos: number;
}

/** Suma los cargos extra que se van a incluir en una factura. */
export function sumarCargos(cargos: CargoCalculable[]): number {
  return cargos.reduce((suma, cargo) => suma + cargo.monto, 0);
}

/**
 * Calcula el bloque "otros cargos" de una factura.
 * El recargo por mora solo se aplica si la configuración es mayor a 0
 * y el cliente tiene deuda vencida al momento de facturar.
 */
export function calcularOtrosCargos(
  cargos: CargoCalculable[],
  recargoMora: number,
  aplicaMora: boolean,
): OtrosCargosCalculados {
  const cargosExtra = sumarCargos(cargos);
  const cargoMora = aplicaMora && recargoMora > 0 ? recargoMora : 0;

  return {
    cargosExtra,
    cargoMora,
    otrosCargos: cargosExtra + cargoMora,
  };
}
