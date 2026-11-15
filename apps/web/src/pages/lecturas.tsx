import {
  consumoEsAtipico,
  formatGs,
  formatM3,
  formatPeriodo,
  hoyAsuncion,
  type LecturaFila,
  type LecturaQuery,
  type LecturaUpsertInput,
} from "@aguateria/shared";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLecturas, useGuardarLectura } from "@/hooks/useLecturas";
import { usePeriodos } from "@/hooks/usePeriodos";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { mensajeError } from "@/lib/api";
import { cn } from "@/lib/utils";

function EstadoLecturaBadge({
  cargada,
  atipico,
}: {
  cargada: boolean;
  atipico: boolean;
}) {
  if (atipico) {
    return (
      <Badge variant="warning">
        <TriangleAlert aria-hidden="true" />
        Atípico
      </Badge>
    );
  }

  if (cargada) {
    return (
      <Badge variant="success">
        <CheckCircle2 aria-hidden="true" />
        Cargada
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Circle aria-hidden="true" />
      Pendiente
    </Badge>
  );
}

/** Consumo calculado en vivo, sin floats de por medio. null si falta un valor. */
function calcularConsumoLocal(anterior: string, actual: string): number | null {
  if (actual.trim() === "") return null;
  const anteriorNumero = Number(anterior.replace(",", "."));
  const actualNumero = Number(actual.replace(",", "."));

  if (!Number.isFinite(anteriorNumero) || !Number.isFinite(actualNumero)) {
    return null;
  }

  return actualNumero - anteriorNumero;
}

export function LecturasPage() {
  const { data: periodos, isPending: periodosPending } = usePeriodos();
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [estado, setEstado] = useState<LecturaQuery["estado"]>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");

  const [borradores, setBorradores] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [confirmacion, setConfirmacion] = useState<{
    fila: LecturaFila;
    input: LecturaUpsertInput;
  } | null>(null);

  const inputsRef = useRef<Map<number, HTMLInputElement | null>>(new Map());

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const periodoPredeterminado = useMemo(() => {
    if (!periodos || periodos.length === 0) return null;
    const abierto = periodos.find((periodo) => periodo.estado === "abierto");
    return (abierto ?? periodos[0])?.id ?? null;
  }, [periodos]);

  const periodoEfectivo = periodoId ?? periodoPredeterminado;

  const filtros = useMemo(
    () => ({
      periodoId: periodoEfectivo ?? undefined,
      q: busquedaDebounced || undefined,
      estado,
    }),
    [periodoEfectivo, busquedaDebounced, estado],
  );

  const lecturasQuery = useLecturas(filtros);
  const guardarMutation = useGuardarLectura();

  const periodo = lecturasQuery.data?.periodo ?? null;
  const filas = lecturasQuery.data?.filas ?? [];
  const resumen = lecturasQuery.data?.resumen;
  const periodoAbierto = periodo?.estado === "abierto";
  const porcentaje =
    resumen && resumen.total > 0 ? (resumen.cargadas / resumen.total) * 100 : 0;

  function valorLectura(fila: LecturaFila): string {
    return borradores[fila.clienteId] ?? fila.lecturaActual ?? "";
  }

  function valorObservacion(fila: LecturaFila): string {
    return observaciones[fila.clienteId] ?? fila.observacion ?? "";
  }

  function enfocarSiguiente(clienteId: number) {
    const indice = filas.findIndex((fila) => fila.clienteId === clienteId);
    if (indice < 0) return;

    const siguiente = filas[indice + 1];
    if (!siguiente) return;

    const input = inputsRef.current.get(siguiente.clienteId);
    if (input) {
      input.focus();
      input.select();
    }
  }

  async function guardar(input: LecturaUpsertInput, fila: LecturaFila) {
    try {
      await guardarMutation.mutateAsync(input);

      setBorradores((actual) => {
        const copia = { ...actual };
        delete copia[fila.clienteId];
        return copia;
      });
      setObservaciones((actual) => {
        const copia = { ...actual };
        delete copia[fila.clienteId];
        return copia;
      });

      toast.success(`Lectura guardada para ${fila.nombre}`);
      enfocarSiguiente(fila.clienteId);
    } catch (error) {
      toast.error(`No se pudo guardar la lectura: ${mensajeError(error)}`);
    } finally {
      setConfirmacion(null);
    }
  }

  function solicitarGuardado(fila: LecturaFila) {
    if (!periodo) {
      toast.error("Seleccioná un período");
      return;
    }

    const valor = valorLectura(fila).trim();
    if (valor === "") {
      toast.error("Ingresá la lectura actual");
      return;
    }

    if (fila.medidorId === null) {
      toast.error("El cliente no tiene un medidor activo");
      return;
    }

    const anterior = Number(fila.lecturaAnterior.replace(",", "."));
    const actual = Number(valor.replace(",", "."));

    if (!Number.isFinite(actual) || actual < 0) {
      toast.error("La lectura actual no es válida");
      return;
    }

    if (Number.isFinite(anterior) && actual < anterior) {
      toast.error(
        `La lectura no puede ser menor que la anterior (${formatM3(fila.lecturaAnterior)})`,
      );
      return;
    }

    const consumo = actual - anterior;
    const promedio =
      fila.promedioConsumo !== null ? Number(fila.promedioConsumo) : null;

    const input: LecturaUpsertInput = {
      periodoId: periodo.id,
      clienteId: fila.clienteId,
      medidorId: fila.medidorId,
      lecturaActual: actual,
      fechaLectura: hoyAsuncion(),
      observacion: valorObservacion(fila).trim() || undefined,
    };

    if (consumoEsAtipico(consumo, promedio)) {
      setConfirmacion({ fila, input });
      return;
    }

    void guardar(input, fila);
  }

  return (
    <div>
      <PageHeader
        titulo="Lecturas"
        descripcion="Cargá la lectura del medidor de cada cliente y controlá el consumo"
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="lecturas-periodo">Período</Label>
            <Select
              id="lecturas-periodo"
              value={periodoEfectivo ?? ""}
              onChange={(event) => setPeriodoId(Number(event.target.value) || null)}
            >
              {periodos?.length ? null : <option value="">Sin períodos</option>}
              {periodos?.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {formatPeriodo(opcion.anio, opcion.mes)}
                  {opcion.estado === "abierto" ? " (abierto)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lecturas-busqueda">Buscar</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="lecturas-busqueda"
                className="pl-9"
                placeholder="Nombre, código o dirección"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lecturas-estado">Ver</Label>
            <Select
              id="lecturas-estado"
              value={estado}
              onChange={(event) =>
                setEstado(event.target.value as LecturaQuery["estado"])
              }
            >
              <option value="todas">Todas</option>
              <option value="pendientes">Pendientes</option>
              <option value="cargadas">Cargadas</option>
            </Select>
          </div>

          <div className="flex flex-col justify-end rounded-lg border border-border px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-muted-foreground">Avance</p>
              <p className="text-sm font-bold tabular-nums">
                {resumen ? `${resumen.cargadas} / ${resumen.total}` : "—"}
              </p>
            </div>
            <Progress
              value={porcentaje}
              label="Avance de lecturas"
              className="mt-1 h-1.5"
            />
          </div>
        </CardContent>
      </Card>

      {periodo && !periodoAbierto && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          El período {formatPeriodo(periodo.anio, periodo.mes)} está {periodo.estado}.
          Las lecturas son de solo lectura.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {lecturasQuery.isPending || periodosPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, indice) => (
                <Skeleton key={indice} className="h-20 w-full" />
              ))}
            </div>
          ) : lecturasQuery.isError ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No pudimos cargar las lecturas.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void lecturasQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : filas.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2
                className="mx-auto size-9 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium">No hay clientes para este filtro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {estado === "pendientes"
                  ? "¡Todas las lecturas del período ya están cargadas!"
                  : "Probá con otro estado o revisá el período seleccionado."}
              </p>
            </div>
          ) : (
            <div>
              {filas.map((fila) => {
                const valor = valorLectura(fila);
                const consumo = calcularConsumoLocal(fila.lecturaAnterior, valor);
                const consumoValido = consumo !== null && consumo >= 0;
                const promedio =
                  fila.promedioConsumo !== null ? Number(fila.promedioConsumo) : null;
                const atipico =
                  consumo !== null &&
                  consumo >= 0 &&
                  consumoEsAtipico(consumo, promedio);
                const cargada = fila.lecturaActual !== null;
                const guardandoEsta =
                  guardarMutation.isPending &&
                  guardarMutation.variables?.clienteId === fila.clienteId;
                const sinCambios =
                  borradores[fila.clienteId] === undefined &&
                  observaciones[fila.clienteId] === undefined;

                return (
                  <div
                    key={fila.clienteId}
                    className={cn(
                      "border-b border-border last:border-0",
                      guardandoEsta && "bg-muted/40",
                    )}
                  >
                    <div className="grid gap-3 px-4 pb-2 pt-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.55fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_auto] md:items-end">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {fila.codigo}
                          </span>
                          <p className="truncate font-semibold">{fila.nombre}</p>
                          <EstadoLecturaBadge cargada={cargada} atipico={atipico} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {fila.direccion}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fila.numeroSerie
                            ? `Medidor ${fila.numeroSerie}`
                            : "Sin medidor activo"}
                          {fila.promedioConsumo
                            ? ` · Promedio ${formatM3(fila.promedioConsumo)}`
                            : ""}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          Anterior
                        </Label>
                        <p className="mt-1 text-sm font-semibold tabular-nums">
                          {formatM3(fila.lecturaAnterior)}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`lectura-${fila.clienteId}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Lectura actual
                        </Label>
                        <Input
                          id={`lectura-${fila.clienteId}`}
                          ref={(nodo) => {
                            inputsRef.current.set(fila.clienteId, nodo);
                          }}
                          type="text"
                          inputMode="decimal"
                          className="h-10 text-right font-semibold tabular-nums"
                          placeholder="0,00"
                          value={valor}
                          disabled={!periodoAbierto || fila.medidorId === null}
                          onChange={(event) =>
                            setBorradores((actual) => ({
                              ...actual,
                              [fila.clienteId]: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          Consumo
                        </Label>
                        <p
                          className={cn(
                            "mt-1 text-sm font-semibold tabular-nums",
                            consumo === null
                              ? "text-muted-foreground"
                              : consumo < 0
                                ? "text-destructive"
                                : "text-foreground",
                          )}
                        >
                          {consumo === null
                            ? "—"
                            : consumo < 0
                              ? "Menor que anterior"
                              : formatM3(consumo)}
                        </p>
                        {fila.montoEstimado !== null && sinCambios && (
                          <p className="text-xs text-muted-foreground">
                            {formatGs(fila.montoEstimado)}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={() => solicitarGuardado(fila)}
                        disabled={
                          !periodoAbierto ||
                          sinCambios ||
                          !consumoValido ||
                          guardandoEsta
                        }
                      >
                        {guardandoEsta ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Save aria-hidden="true" />
                        )}
                        Guardar
                      </Button>
                    </div>

                    <div className="px-4 pb-4">
                      <Input
                        className="h-9 text-xs"
                        placeholder="Observación (opcional): medidor trabado, casa cerrada..."
                        value={valorObservacion(fila)}
                        disabled={!periodoAbierto}
                        onChange={(event) =>
                          setObservaciones((actual) => ({
                            ...actual,
                            [fila.clienteId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmacion !== null}
        onOpenChange={(abierto) => !abierto && setConfirmacion(null)}
        titulo="Consumo atípico"
        descripcion={
          confirmacion
            ? `El consumo calculado es de ${formatM3(
                confirmacion.input.lecturaActual -
                  Number(confirmacion.fila.lecturaAnterior),
              )}${
                confirmacion.fila.promedioConsumo
                  ? `, muy por encima del promedio (${formatM3(
                      confirmacion.fila.promedioConsumo,
                    )})`
                  : ", mucho mayor al habitual"
              }. ¿Confirmás que la lectura es correcta?`
            : ""
        }
        confirmar="Sí, guardar"
        cargando={guardarMutation.isPending}
        onConfirm={() => {
          if (confirmacion) {
            void guardar(confirmacion.input, confirmacion.fila);
          }
        }}
      />
    </div>
  );
}
