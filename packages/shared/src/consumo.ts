/**
 * Regla de advertencia de consumo atípico, compartida por API y web.
 * Según el spec: advertir si el consumo supera 3× el promedio de los
 * últimos meses. No bloquea el guardado: solo pide confirmación.
 */
export function consumoEsAtipico(consumoM3: number, promedioM3: number | null): boolean {
  if (!Number.isFinite(consumoM3) || consumoM3 <= 0) return false;
  if (promedioM3 === null || !Number.isFinite(promedioM3) || promedioM3 <= 0) {
    return consumoM3 > 100;
  }
  return consumoM3 > promedioM3 * 3;
}
