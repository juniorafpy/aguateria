import {
  formatFecha,
  formatPeriodo,
  nombreMes,
  periodoActual,
  vencimientoPorDefecto,
  type Periodo,
} from "@aguateria/shared";
import {
  CalendarDays,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  useCerrarPeriodo,
  useCrearPeriodo,
  usePeriodos,
  useReabrirPeriodo,
} from "@/hooks/usePeriodos";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mensajeError } from "@/lib/api";

const VARIANTE_ESTADO: Record<
  Periodo["estado"],
  "success" | "default" | "secondary"
> = {
  abierto: "success",
  facturado: "default",
  cerrado: "secondary",
};

const ETIQUETA_ESTADO: Record<Periodo["estado"], string> = {
  abierto: "Abierto",
  facturado: "Facturado",
  cerrado: "Cerrado",
};

function siguientePeriodo(periodos: Periodo[]): { anio: number; mes: number } {
  const [ultimo] = periodos;
  if (!ultimo) return periodoActual();

  return ultimo.mes === 12
    ? { anio: ultimo.anio + 1, mes: 1 }
    : { anio: ultimo.anio, mes: ultimo.mes + 1 };
}

function NuevoPeriodoDialog({
  periodos,
  diaVencimiento,
  onClose,
}: {
  periodos: Periodo[];
  diaVencimiento: number;
  onClose: () => void;
}) {
  const inicial = siguientePeriodo(periodos);
  const [form, setForm] = useState({
    anio: String(inicial.anio),
    mes: String(inicial.mes),
    fechaVencimiento: vencimientoPorDefecto(
      inicial.anio,
      inicial.mes,
      diaVencimiento,
    ),
  });
  const crear = useCrearPeriodo();

  function cambiarAnio(valor: string) {
    setForm((actual) => {
      const anio = Number(valor);
      const mes = Number(actual.mes);
      return {
        ...actual,
        anio: valor,
        fechaVencimiento: Number.isFinite(anio)
          ? vencimientoPorDefecto(anio, mes, diaVencimiento)
          : actual.fechaVencimiento,
      };
    });
  }

  function cambiarMes(valor: string) {
    setForm((actual) => {
      const anio = Number(actual.anio);
      const mes = Number(valor);
      return {
        ...actual,
        mes: valor,
        fechaVencimiento: Number.isFinite(anio)
          ? vencimientoPorDefecto(anio, mes, diaVencimiento)
          : actual.fechaVencimiento,
      };
    });
  }

  async function abrir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const anio = Number(form.anio);
    const mes = Number(form.mes);

    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      toast.error("Ingresá un año válido");
      return;
    }

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      toast.error("Seleccioná un mes válido");
      return;
    }

    if (!form.fechaVencimiento) {
      toast.error("Indicá la fecha de vencimiento");
      return;
    }

    try {
      await crear.mutateAsync({
        anio,
        mes,
        fechaVencimiento: form.fechaVencimiento,
      });
      toast.success("Período abierto");
      onClose();
    } catch (error) {
      toast.error(`No se pudo abrir el período: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir período</DialogTitle>
          <DialogDescription>
            Se crearán las lecturas pendientes para los clientes con medidor activo.
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={abrir}>
          <DialogBody className="space-y-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="periodo-anio">Año</Label>
                <Input
                  id="periodo-anio"
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.anio}
                  onChange={(event) => cambiarAnio(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodo-mes">Mes</Label>
                <Select
                  id="periodo-mes"
                  value={form.mes}
                  onChange={(event) => cambiarMes(event.target.value)}
                >
                  {Array.from({ length: 12 }, (_, indice) => indice + 1).map(
                    (mes) => (
                      <option key={mes} value={mes}>
                        {nombreMes(mes)}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodo-vencimiento">Fecha de vencimiento</Label>
              <Input
                id="periodo-vencimiento"
                type="date"
                value={form.fechaVencimiento}
                onChange={(event) =>
                  setForm((actual) => ({
                    ...actual,
                    fechaVencimiento: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Se sugiere el día {diaVencimiento} del mes siguiente según la
                configuración.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Abrir período
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PeriodosPage() {
  const { data: periodos, isPending, isError, refetch } = usePeriodos();
  const { data: config } = useConfiguracion();
  const [dialogNuevo, setDialogNuevo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{
    tipo: "cerrar" | "reabrir";
    periodo: Periodo;
  } | null>(null);

  const cerrar = useCerrarPeriodo();
  const reabrir = useReabrirPeriodo();

  async function confirmar() {
    if (!confirmacion) return;

    try {
      if (confirmacion.tipo === "cerrar") {
        await cerrar.mutateAsync(confirmacion.periodo.id);
        toast.success("Período cerrado");
      } else {
        await reabrir.mutateAsync(confirmacion.periodo.id);
        toast.success("Período reabierto");
      }
      setConfirmacion(null);
    } catch (error) {
      toast.error(mensajeError(error));
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Períodos"
        descripcion="Abrí el mes, controlá su estado y cerralo al terminar la cobranza"
      >
        <Button onClick={() => setDialogNuevo(true)} disabled={isPending}>
          <Plus aria-hidden="true" />
          Abrir período
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-5">
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No pudimos cargar los períodos.
              </p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : periodos && periodos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodos.map((periodo) => (
                    <TableRow key={periodo.id}>
                      <TableCell className="font-medium">
                        {formatPeriodo(periodo.anio, periodo.mes)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={VARIANTE_ESTADO[periodo.estado]}>
                          {ETIQUETA_ESTADO[periodo.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFecha(periodo.fechaVencimiento)}</TableCell>
                      <TableCell className="text-right">
                        {periodo.estado === "cerrado" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setConfirmacion({ tipo: "reabrir", periodo })
                            }
                          >
                            <Unlock aria-hidden="true" />
                            Reabrir
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setConfirmacion({ tipo: "cerrar", periodo })
                            }
                          >
                            <Lock aria-hidden="true" />
                            Cerrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">Todavía no hay períodos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Abrí el primer período para empezar a cargar lecturas.
              </p>
              <Button className="mt-4" onClick={() => setDialogNuevo(true)}>
                <Plus aria-hidden="true" />
                Abrir período
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {dialogNuevo && (
        <NuevoPeriodoDialog
          periodos={periodos ?? []}
          diaVencimiento={config?.diaVencimiento ?? 10}
          onClose={() => setDialogNuevo(false)}
        />
      )}

      <ConfirmDialog
        open={confirmacion !== null}
        onOpenChange={(abierto) => !abierto && setConfirmacion(null)}
        titulo={
          confirmacion?.tipo === "cerrar" ? "Cerrar período" : "Reabrir período"
        }
        descripcion={
          confirmacion
            ? confirmacion.tipo === "cerrar"
              ? `El período ${formatPeriodo(
                  confirmacion.periodo.anio,
                  confirmacion.periodo.mes,
                )} quedará cerrado. No se podrán cargar lecturas ni generar facturas hasta que lo reabras.`
              : `El período ${formatPeriodo(
                  confirmacion.periodo.anio,
                  confirmacion.periodo.mes,
                )} volverá a estar abierto para cargar lecturas y facturar.`
            : ""
        }
        confirmar={
          confirmacion?.tipo === "cerrar" ? "Cerrar período" : "Reabrir período"
        }
        cargando={cerrar.isPending || reabrir.isPending}
        onConfirm={() => void confirmar()}
      />
    </div>
  );
}
