import type {
  LecturaGuardada,
  LecturaQuery,
  LecturaUpsertInput,
  LecturasPeriodo,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarLecturas(
  params: Partial<LecturaQuery> = {},
): Promise<LecturasPeriodo> {
  const { data } = await api.get<LecturasPeriodo>("/lecturas", { params });
  return data;
}

export async function guardarLectura(
  input: LecturaUpsertInput,
): Promise<LecturaGuardada> {
  const { data } = await api.post<LecturaGuardada>("/lecturas", input);
  return data;
}
