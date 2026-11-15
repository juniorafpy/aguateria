import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClienteCreateInput,
  ClienteDetalle,
  ClienteListItem,
  ClienteQuery,
  ClienteUpdateInput,
  EstadoCuentaCliente,
  MedidorCreateInput,
  Paginated,
} from "@aguateria/shared";
import {
  actualizarCliente,
  crearCliente,
  instalarMedidor,
  listarClientes,
  obtenerCliente,
  obtenerEstadoCuenta,
} from "@/api/clientes";

export function useClientes(params: Partial<ClienteQuery> = {}) {
  return useQuery<Paginated<ClienteListItem>>({
    queryKey: ["clientes", params],
    queryFn: () => listarClientes(params),
    placeholderData: (anterior) => anterior,
  });
}

export function useCliente(id: number | null) {
  return useQuery<ClienteDetalle>({
    queryKey: ["cliente", id],
    queryFn: () => obtenerCliente(id as number),
    enabled: id !== null,
  });
}

export function useEstadoCuenta(id: number | null) {
  return useQuery<EstadoCuentaCliente>({
    queryKey: ["estado-cuenta", id],
    queryFn: () => obtenerEstadoCuenta(id as number),
    enabled: id !== null,
  });
}

function invalidarClientes(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["clientes"] });
  void queryClient.invalidateQueries({ queryKey: ["cliente"] });
  void queryClient.invalidateQueries({ queryKey: ["estado-cuenta"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useRegistrarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClienteCreateInput) => crearCliente(input),
    onSuccess: () => invalidarClientes(queryClient),
  });
}

export function useActualizarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ClienteUpdateInput }) =>
      actualizarCliente(id, input),
    onSuccess: () => invalidarClientes(queryClient),
  });
}

export function useInstalarMedidor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clienteId, input }: { clienteId: number; input: MedidorCreateInput }) =>
      instalarMedidor(clienteId, input),
    onSuccess: () => invalidarClientes(queryClient),
  });
}
