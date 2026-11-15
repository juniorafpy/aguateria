import type {
  AuditoriaItem,
  AuditoriaQuery,
  Paginated,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarAuditoria(
  params: Partial<AuditoriaQuery> = {},
): Promise<Paginated<AuditoriaItem>> {
  const { data } = await api.get<Paginated<AuditoriaItem>>("/auditoria", {
    params,
  });
  return data;
}
