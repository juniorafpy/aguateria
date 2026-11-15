import { useQuery } from "@tanstack/react-query";
import type {
  ReporteConsumo,
  ReporteMorosos,
  ReporteRecaudacion,
} from "@aguateria/shared";
import {
  obtenerReporteConsumo,
  obtenerReporteMorosos,
  obtenerReporteRecaudacion,
} from "@/api/reportes";

export function useReporteMorosos(habilitado = true) {
  return useQuery<ReporteMorosos>({
    queryKey: ["reporte-morosos"],
    queryFn: obtenerReporteMorosos,
    enabled: habilitado,
  });
}

export function useReporteConsumo(
  periodoId: number | null,
  habilitado = true,
) {
  return useQuery<ReporteConsumo>({
    queryKey: ["reporte-consumo", periodoId],
    queryFn: () => obtenerReporteConsumo(periodoId ?? undefined),
    enabled: habilitado,
  });
}

export function useReporteRecaudacion(
  desde: string,
  hasta: string,
  habilitado = true,
) {
  return useQuery<ReporteRecaudacion>({
    queryKey: ["reporte-recaudacion", desde, hasta],
    queryFn: () => obtenerReporteRecaudacion(desde, hasta),
    enabled:
      habilitado && Boolean(desde) && Boolean(hasta) && desde <= hasta,
  });
}
