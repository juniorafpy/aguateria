import type {
  ReporteConsumo,
  ReporteMorosos,
  ReporteRecaudacion,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function obtenerReporteMorosos(): Promise<ReporteMorosos> {
  const { data } = await api.get<ReporteMorosos>("/reportes/morosos");
  return data;
}

export async function obtenerReporteConsumo(
  periodoId?: number,
): Promise<ReporteConsumo> {
  const { data } = await api.get<ReporteConsumo>("/reportes/consumo", {
    params: { periodoId },
  });
  return data;
}

export async function obtenerReporteRecaudacion(
  desde: string,
  hasta: string,
): Promise<ReporteRecaudacion> {
  const { data } = await api.get<ReporteRecaudacion>("/reportes/recaudacion", {
    params: { desde, hasta },
  });
  return data;
}

/** Descarga un reporte CSV usando la sesión actual y dispara la descarga. */
export async function descargarReporteCsv(
  ruta: string,
  params: Record<string, string | number | undefined>,
  nombreArchivo: string,
): Promise<void> {
  const { data } = await api.get<Blob>(ruta, {
    params: { ...params, formato: "csv" },
    responseType: "blob",
  });

  const url = URL.createObjectURL(data);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
