import type { Context } from "hono";

export type CsvValor = string | number | null | undefined;

function escaparCsv(valor: CsvValor): string {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);
  if (/[",\r\n;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

/** Genera un CSV con BOM UTF-8 para que Excel respete los acentos. */
export function generarCsv(cabeceras: string[], filas: CsvValor[][]): string {
  const lineas = [
    cabeceras.map(escaparCsv).join(","),
    ...filas.map((fila) => fila.map(escaparCsv).join(",")),
  ];

  return `\uFEFF${lineas.join("\r\n")}\r\n`;
}

export function respuestaCsv(c: Context, nombre: string, contenido: string) {
  return c.body(contenido, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${nombre}"`,
  });
}
