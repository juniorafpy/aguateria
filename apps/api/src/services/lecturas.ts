import { centesimasAM3, m3ACentesimas } from "./tarifas";

export interface ConsumoCalculado {
  lecturaAnterior: string;
  lecturaActual: string;
  consumoM3: string;
  consumoCent: number;
}

/** Normaliza un valor de m³ a string con dos decimales, sin floats. */
export function normalizarM3(valor: string | number): string {
  return centesimasAM3(m3ACentesimas(valor)).toFixed(2);
}

/**
 * Calcula el consumo de una lectura validando que no retroceda el medidor.
 * Devuelve los valores normalizados a dos decimales.
 */
export function calcularConsumo(
  lecturaAnterior: string | number,
  lecturaActual: string | number,
): ConsumoCalculado {
  const anteriorCent = m3ACentesimas(lecturaAnterior);
  const actualCent = m3ACentesimas(lecturaActual);

  if (actualCent < anteriorCent) {
    throw new Error(
      `La lectura actual (${centesimasAM3(actualCent)} m³) no puede ser menor que la anterior (${centesimasAM3(anteriorCent)} m³).`,
    );
  }

  return {
    lecturaAnterior: centesimasAM3(anteriorCent).toFixed(2),
    lecturaActual: centesimasAM3(actualCent).toFixed(2),
    consumoM3: centesimasAM3(actualCent - anteriorCent).toFixed(2),
    consumoCent: actualCent - anteriorCent,
  };
}

/**
 * Promedio de los últimos consumos (el primero de la lista es el más reciente).
 * Devuelve null si no hay historial.
 */
export function calcularPromedioConsumo(
  consumos: Array<string | number>,
  limite = 6,
): number | null {
  const valores = consumos
    .slice(0, limite)
    .map((consumo) => m3ACentesimas(consumo) / 100)
    .filter((consumo) => Number.isFinite(consumo));

  if (valores.length === 0) return null;
  return valores.reduce((suma, consumo) => suma + consumo, 0) / valores.length;
}
