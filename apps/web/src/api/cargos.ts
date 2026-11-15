import type {
  CargoCreateInput,
  CargoExtra,
  CargoExtraListItem,
  CargoQuery,
  Paginated,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarCargos(
  params: Partial<CargoQuery> = {},
): Promise<Paginated<CargoExtraListItem>> {
  const { data } = await api.get<Paginated<CargoExtraListItem>>("/cargos", {
    params,
  });
  return data;
}

export async function crearCargo(input: CargoCreateInput): Promise<CargoExtra> {
  const { data } = await api.post<CargoExtra>("/cargos", input);
  return data;
}

export async function anularCargo(id: number): Promise<CargoExtra> {
  const { data } = await api.post<CargoExtra>(`/cargos/${id}/anular`);
  return data;
}
