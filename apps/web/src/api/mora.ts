import type {
  Cliente,
  ClienteSuspensionInput,
  ReporteMora,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function obtenerReporteMora(): Promise<ReporteMora> {
  const { data } = await api.get<ReporteMora>("/mora/candidatos");
  return data;
}

export async function suspenderCliente(
  clienteId: number,
  input: ClienteSuspensionInput,
): Promise<Cliente> {
  const { data } = await api.post<Cliente>(
    `/clientes/${clienteId}/suspender`,
    input,
  );
  return data;
}

export async function reconectarCliente(
  clienteId: number,
  input: ClienteSuspensionInput,
): Promise<Cliente> {
  const { data } = await api.post<Cliente>(
    `/clientes/${clienteId}/reconectar`,
    input,
  );
  return data;
}
