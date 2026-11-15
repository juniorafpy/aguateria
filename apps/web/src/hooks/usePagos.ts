import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CierreCaja,
  PagoListItem,
  PagoQuery,
  Paginated,
  PagoCreateInput,
} from "@aguateria/shared";
import { anularPago, listarPagos, obtenerCierreCaja, registrarPago } from "@/api/pagos";

export function usePagos(params: Partial<PagoQuery> = {}) {
  return useQuery<Paginated<PagoListItem>>({
    queryKey: ["pagos", params],
    queryFn: () => listarPagos(params),
    placeholderData: (anterior) => anterior,
  });
}

export function useCierreCaja(desde: string, hasta: string, habilitado = true) {
  return useQuery<CierreCaja>({
    queryKey: ["cierre-caja", desde, hasta],
    queryFn: () => obtenerCierreCaja(desde, hasta),
    enabled: habilitado && Boolean(desde) && Boolean(hasta) && desde <= hasta,
  });
}

function invalidarPagos(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["pagos"] });
  void queryClient.invalidateQueries({ queryKey: ["facturas"] });
  void queryClient.invalidateQueries({ queryKey: ["factura"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["estado-cuenta"] });
  void queryClient.invalidateQueries({ queryKey: ["cierre-caja"] });
  void queryClient.invalidateQueries({ queryKey: ["auditoria"] });
}

export function useRegistrarPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PagoCreateInput) => registrarPago(input),
    onSuccess: () => invalidarPagos(queryClient),
  });
}

export function useAnularPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      anularPago(id, motivo),
    onSuccess: () => invalidarPagos(queryClient),
  });
}
