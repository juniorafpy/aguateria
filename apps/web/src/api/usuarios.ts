import type {
  UsuarioCreateInput,
  UsuarioEstadoInput,
  UsuarioListItem,
  UsuarioPasswordInput,
  UsuarioUpdateInput,
} from "@aguateria/shared";
import { api } from "@/lib/api";

export async function listarUsuarios(): Promise<UsuarioListItem[]> {
  const { data } = await api.get<{ data: UsuarioListItem[] }>("/usuarios");
  return data.data;
}

export async function crearUsuario(
  input: UsuarioCreateInput,
): Promise<UsuarioListItem> {
  const { data } = await api.post<UsuarioListItem>("/usuarios", input);
  return data;
}

export async function actualizarUsuario(
  id: string,
  input: UsuarioUpdateInput,
): Promise<UsuarioListItem> {
  const { data } = await api.put<UsuarioListItem>(`/usuarios/${id}`, input);
  return data;
}

export async function cambiarPasswordUsuario(
  id: string,
  input: UsuarioPasswordInput,
): Promise<void> {
  await api.put(`/usuarios/${id}/password`, input);
}

export async function cambiarEstadoUsuario(
  id: string,
  input: UsuarioEstadoInput,
): Promise<UsuarioListItem> {
  const { data } = await api.post<UsuarioListItem>(
    `/usuarios/${id}/estado`,
    input,
  );
  return data;
}

export async function revocarSesionesUsuario(id: string): Promise<void> {
  await api.post(`/usuarios/${id}/sesiones/revocar`);
}
