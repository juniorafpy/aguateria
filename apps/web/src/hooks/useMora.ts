import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClienteSuspensionInput,
  ReporteMora,
} from "@aguateria/shared";
import {
  obtenerReporteMora,
  reconectarCliente,
  suspenderCliente,
} from "@/api/mora";

export function useReporteMora() {
  return useQuery<ReporteMora>({
    queryKey: ["mora"],
    queryFn: obtenerReporteMora,
  });
}

function useInvalidacionMora() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["mora"] });
    void queryClient.invalidateQueries({ queryKey: ["clientes"] });
    void queryClient.invalidateQueries({ queryKey: ["cliente"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["reporte-morosos"] });
    void queryClient.invalidateQueries({ queryKey: ["estado-cuenta"] });
  };
}

export function useSuspenderCliente() {
  const invalidar = useInvalidacionMora();

  return useMutation({
    mutationFn: ({
      clienteId,
      input,
    }: {
      clienteId: number;
      input: ClienteSuspensionInput;
    }) => suspenderCliente(clienteId, input),
    onSuccess: invalidar,
  });
}

export function useReconectarCliente() {
  const invalidar = useInvalidacionMora();

  return useMutation({
    mutationFn: ({
      clienteId,
      input,
    }: {
      clienteId: number;
      input: ClienteSuspensionInput;
    }) => reconectarCliente(clienteId, input),
    onSuccess: invalidar,
  });
}
