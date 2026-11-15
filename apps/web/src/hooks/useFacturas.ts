import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  FacturaDetalle,
  FacturaListItem,
  FacturaQuery,
  Paginated,
} from "@aguateria/shared";
import {
  anularFactura,
  generarFacturas,
  listarFacturas,
  obtenerFactura,
  obtenerPreviewFacturas,
  obtenerRecibosPeriodo,
} from "@/api/facturas";

export function useFacturas(params: Partial<FacturaQuery> = {}) {
  return useQuery<Paginated<FacturaListItem>>({
    queryKey: ["facturas", params],
    queryFn: () => listarFacturas(params),
    placeholderData: (anterior) => anterior,
  });
}

export function useFactura(id: number | null) {
  return useQuery<FacturaDetalle>({
    queryKey: ["factura", id],
    queryFn: () => obtenerFactura(id as number),
    enabled: id !== null,
  });
}

export function usePreviewFacturas(periodoId: number | null) {
  return useQuery({
    queryKey: ["facturas-preview", periodoId],
    queryFn: () => obtenerPreviewFacturas(periodoId as number),
    enabled: periodoId !== null,
  });
}

function invalidarFacturacion(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["facturas"] });
  void queryClient.invalidateQueries({ queryKey: ["facturas-preview"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["pagos"] });
  void queryClient.invalidateQueries({ queryKey: ["estado-cuenta"] });
  void queryClient.invalidateQueries({ queryKey: ["cierre-caja"] });
  void queryClient.invalidateQueries({ queryKey: ["auditoria"] });
}

export function useGenerarFacturas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodoId: number) => generarFacturas(periodoId),
    onSuccess: () => invalidarFacturacion(queryClient),
  });
}

export function useRecibosPeriodo() {
  return useMutation({
    mutationFn: (periodoId: number) => obtenerRecibosPeriodo(periodoId),
  });
}

export function useAnularFactura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => anularFactura(id),
    onSuccess: () => invalidarFacturacion(queryClient),
  });
}
