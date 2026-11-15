import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConfiguracionAguateria,
  ConfiguracionUpdateInput,
} from "@aguateria/shared";
import {
  actualizarConfiguracion,
  obtenerConfiguracion,
} from "@/api/configuracion";

export function useConfiguracion() {
  return useQuery<ConfiguracionAguateria>({
    queryKey: ["configuracion"],
    queryFn: obtenerConfiguracion,
  });
}

export function useGuardarConfiguracion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfiguracionUpdateInput) =>
      actualizarConfiguracion(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracion"] });
      void queryClient.invalidateQueries({ queryKey: ["auditoria"] });
    },
  });
}
