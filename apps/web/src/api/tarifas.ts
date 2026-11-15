import type {
  SimulacionTarifa,
  Tarifa,
  TarifaCreateInput,
  TarifaSimularInput,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarTarifas(): Promise<Tarifa[]> {
  const { data } = await api.get<{ data: Tarifa[] }>("/tarifas");
  return data.data;
}

export async function crearTarifa(input: TarifaCreateInput): Promise<Tarifa> {
  const { data } = await api.post<Tarifa>("/tarifas", input);
  return data;
}

export async function simularTarifa(
  input: TarifaSimularInput,
): Promise<SimulacionTarifa> {
  const { data } = await api.post<SimulacionTarifa>("/tarifas/simular", input);
  return data;
}
