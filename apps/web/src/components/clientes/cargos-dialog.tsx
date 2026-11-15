import {
  formatFecha,
  formatGs,
  hoyAsuncion,
  type CargoExtraListItem,
} from "@aguateria/shared";
import {
  Ban,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  ShieldAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnularCargo, useCargos, useCrearCargo } from "@/hooks/useCargos";
import { mensajeError } from "@/lib/api";

interface FormCargo {
  concepto: string;
  monto: string;
  fecha: string;
}

function EstadoCargoBadge({ cargo }: { cargo: CargoExtraListItem }) {
  if (cargo.anulado) return <Badge variant="secondary">Anulado</Badge>;
  if (cargo.facturado) {
    return (
      <Badge variant="success">
        Facturado{cargo.factura ? ` · ${cargo.factura.numero}` : ""}
      </Badge>
    );
  }
  return <Badge variant="warning">Pendiente</Badge>;
}

export function CargosDialog({
  cliente,
  onClose,
}: {
  cliente: { id: number; codigo: string; nombre: string };
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormCargo>(() => ({
    concepto: "",
    monto: "",
    fecha: hoyAsuncion(),
  }));
  const [cargoAnular, setCargoAnular] = useState<CargoExtraListItem | null>(null);

  const cargosQuery = useCargos(cliente.id);
  const crear = useCrearCargo();
  const anular = useAnularCargo();

  function actualizarCampo<K extends keyof FormCargo>(
    campo: K,
    valor: FormCargo[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const concepto = form.concepto.trim();
    const monto = Number(form.monto);

    if (concepto.length < 3) {
      toast.error("Describí el motivo del cargo");
      return;
    }
    if (!Number.isInteger(monto) || monto <= 0) {
      toast.error("El monto debe ser un entero mayor a 0");
      return;
    }
    if (!form.fecha) {
      toast.error("Indicá la fecha del cargo");
      return;
    }

    try {
      await crear.mutateAsync({
        clienteId: cliente.id,
        concepto,
        monto,
        fecha: form.fecha,
      });
      toast.success("Cargo agregado. Se incluirá en la próxima factura.");
      setForm({ concepto: "", monto: "", fecha: hoyAsuncion() });
    } catch (error) {
      toast.error(`No se pudo agregar el cargo: ${mensajeError(error)}`);
    }
  }

  async function confirmarAnulacion() {
    if (!cargoAnular) return;

    try {
      await anular.mutateAsync(cargoAnular.id);
      toast.success("Cargo anulado");
      setCargoAnular(null);
    } catch (error) {
      toast.error(`No se pudo anular el cargo: ${mensajeError(error)}`);
    }
  }

  const cargos = cargosQuery.data?.data ?? [];
  const pendientes = cargos.filter(
    (cargo) => !cargo.facturado && !cargo.anulado,
  );
  const totalPendiente = pendientes.reduce((suma, cargo) => suma + cargo.monto, 0);

  return (
    <>
      <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cargos extra</DialogTitle>
            <DialogDescription>
              {cliente.codigo} — {cliente.nombre}. Multas, reconexiones, mano de obra
              y otros conceptos que se suman a la próxima factura.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5 pb-4">
            <form
              className="rounded-lg border border-border p-4"
              onSubmit={guardar}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cargo-concepto">Concepto</Label>
                  <Input
                    id="cargo-concepto"
                    value={form.concepto}
                    maxLength={150}
                    placeholder="Ej. Reconexión de servicio"
                    onChange={(event) =>
                      actualizarCampo("concepto", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo-monto">Monto (Gs.)</Label>
                  <Input
                    id="cargo-monto"
                    inputMode="numeric"
                    value={form.monto}
                    placeholder="0"
                    onChange={(event) =>
                      actualizarCampo("monto", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo-fecha">Fecha</Label>
                  <Input
                    id="cargo-fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(event) =>
                      actualizarCampo("fecha", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="submit" size="sm" disabled={crear.isPending}>
                  {crear.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  Agregar cargo
                </Button>
              </div>
            </form>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">Cargos del cliente</h3>
                  <p className="text-xs text-muted-foreground">
                    {pendientes.length} pendiente(s) por {formatGs(totalPendiente)}
                  </p>
                </div>
              </div>

              {cargosQuery.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, indice) => (
                    <Skeleton key={indice} className="h-10 w-full" />
                  ))}
                </div>
              ) : cargosQuery.isError ? (
                <div className="py-8 text-center">
                  <ShieldAlert
                    className="mx-auto size-8 text-destructive"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No pudimos cargar los cargos.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    size="sm"
                    onClick={() => void cargosQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : cargos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center">
                  <ReceiptText
                    className="mx-auto size-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Este cliente todavía no tiene cargos extra.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cargos.map((cargo) => (
                        <TableRow key={cargo.id}>
                          <TableCell className="max-w-52 truncate">
                            {cargo.concepto}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatFecha(cargo.fecha)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatGs(cargo.monto)}
                          </TableCell>
                          <TableCell>
                            <EstadoCargoBadge cargo={cargo} />
                          </TableCell>
                          <TableCell className="text-right">
                            {!cargo.facturado && !cargo.anulado && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCargoAnular(cargo)}
                              >
                                <Ban aria-hidden="true" />
                                Anular
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <CircleDollarSign className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Los cargos pendientes se suman automáticamente al generar las facturas
              del período. Una vez facturados no se pueden anular desde acá.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cargoAnular !== null}
        onOpenChange={(abierto) => !abierto && setCargoAnular(null)}
        titulo="Anular cargo"
        descripcion={
          cargoAnular
            ? `Se anulará "${cargoAnular.concepto}" por ${formatGs(cargoAnular.monto)}. No se incluirá en la próxima factura.`
            : ""
        }
        confirmar="Anular cargo"
        cargando={anular.isPending}
        onConfirm={() => void confirmarAnulacion()}
      />
    </>
  );
}
