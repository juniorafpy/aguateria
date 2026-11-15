import type {
  FacturaDetalle,
  FacturaGenerada,
  FacturaListItem,
  FacturaPreview,
  FacturaQuery,
  Paginated,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarFacturas(
  params: Partial<FacturaQuery> = {},
): Promise<Paginated<FacturaListItem>> {
  const { data } = await api.get<Paginated<FacturaListItem>>("/facturas", { params });
  return data;
}

export async function obtenerPreviewFacturas(
  periodoId: number,
): Promise<FacturaPreview> {
  const { data } = await api.get<FacturaPreview>("/facturas/preview", {
    params: { periodoId },
  });
  return data;
}

export async function generarFacturas(periodoId: number): Promise<FacturaGenerada> {
  const { data } = await api.post<FacturaGenerada>(`/periodos/${periodoId}/facturar`);
  return data;
}

export async function obtenerFactura(id: number): Promise<FacturaDetalle> {
  const { data } = await api.get<FacturaDetalle>(`/facturas/${id}`);
  return data;
}

export async function obtenerRecibosPeriodo(
  periodoId: number,
): Promise<FacturaDetalle[]> {
  const { data } = await api.get<{ data: FacturaDetalle[] }>("/facturas/recibos", {
    params: { periodoId },
  });
  return data.data;
}

export async function anularFactura(id: number): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>(`/facturas/${id}/anular`);
  return data;
}
