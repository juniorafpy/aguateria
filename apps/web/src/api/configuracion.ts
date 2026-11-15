import type {
  ConfiguracionAguateria,
  ConfiguracionUpdateInput,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function obtenerConfiguracion(): Promise<ConfiguracionAguateria> {
  const { data } = await api.get<ConfiguracionAguateria>("/configuracion");
  return data;
}

export async function actualizarConfiguracion(
  input: ConfiguracionUpdateInput,
): Promise<ConfiguracionAguateria> {
  const { data } = await api.put<ConfiguracionAguateria>("/configuracion", input);
  return data;
}
