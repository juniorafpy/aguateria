import { useQuery } from "@tanstack/react-query";
import type { AuditoriaItem, AuditoriaQuery, Paginated } from "@aguateria/shared";
import { listarAuditoria } from "@/api/auditoria";

export function useAuditoria(params: Partial<AuditoriaQuery> = {}) {
  return useQuery<Paginated<AuditoriaItem>>({
    queryKey: ["auditoria", params],
    queryFn: () => listarAuditoria(params),
    placeholderData: (anterior) => anterior,
  });
}
