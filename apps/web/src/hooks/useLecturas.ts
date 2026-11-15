import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LecturaGuardada,
  LecturaQuery,
  LecturaUpsertInput,
  LecturasPeriodo,
} from "@aguateria/shared";
import { guardarLectura, listarLecturas } from "@/api/lecturas";

export function useLecturas(params: Partial<LecturaQuery> = {}) {
  return useQuery<LecturasPeriodo>({
    queryKey: ["lecturas", params],
    queryFn: () => listarLecturas(params),
    placeholderData: (anterior) => anterior,
  });
}

export function useGuardarLectura() {
  const queryClient = useQueryClient();

  return useMutation<LecturaGuardada, unknown, LecturaUpsertInput>({
    mutationFn: (input) => guardarLectura(input),
    onSuccess: (guardada) => {
      queryClient.setQueriesData<LecturasPeriodo>({ queryKey: ["lecturas"] }, (actual) => {
        if (!actual || actual.periodo?.id !== guardada.periodoId) return actual;

        const filas = actual.filas.map((fila) =>
          fila.clienteId === guardada.clienteId
            ? {
                ...fila,
                lecturaId: guardada.id,
                medidorId: guardada.medidorId,
                lecturaAnterior: guardada.lecturaAnterior,
                lecturaActual: guardada.lecturaActual,
                consumoM3: guardada.consumoM3,
                fechaLectura: guardada.fechaLectura,
                observacion: guardada.observacion,
                montoEstimado: guardada.montoEstimado,
              }
            : fila,
        );

        return { ...actual, filas };
      });

      void queryClient.invalidateQueries({ queryKey: ["lecturas"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
