const gsFormatter = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
});

const m3Formatter = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Formatea guaraníes enteros: 115000 -> "115.000 Gs." */
export function formatGs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || Number.isNaN(monto)) return "—";
  return `${gsFormatter.format(Math.round(monto))} Gs.`;
}

/** Formatea metros cúbicos (string de Postgres o number): "12.5" -> "12,5 m³" */
export function formatM3(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = typeof valor === "string" ? Number(valor.replace(",", ".")) : valor;
  if (Number.isNaN(numero)) return "—";
  return `${m3Formatter.format(numero)} m³`;
}

/** "2026-11-08" -> "08/11/2026" (sin pasar por Date para evitar corrimientos de zona). */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

export function formatPeriodo(anio: number, mes: number): string {
  return `${MESES[mes - 1] ?? mes} ${anio}`;
}

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

/** Fecha de hoy en la zona horaria de Asunción, como "aaaa-mm-dd". */
export function hoyAsuncion(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Primer y último día del mes en curso (zona Asunción). */
export function rangoMesActual(): { desde: string; hasta: string } {
  const hoy = hoyAsuncion();
  const [anio, mes] = hoy.split("-");
  const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate();
  return {
    desde: `${anio}-${mes}-01`,
    hasta: `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

/** Suma (o resta, con días negativos) días a una fecha aaaa-mm-dd. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return resultado.toISOString().slice(0, 10);
}

/** Último día del mes, como aaaa-mm-dd. `mes` es 1-based. */
export function fechaFinMes(anio: number, mes: number): string {
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

/** Año y mes actuales en la zona de Asunción. */
export function periodoActual(): { anio: number; mes: number } {
  const [anio, mes] = hoyAsuncion().split("-").map(Number);
  return {
    anio: anio ?? new Date().getFullYear(),
    mes: mes ?? 1,
  };
}

/**
 * Vencimiento por defecto: el día indicado del mes siguiente al período.
 * Si el día no existe en ese mes, se ajusta al último día.
 */
export function vencimientoPorDefecto(anio: number, mes: number, dia = 10): string {
  const siguiente = new Date(Date.UTC(anio, mes, 1));
  const anioSiguiente = siguiente.getUTCFullYear();
  const mesSiguiente = siguiente.getUTCMonth() + 1;
  const ultimoDia = new Date(Date.UTC(anioSiguiente, mesSiguiente, 0)).getUTCDate();
  const diaSeguro = Math.min(Math.max(1, dia), ultimoDia);
  return `${anioSiguiente}-${String(mesSiguiente).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`;
}

