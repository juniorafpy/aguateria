import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UsuarioCreateInput,
  UsuarioEstadoInput,
  UsuarioListItem,
  UsuarioPasswordInput,
  UsuarioUpdateInput,
} from "@aguateria/shared";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  cambiarPasswordUsuario,
  crearUsuario,
  listarUsuarios,
  revocarSesionesUsuario,
} from "@/api/usuarios";

export function useUsuarios() {
  return useQuery<UsuarioListItem[]>({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
  });
}

function useInvalidarUsuarios() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    void queryClient.invalidateQueries({ queryKey: ["auditoria"] });
  };
}

export function useCrearUsuario() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: (input: UsuarioCreateInput) => crearUsuario(input),
    onSuccess: invalidar,
  });
}

export function useActualizarUsuario() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UsuarioUpdateInput }) =>
      actualizarUsuario(id, input),
    onSuccess: invalidar,
  });
}

export function useCambiarPasswordUsuario() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UsuarioPasswordInput }) =>
      cambiarPasswordUsuario(id, input),
    onSuccess: invalidar,
  });
}

export function useCambiarEstadoUsuario() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UsuarioEstadoInput }) =>
      cambiarEstadoUsuario(id, input),
    onSuccess: invalidar,
  });
}

export function useRevocarSesionesUsuario() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: (id: string) => revocarSesionesUsuario(id),
    onSuccess: invalidar,
  });
}
