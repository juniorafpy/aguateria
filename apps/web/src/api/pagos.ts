import type {
  CierreCaja,
  Pago,
  PagoCreateInput,
  PagoListItem,
  Paginated,
  PagoQuery,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export interface ResultadoPago {
  pagos: Pago[];
  saldoAFavor: number;
  aplicado: number;
}

export async function listarPagos(
  params: Partial<PagoQuery> = {},
): Promise<Paginated<PagoListItem>> {
  const { data } = await api.get<Paginated<PagoListItem>>("/pagos", { params });
  return data;
}

export async function obtenerCierreCaja(
  desde: string,
  hasta: string,
): Promise<CierreCaja> {
  const { data } = await api.get<CierreCaja>("/pagos/cierre", {
    params: { desde, hasta },
  });
  return data;
}

export async function registrarPago(input: PagoCreateInput): Promise<ResultadoPago> {
  const { data } = await api.post<ResultadoPago>("/pagos", input);
  return data;
}

export async function anularPago(id: number, motivo?: string): Promise<Pago> {
  const { data } = await api.post<Pago>(`/pagos/${id}/anular`, { motivo });
  return data;
}
