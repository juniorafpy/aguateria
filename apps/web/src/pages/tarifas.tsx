import {
  formatFecha,
  formatGs,
  formatM3,
  hoyAsuncion,
  type SimulacionTarifa,
  type Tarifa,
  type TarifaCreateInput,
} from "@aguateria/shared";
import {
  Calculator,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Tags,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCrearTarifa, useSimularTarifa, useTarifas } from "@/hooks/useTarifas";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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

function rangoTramo(desde: string, hasta: string | null): string {
  return `${formatM3(desde)} – ${hasta ? formatM3(hasta) : "sin límite"}`;
}

function TarjetaTarifa({ tarifa }: { tarifa: Tarifa }) {
  const vigente = tarifa.vigenteHasta === null;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">{tarifa.nombre}</h2>
              {vigente && (
                <Badge variant="success">
                  <CheckCircle2 aria-hidden="true" />
                  Vigente
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Desde {formatFecha(tarifa.vigenteDesde)}
              {tarifa.vigenteHasta
                ? ` hasta ${formatFecha(tarifa.vigenteHasta)}`
                : " · sin fecha de cierre"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Cargo fijo</p>
              <p className="font-semibold tabular-nums">{formatGs(tarifa.cargoFijo)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">M³ incluidos</p>
              <p className="font-semibold tabular-nums">{formatM3(tarifa.m3Incluidos)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tramo de excedente</TableHead>
                <TableHead className="text-right">Precio por m³</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifa.tramos.map((tramo) => (
                <TableRow key={tramo.id}>
                  <TableCell className="tabular-nums">
                    {rangoTramo(tramo.desdeM3, tramo.hastaM3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatGs(tramo.precioM3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CalculadoraTarifas({ tarifas }: { tarifas: Tarifa[] }) {
  const vigente = tarifas.find((tarifa) => tarifa.vigenteHasta === null) ?? tarifas[0];
  const [consumo, setConsumo] = useState("20");
  const [tarifaId, setTarifaId] = useState(vigente ? String(vigente.id) : "");
  const [ultimoCalculo, setUltimoCalculo] = useState<{
    consumo: number;
    data: SimulacionTarifa;
  } | null>(null);
  const simulacion = useSimularTarifa();

  async function calcular(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numero = Number(consumo.replace(",", "."));
    if (consumo.trim() === "" || !Number.isFinite(numero) || numero < 0) {
      toast.error("Ingresá un consumo válido");
      return;
    }

    try {
      const data = await simulacion.mutateAsync({
        consumoM3: numero,
        tarifaId: tarifaId ? Number(tarifaId) : undefined,
      });
      setUltimoCalculo({ consumo: numero, data });
    } catch (error) {
      toast.error(`No se pudo calcular: ${mensajeError(error)}`);
    }
  }

  return (
    <Card className="lg:sticky lg:top-20">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Calculator className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Calculadora</h2>
            <p className="text-xs text-muted-foreground">
              ¿Cuánto se cobra por X m³?
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-3" onSubmit={calcular}>
          <div className="space-y-1.5">
            <Label htmlFor="calc-consumo">Consumo (m³)</Label>
            <Input
              id="calc-consumo"
              inputMode="decimal"
              value={consumo}
              onChange={(event) => setConsumo(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calc-tarifa">Tarifa</Label>
            <Select
              id="calc-tarifa"
              value={tarifaId}
              onChange={(event) => setTarifaId(event.target.value)}
            >
              {tarifas.map((tarifa) => (
                <option key={tarifa.id} value={tarifa.id}>
                  {tarifa.nombre}
                  {tarifa.vigenteHasta === null ? " (vigente)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={simulacion.isPending || tarifas.length === 0}
          >
            {simulacion.isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            Calcular
          </Button>
        </form>

        {ultimoCalculo && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total estimado</p>
                  <p className="text-xs text-muted-foreground">
                    Consumo {formatM3(ultimoCalculo.consumo)} ·{" "}
                    {ultimoCalculo.data.tarifa.nombre}
                  </p>
                </div>
                <p className="text-xl font-bold tabular-nums">
                  {formatGs(ultimoCalculo.data.calculo.total)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Cargo fijo</p>
                  <p className="font-medium tabular-nums">
                    {formatGs(ultimoCalculo.data.calculo.cargoFijo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">M³ incluidos</p>
                  <p className="font-medium tabular-nums">
                    {formatM3(ultimoCalculo.data.calculo.m3Incluidos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Excedente</p>
                  <p className="font-medium tabular-nums">
                    {formatM3(ultimoCalculo.data.calculo.excedenteM3)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto consumo</p>
                  <p className="font-medium tabular-nums">
                    {formatGs(ultimoCalculo.data.calculo.montoConsumo)}
                  </p>
                </div>
              </div>

              {ultimoCalculo.data.calculo.detalle.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tramo</TableHead>
                        <TableHead className="text-right">M³</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ultimoCalculo.data.calculo.detalle.map((tramo, indice) => (
                        <TableRow key={indice}>
                          <TableCell className="text-xs tabular-nums">
                            {rangoTramo(
                              String(tramo.desdeM3),
                              tramo.hastaM3 === null ? null : String(tramo.hastaM3),
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatM3(tramo.m3)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatGs(tramo.precioM3)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">
                            {formatGs(tramo.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El consumo no supera los m³ incluidos en el cargo fijo.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface TramoForm {
  hasta: string;
  precio: string;
}

interface NuevaTarifaForm {
  nombre: string;
  vigenteDesde: string;
  cargoFijo: string;
  m3Incluidos: string;
  tramos: TramoForm[];
}

function formTarifaVacio(): NuevaTarifaForm {
  return {
    nombre: "",
    vigenteDesde: hoyAsuncion(),
    cargoFijo: "",
    m3Incluidos: "0",
    tramos: [{ hasta: "", precio: "" }],
  };
}

function desdeCalculado(tramos: TramoForm[], indice: number): number | null {
  if (indice === 0) return 0;

  const anterior = tramos[indice - 1];
  if (!anterior || anterior.hasta.trim() === "") return null;

  const valor = Number(anterior.hasta.replace(",", "."));
  return Number.isFinite(valor) ? valor : null;
}

function NuevaTarifaDialog({
  tarifas,
  onClose,
}: {
  tarifas: Tarifa[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<NuevaTarifaForm>(formTarifaVacio);
  const crear = useCrearTarifa();
  const vigente = tarifas.find((tarifa) => tarifa.vigenteHasta === null) ?? null;

  function actualizarCampo<K extends keyof NuevaTarifaForm>(
    campo: K,
    valor: NuevaTarifaForm[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function actualizarTramo(indice: number, campo: keyof TramoForm, valor: string) {
    setForm((actual) => ({
      ...actual,
      tramos: actual.tramos.map((tramo, posicion) =>
        posicion === indice ? { ...tramo, [campo]: valor } : tramo,
      ),
    }));
  }

  function agregarTramo() {
    setForm((actual) => {
      const tramos = actual.tramos.map((tramo) => ({ ...tramo }));
      const ultimo = tramos[tramos.length - 1];

      if (ultimo && ultimo.hasta.trim() === "") {
        const desde = desdeCalculado(tramos, tramos.length - 1) ?? 0;
        ultimo.hasta = String(desde + 10);
      }

      tramos.push({ hasta: "", precio: "" });
      return { ...actual, tramos };
    });
  }

  function quitarTramo(indice: number) {
    setForm((actual) => {
      if (actual.tramos.length <= 1) return actual;

      const tramos = actual.tramos
        .filter((_, posicion) => posicion !== indice)
        .map((tramo) => ({ ...tramo }));
      const ultimo = tramos[tramos.length - 1];
      if (ultimo) ultimo.hasta = "";

      return { ...actual, tramos };
    });
  }

  function validar(): string | null {
    if (form.nombre.trim().length < 3) return "Ingresá un nombre para la tarifa";
    if (!form.vigenteDesde) return "Indicá desde cuándo rige la tarifa";

    if (vigente && form.vigenteDesde <= vigente.vigenteDesde) {
      return `La nueva tarifa debe comenzar después del ${formatFecha(vigente.vigenteDesde)}`;
    }

    const cargoFijo = Number(form.cargoFijo);
    if (
      form.cargoFijo.trim() === "" ||
      !Number.isInteger(cargoFijo) ||
      cargoFijo < 0
    ) {
      return "El cargo fijo debe ser un entero en Gs.";
    }

    const incluidos = Number(form.m3Incluidos.replace(",", "."));
    if (
      form.m3Incluidos.trim() === "" ||
      !Number.isFinite(incluidos) ||
      incluidos < 0
    ) {
      return "Los m³ incluidos no son válidos";
    }

    if (form.tramos.length === 0) return "Agregá al menos un tramo";

    for (let indice = 0; indice < form.tramos.length; indice += 1) {
      const tramo = form.tramos[indice];
      if (!tramo) continue;

      const desde = desdeCalculado(form.tramos, indice);
      if (desde === null) {
        return "Completá el hasta de los tramos anteriores";
      }

      const precio = Number(tramo.precio);
      if (tramo.precio.trim() === "" || !Number.isInteger(precio) || precio < 0) {
        return `El precio del tramo ${indice + 1} debe ser un entero en Gs.`;
      }

      const esUltimo = indice === form.tramos.length - 1;

      if (tramo.hasta.trim() === "") {
        if (!esUltimo) return "Solo el último tramo puede quedar sin límite";
      } else {
        const hasta = Number(tramo.hasta.replace(",", "."));
        if (!Number.isFinite(hasta) || hasta <= desde) {
          return `El hasta del tramo ${indice + 1} debe ser mayor que ${desde}`;
        }
      }
    }

    return null;
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errorValidacion = validar();
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    const tramos = form.tramos.map((tramo, indice) => {
      const desde = desdeCalculado(form.tramos, indice) ?? 0;
      const esUltimo = indice === form.tramos.length - 1;
      const hasta =
        tramo.hasta.trim() === ""
          ? null
          : Number(tramo.hasta.replace(",", "."));

      return {
        desdeM3: desde,
        hastaM3: esUltimo && hasta === null ? null : hasta,
        precioM3: Math.round(Number(tramo.precio)),
      };
    });

    const input: TarifaCreateInput = {
      nombre: form.nombre.trim(),
      vigenteDesde: form.vigenteDesde,
      cargoFijo: Math.round(Number(form.cargoFijo)),
      m3Incluidos: Number(form.m3Incluidos.replace(",", ".")),
      tramos,
    };

    try {
      await crear.mutateAsync(input);
      toast.success("Tarifa creada; la anterior quedó cerrada");
      onClose();
    } catch (error) {
      toast.error(`No se pudo crear la tarifa: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva tarifa</DialogTitle>
          <DialogDescription>
            Al guardar, la tarifa vigente se cierra automáticamente el día anterior.
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={guardar}>
          <DialogBody className="space-y-5 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tarifa-nombre">Nombre</Label>
                <Input
                  id="tarifa-nombre"
                  value={form.nombre}
                  maxLength={100}
                  placeholder="Ej. Tarifa 2027"
                  onChange={(event) => actualizarCampo("nombre", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tarifa-vigente-desde">Vigente desde</Label>
                <Input
                  id="tarifa-vigente-desde"
                  type="date"
                  value={form.vigenteDesde}
                  onChange={(event) =>
                    actualizarCampo("vigenteDesde", event.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tarifa-cargo-fijo">Cargo fijo (Gs.)</Label>
                <Input
                  id="tarifa-cargo-fijo"
                  inputMode="numeric"
                  placeholder="Ej. 30000"
                  value={form.cargoFijo}
                  onChange={(event) => actualizarCampo("cargoFijo", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tarifa-m3-incluidos">M³ incluidos</Label>
                <Input
                  id="tarifa-m3-incluidos"
                  inputMode="decimal"
                  placeholder="Ej. 10"
                  value={form.m3Incluidos}
                  onChange={(event) =>
                    actualizarCampo("m3Incluidos", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-bold">Tramos de excedente</Label>
                <Button type="button" variant="outline" size="sm" onClick={agregarTramo}>
                  <Plus aria-hidden="true" />
                  Agregar tramo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El primer tramo empieza en 0 m³. Dejá el “Hasta” vacío en el último
                tramo para que no tenga límite.
              </p>

              <div className="space-y-2">
                {form.tramos.map((tramo, indice) => {
                  const desde = desdeCalculado(form.tramos, indice);
                  const esUltimo = indice === form.tramos.length - 1;

                  return (
                    <div
                      key={indice}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Tramo {indice + 1}
                          {esUltimo ? " (último)" : ""}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar tramo ${indice + 1}`}
                          disabled={form.tramos.length === 1}
                          onClick={() => quitarTramo(indice)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Desde (m³)</Label>
                          <Input
                            value={desde ?? ""}
                            placeholder="—"
                            disabled
                            readOnly
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`tramo-hasta-${indice}`}
                            className="text-xs"
                          >
                            Hasta (m³)
                          </Label>
                          <Input
                            id={`tramo-hasta-${indice}`}
                            inputMode="decimal"
                            placeholder={esUltimo ? "Sin límite" : "Ej. 20"}
                            value={tramo.hasta}
                            onChange={(event) =>
                              actualizarTramo(indice, "hasta", event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`tramo-precio-${indice}`}
                            className="text-xs"
                          >
                            Precio por m³ (Gs.)
                          </Label>
                          <Input
                            id={`tramo-precio-${indice}`}
                            inputMode="numeric"
                            placeholder="Ej. 3000"
                            value={tramo.precio}
                            onChange={(event) =>
                              actualizarTramo(indice, "precio", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              Crear tarifa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TarifasPage() {
  const tarifasQuery = useTarifas();
  const [dialogNueva, setDialogNueva] = useState(false);

  const tarifas = tarifasQuery.data ?? [];
  const vigente = tarifas.find((tarifa) => tarifa.vigenteHasta === null) ?? null;

  return (
    <div>
      <PageHeader
        titulo="Tarifas"
        descripcion="Cargo fijo, metros incluidos y precios por tramo de excedente"
      >
        <Button onClick={() => setDialogNueva(true)} disabled={tarifasQuery.isPending}>
          <Plus aria-hidden="true" />
          Nueva tarifa
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          {tarifasQuery.isPending ? (
            <>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
            </>
          ) : tarifasQuery.isError ? (
            <Card>
              <CardContent className="py-10 text-center">
                <ShieldAlert
                  className="mx-auto size-8 text-destructive"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  No pudimos cargar las tarifas.
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => void tarifasQuery.refetch()}
                >
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : tarifas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tags
                  className="mx-auto size-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium">Todavía no hay tarifas cargadas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creá la primera tarifa para poder facturar.
                </p>
                <Button className="mt-4" onClick={() => setDialogNueva(true)}>
                  <Plus aria-hidden="true" />
                  Nueva tarifa
                </Button>
              </CardContent>
            </Card>
          ) : (
            tarifas.map((tarifa) => (
              <TarjetaTarifa key={tarifa.id} tarifa={tarifa} />
            ))
          )}
        </div>

        <CalculadoraTarifas key={vigente?.id ?? "sin-tarifa"} tarifas={tarifas} />
      </div>

      {dialogNueva && (
        <NuevaTarifaDialog
          tarifas={tarifas}
          onClose={() => setDialogNueva(false)}
        />
      )}
    </div>
  );
}
