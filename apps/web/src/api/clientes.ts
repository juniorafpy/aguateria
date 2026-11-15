import type {
  Cliente,
  ClienteCreateInput,
  ClienteDetalle,
  ClienteListItem,
  ClienteQuery,
  ClienteUpdateInput,
  EstadoCuentaCliente,
  Medidor,
  MedidorCreateInput,
  Paginated,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarClientes(
  params: Partial<ClienteQuery> = {},
): Promise<Paginated<ClienteListItem>> {
  const { data } = await api.get<Paginated<ClienteListItem>>("/clientes", { params });
  return data;
}

export async function obtenerCliente(id: number): Promise<ClienteDetalle> {
  const { data } = await api.get<ClienteDetalle>(`/clientes/${id}`);
  return data;
}

export async function obtenerEstadoCuenta(
  id: number,
): Promise<EstadoCuentaCliente> {
  const { data } = await api.get<EstadoCuentaCliente>(
    `/clientes/${id}/estado-cuenta`,
  );
  return data;
}

export interface ClienteGuardado {
  cliente: Cliente;
  medidor: Medidor | null;
}

export async function crearCliente(input: ClienteCreateInput): Promise<ClienteGuardado> {
  const { data } = await api.post<ClienteGuardado>("/clientes", input);
  return data;
}

export async function actualizarCliente(
  id: number,
  input: ClienteUpdateInput,
): Promise<ClienteGuardado> {
  const { data } = await api.put<ClienteGuardado>(`/clientes/${id}`, input);
  return data;
}

export async function instalarMedidor(
  clienteId: number,
  input: MedidorCreateInput,
): Promise<Medidor> {
  const { data } = await api.post<Medidor>(`/clientes/${clienteId}/medidores`, input);
  return data;
}
