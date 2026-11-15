import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CargoCreateInput,
  CargoExtraListItem,
  Paginated,
} from "@aguateria/shared";
import { anularCargo, crearCargo, listarCargos } from "@/api/cargos";

export function useCargos(clienteId: number | null) {
  return useQuery<Paginated<CargoExtraListItem>>({
    queryKey: ["cargos", clienteId],
    queryFn: () => listarCargos({ clienteId: clienteId ?? undefined, size: 100 }),
    enabled: clienteId !== null,
  });
}

function invalidarCargos(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cargos"] });
  void queryClient.invalidateQueries({ queryKey: ["estado-cuenta"] });
  void queryClient.invalidateQueries({ queryKey: ["clientes"] });
}

export function useCrearCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CargoCreateInput) => crearCargo(input),
    onSuccess: () => invalidarCargos(queryClient),
  });
}

export function useAnularCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => anularCargo(id),
    onSuccess: () => invalidarCargos(queryClient),
  });
}
