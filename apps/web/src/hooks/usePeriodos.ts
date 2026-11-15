import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Periodo, PeriodoCreateInput } from "@aguateria/shared";
import {
  cerrarPeriodo,
  crearPeriodo,
  listarPeriodos,
  reabrirPeriodo,
} from "@/api/periodos";

export function usePeriodos() {
  return useQuery<Periodo[]>({
    queryKey: ["periodos"],
    queryFn: () => listarPeriodos(),
  });
}

function invalidarPeriodos(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["periodos"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["lecturas"] });
  void queryClient.invalidateQueries({ queryKey: ["auditoria"] });
}

export function useCrearPeriodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PeriodoCreateInput) => crearPeriodo(input),
    onSuccess: () => invalidarPeriodos(queryClient),
  });
}

export function useCerrarPeriodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cerrarPeriodo(id),
    onSuccess: () => invalidarPeriodos(queryClient),
  });
}

export function useReabrirPeriodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reabrirPeriodo(id),
    onSuccess: () => invalidarPeriodos(queryClient),
  });
}
