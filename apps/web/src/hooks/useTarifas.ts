import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SimulacionTarifa,
  Tarifa,
  TarifaCreateInput,
  TarifaSimularInput,
} from "@aguateria/shared";
import { crearTarifa, listarTarifas, simularTarifa } from "@/api/tarifas";

export function useTarifas() {
  return useQuery<Tarifa[]>({
    queryKey: ["tarifas"],
    queryFn: listarTarifas,
  });
}

export function useCrearTarifa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TarifaCreateInput) => crearTarifa(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tarifas"] });
      void queryClient.invalidateQueries({ queryKey: ["lecturas"] });
      void queryClient.invalidateQueries({ queryKey: ["facturas-preview"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSimularTarifa() {
  return useMutation<SimulacionTarifa, unknown, TarifaSimularInput>({
    mutationFn: (input) => simularTarifa(input),
  });
}
