import type { Periodo, PeriodoCreateInput } from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarPeriodos(): Promise<Periodo[]> {
  const { data } = await api.get<{ data: Periodo[] }>("/periodos");
  return data.data;
}

export async function crearPeriodo(input: PeriodoCreateInput): Promise<Periodo> {
  const { data } = await api.post<Periodo>("/periodos", input);
  return data;
}

export async function cerrarPeriodo(id: number): Promise<Periodo> {
  const { data } = await api.post<Periodo>(`/periodos/${id}/cerrar`);
  return data;
}

export async function reabrirPeriodo(id: number): Promise<Periodo> {
  const { data } = await api.post<Periodo>(`/periodos/${id}/reabrir`);
  return data;
}
