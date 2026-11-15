import {
  formatFecha,
  formatGs,
  formatM3,
  formatPeriodo,
  hoyAsuncion,
  type FacturaListItem,
  type PagoListItem,
} from "@aguateria/shared";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  FileText,
  History,
  Loader2,
  Printer,
  ReceiptText,
  Search,
  ShieldAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFactura, useFacturas, useGenerarFacturas, usePreviewFacturas, useAnularFactura, useRecibosPeriodo } from "@/hooks/useFacturas";
import { useAnularPago, usePagos, useRegistrarPago } from "@/hooks/usePagos";
import { usePeriodos } from "@/hooks/usePeriodos";
import { CierreCajaDialog } from "@/components/cobranzas/cierre-caja-dialog";
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
import { authClient } from "@/lib/auth-client";
import { mensajeError } from "@/lib/api";
import {
  abrirVentanaImpresion,
  escribirRecibos,
  formatearMetodo,
  imprimirRecibo,
} from "@/lib/recibos";

const ESTADOS_FACTURA = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "parcial", etiqueta: "Parcial" },
  { valor: "pagada", etiqueta: "Pagada" },
  { valor: "anulada", etiqueta: "Anulada" },
] as const;

const VARIANTE_ESTADO: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  pendiente: "warning",
  parcial: "default",
  pagada: "success",
  anulada: "secondary",
};

const ICONO_ESTADO: Record<string, LucideIcon> = {
  pendiente: Clock,
  parcial: CircleAlert,
  pagada: CheckCircle2,
  anulada: XCircle,
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  anulada: "Anulada",
};

const METODOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

function hoyInput(): string {
  return hoyAsuncion();
}

function EstadoFacturaBadge({ estado }: { estado: string }) {
  const Icono = ICONO_ESTADO[estado] ?? Clock;
  return (
    <Badge variant={VARIANTE_ESTADO[estado] ?? "secondary"}>
      <Icono aria-hidden="true" />
      {ETIQUETA_ESTADO[estado] ?? estado}
    </Badge>
  );
}

export function CobranzasPage() {
  const { data: sesion } = authClient.useSession();
  const esAdmin = sesion?.user.role === "admin";

  const { data: periodos, isPending: periodosPending } = usePeriodos();
  const [periodoId, setPeriodoId] = useState<number | null>(null);

  const [vista, setVista] = useState<"facturas" | "pagos">("facturas");
  const [estado, setEstado] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pagePagos, setPagePagos] = useState(1);

  const [dialogGenerar, setDialogGenerar] = useState(false);
  const [dialogCierre, setDialogCierre] = useState(false);
  const [dialogPago, setDialogPago] = useState<FacturaListItem | null>(null);
  const [dialogDetalle, setDialogDetalle] = useState<number | null>(null);
  const [facturaAAnular, setFacturaAAnular] = useState<number | null>(null);
  const [pagoAAnular, setPagoAAnular] = useState<PagoListItem | null>(null);

  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState<"efectivo" | "transferencia" | "otro">("efectivo");
  const [pagoFecha, setPagoFecha] = useState(hoyInput());
  const [pagoReferencia, setPagoReferencia] = useState("");

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const periodoPredeterminado = useMemo(() => {
    if (!periodos || periodos.length === 0) return null;
    const abierto = periodos.find((periodo) => periodo.estado === "abierto");
    return (abierto ?? periodos[0])?.id ?? null;
  }, [periodos]);

  const periodoEfectivo = periodoId ?? periodoPredeterminado;

  const filtrosFacturas = useMemo(
    () => ({
      periodoId: periodoEfectivo ?? undefined,
      estado: (estado || undefined) as
        | "pendiente"
        | "parcial"
        | "pagada"
        | "anulada"
        | undefined,
      q: busquedaDebounced || undefined,
      page,
      size: 20,
    }),
    [periodoEfectivo, estado, busquedaDebounced, page],
  );

  const facturasQuery = useFacturas(filtrosFacturas);
  const pagosQuery = usePagos({ page: pagePagos, size: 20 });
  const previewQuery = usePreviewFacturas(dialogGenerar ? periodoEfectivo : null);
  const detalleQuery = useFactura(dialogDetalle);

  const generarMutation = useGenerarFacturas();
  const registrarPagoMutation = useRegistrarPago();
  const anularFacturaMutation = useAnularFactura();
  const anularPagoMutation = useAnularPago();
  const recibosMutation = useRecibosPeriodo();

  const periodoActual =
    periodos?.find((periodo) => periodo.id === periodoEfectivo) ?? null;
  const totalPaginas = facturasQuery.data
    ? Math.max(1, Math.ceil(facturasQuery.data.total / facturasQuery.data.size))
    : 1;
  const totalPaginasPagos = pagosQuery.data
    ? Math.max(1, Math.ceil(pagosQuery.data.total / pagosQuery.data.size))
    : 1;

  function abrirPago(factura: FacturaListItem) {
    setDialogPago(factura);
    setPagoMonto(String(factura.saldo));
    setPagoMetodo("efectivo");
    setPagoFecha(hoyInput());
    setPagoReferencia("");
  }

  async function confirmarPago() {
    if (!dialogPago) return;
    const monto = Number(pagoMonto);

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    try {
      const resultado = await registrarPagoMutation.mutateAsync({
        facturaId: dialogPago.id,
        clienteId: dialogPago.clienteId,
        monto: Math.round(monto),
        metodo: pagoMetodo,
        fecha: pagoFecha,
        referencia: pagoReferencia.trim() || undefined,
      });

      const recibo = resultado.pagos[0]?.numeroRecibo;
      toast.success(
        resultado.saldoAFavor > 0
          ? `Pago registrado. Quedó un saldo a favor de ${formatGs(resultado.saldoAFavor)}.`
          : `Pago registrado${recibo ? ` — recibo ${recibo}` : ""}.`,
      );
      setDialogPago(null);
    } catch (error) {
      toast.error(`No se pudo registrar el pago: ${mensajeError(error)}`);
    }
  }

  async function confirmarGeneracion() {
    if (periodoEfectivo === null) return;

    try {
      const resultado = await generarMutation.mutateAsync(periodoEfectivo);
      toast.success(
        resultado.generadas > 0
          ? `Se generaron ${resultado.generadas} facturas.`
          : "No había facturas nuevas para generar.",
      );
      if (resultado.pendientesSinLectura > 0) {
        toast.warning(
          `${resultado.pendientesSinLectura} clientes siguen sin lectura cargada.`,
        );
      }
      setDialogGenerar(false);
    } catch (error) {
      toast.error(`No se pudieron generar las facturas: ${mensajeError(error)}`);
    }
  }

  async function imprimirRecibosDelPeriodo() {
    if (periodoEfectivo === null) return;

    const ventana = abrirVentanaImpresion();
    if (!ventana) {
      toast.error("Habilitá las ventanas emergentes para imprimir");
      return;
    }

    try {
      const recibos = await recibosMutation.mutateAsync(periodoEfectivo);

      if (recibos.length === 0) {
        ventana.close();
        toast.warning("No hay recibos para imprimir en este período.");
        return;
      }

      const etiqueta = periodoActual
        ? formatPeriodo(periodoActual.anio, periodoActual.mes)
        : "Período";
      escribirRecibos(ventana, recibos, `Recibos ${etiqueta}`);
    } catch (error) {
      ventana.close();
      toast.error(`No se pudieron cargar los recibos: ${mensajeError(error)}`);
    }
  }

  async function confirmarAnulacionFactura() {
    if (facturaAAnular === null) return;    try {
      await anularFacturaMutation.mutateAsync(facturaAAnular);
      toast.success("Factura anulada");
      setFacturaAAnular(null);
    } catch (error) {
      toast.error(`No se pudo anular la factura: ${mensajeError(error)}`);
    }
  }

  async function confirmarAnulacionPago() {
    if (!pagoAAnular) return;
    try {
      await anularPagoMutation.mutateAsync({ id: pagoAAnular.id });
      toast.success("Pago anulado");
      setPagoAAnular(null);
    } catch (error) {
      toast.error(`No se pudo anular el pago: ${mensajeError(error)}`);
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Cobranzas"
        descripcion="Generá las facturas del período, registrá pagos y controlá la deuda"
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogCierre(true)}>
            <Banknote aria-hidden="true" />
            Cierre de caja
          </Button>
          <Button
            variant="outline"
            onClick={() => void imprimirRecibosDelPeriodo()}
            disabled={
              periodoEfectivo === null ||
              periodosPending ||
              recibosMutation.isPending
            }
          >
            {recibosMutation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Printer aria-hidden="true" />
            )}
            Imprimir recibos
          </Button>
          {esAdmin && (
            <Button
              variant="outline"
              onClick={() => setDialogGenerar(true)}
              disabled={periodoEfectivo === null || periodosPending}
            >
              <ReceiptText aria-hidden="true" />
              Generar facturas
            </Button>
          )}
        </div>
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodo">Período</Label>
              <Select
                id="periodo"
                value={periodoEfectivo ?? ""}
                onChange={(event) => {
                  setPeriodoId(Number(event.target.value) || null);
                  setPage(1);
                }}
              >
                {periodos?.length ? null : <option value="">Sin períodos</option>}
                {periodos?.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {formatPeriodo(periodo.anio, periodo.mes)}
                    {periodo.estado === "abierto" ? " (abierto)" : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="busqueda">Buscar</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="busqueda"
                  className="pl-9"
                  placeholder="Cliente, código o Nº de factura"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado</Label>
              <Select
                id="estado"
                value={estado}
                onChange={(event) => {
                  setEstado(event.target.value);
                  setPage(1);
                }}
              >
                {ESTADOS_FACTURA.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button
          variant={vista === "facturas" ? "default" : "outline"}
          size="sm"
          onClick={() => setVista("facturas")}
        >
          <FileText aria-hidden="true" />
          Facturas
        </Button>
        <Button
          variant={vista === "pagos" ? "default" : "outline"}
          size="sm"
          onClick={() => setVista("pagos")}
        >
          <History aria-hidden="true" />
          Pagos recientes
        </Button>
      </div>

      {vista === "facturas" ? (
        <Card>
          <CardContent className="pt-5">
            {facturasQuery.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, indice) => (
                  <Skeleton key={indice} className="h-12 w-full" />
                ))}
              </div>
            ) : facturasQuery.isError ? (
              <div className="py-10 text-center">
                <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No pudimos cargar las facturas.
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => void facturasQuery.refetch()}
                >
                  Reintentar
                </Button>
              </div>
            ) : facturasQuery.data && facturasQuery.data.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Consumo</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasQuery.data.data.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell className="font-mono text-xs">{factura.numero}</TableCell>
                          <TableCell>
                            <p className="font-medium">{factura.cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {factura.cliente.codigo}
                            </p>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatM3(factura.consumoM3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatGs(factura.totalAPagar)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatGs(factura.saldo)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums">
                                {formatFecha(factura.fechaVencimiento)}
                              </span>
                              {factura.vencida && (
                                <Badge variant="destructive">Vencida</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <EstadoFacturaBadge estado={factura.estado} />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {factura.estado !== "anulada" && factura.saldo > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirPago(factura)}
                                >
                                  <Wallet aria-hidden="true" />
                                  Cobrar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Ver factura ${factura.numero}`}
                                onClick={() => setDialogDetalle(factura.id)}
                              >
                                <Printer aria-hidden="true" />
                              </Button>
                              {esAdmin && factura.estado !== "anulada" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Anular factura ${factura.numero}`}
                                  onClick={() => setFacturaAAnular(factura.id)}
                                >
                                  <XCircle aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    {facturasQuery.data.total} factura(s)
                    {periodoActual
                      ? ` — ${formatPeriodo(periodoActual.anio, periodoActual.mes)}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((actual) => Math.max(1, actual - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft aria-hidden="true" />
                      Anterior
                    </Button>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {page} / {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((actual) => Math.min(totalPaginas, actual + 1))
                      }
                      disabled={page >= totalPaginas}
                    >
                      Siguiente
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <ReceiptText
                  className="mx-auto size-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium">No hay facturas para este filtro</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generá las facturas del período o probá con otro estado.
                </p>
                {esAdmin ? (
                  <Button className="mt-4" onClick={() => setDialogGenerar(true)}>
                    <ReceiptText aria-hidden="true" />
                    Generar facturas
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    El administrador debe generar las facturas del período.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-5">
            {pagosQuery.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, indice) => (
                  <Skeleton key={indice} className="h-12 w-full" />
                ))}
              </div>
            ) : pagosQuery.data && pagosQuery.data.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recibo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagosQuery.data.data.map((fila) => (
                        <TableRow key={fila.id}>
                          <TableCell className="font-mono text-xs">
                            {fila.numeroRecibo}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatFecha(fila.fecha)}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{fila.cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {fila.cliente.codigo}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {fila.factura?.numero ?? "Saldo a favor"}
                          </TableCell>
                          <TableCell>{formatearMetodo(fila.metodo)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatGs(fila.monto)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={fila.anulado ? "secondary" : "success"}>
                              {fila.anulado ? "Anulado" : "Vigente"}
                            </Badge>
                          </TableCell>
                          {esAdmin && (
                            <TableCell className="text-right">
                              {!fila.anulado && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPagoAAnular(fila)}
                                >
                                  Anular
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagePagos((actual) => Math.max(1, actual - 1))}
                    disabled={pagePagos <= 1}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Anterior
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {pagePagos} / {totalPaginasPagos}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagePagos((actual) => Math.min(totalPaginasPagos, actual + 1))
                    }
                    disabled={pagePagos >= totalPaginasPagos}
                  >
                    Siguiente
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <Banknote
                  className="mx-auto size-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium">Todavía no hay pagos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generar facturas */}
      <Dialog open={dialogGenerar} onOpenChange={setDialogGenerar}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generar facturas del período</DialogTitle>
            <DialogDescription>
              Revisá el detalle antes de confirmar. Solo se facturan clientes con lectura
              cargada y sin factura en el período.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {previewQuery.isPending ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, indice) => (
                  <Skeleton key={indice} className="h-10 w-full" />
                ))}
              </div>
            ) : previewQuery.isError ? (
              <p className="py-4 text-sm text-destructive">
                No hay tarifa vigente o el período no existe. Revisá la configuración.
              </p>
            ) : previewQuery.data ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Facturas a generar</p>
                    <p className="text-xl font-bold tabular-nums">
                      {previewQuery.data.totales.facturas}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Monto del mes</p>
                    <p className="text-xl font-bold tabular-nums">
                      {formatGs(previewQuery.data.totales.montoTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Total a cobrar</p>
                    <p className="text-xl font-bold tabular-nums">
                      {formatGs(previewQuery.data.totales.montoAPagar)}
                    </p>
                  </div>
                </div>

                {previewQuery.data.pendientesSinLectura > 0 && (
                  <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                    {previewQuery.data.pendientesSinLectura} cliente(s) sin lectura no se
                    facturarán.
                  </p>
                )}

                <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Consumo</TableHead>
                        <TableHead className="text-right">Saldo ant.</TableHead>
                        <TableHead className="text-right">A pagar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewQuery.data.filas.map((fila) => (
                        <TableRow key={fila.clienteId}>
                          <TableCell>
                            <p className="font-medium">{fila.nombre}</p>
                            <p className="text-xs text-muted-foreground">{fila.codigo}</p>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatM3(fila.consumoM3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatGs(fila.saldoAnterior)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatGs(fila.totalAPagar)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogGenerar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmarGeneracion()}
              disabled={
                generarMutation.isPending ||
                !previewQuery.data ||
                previewQuery.data.filas.length === 0
              }
            >
              {generarMutation.isPending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Confirmar y generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar pago */}
      <Dialog open={dialogPago !== null} onOpenChange={(abierto) => !abierto && setDialogPago(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {dialogPago
                ? `${dialogPago.cliente.nombre} — factura ${dialogPago.numero} — saldo ${formatGs(dialogPago.saldo)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="pago-monto">Monto (Gs.)</Label>
              <Input
                id="pago-monto"
                type="number"
                inputMode="numeric"
                min={1}
                max={dialogPago?.saldo ?? undefined}
                value={pagoMonto}
                onChange={(event) => setPagoMonto(event.target.value)}
                className="text-right text-lg tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Podés cobrar parcial. Si el monto supera la deuda, el excedente queda a
                favor del cliente.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pago-metodo">Método</Label>
                <Select
                  id="pago-metodo"
                  value={pagoMetodo}
                  onChange={(event) =>
                    setPagoMetodo(
                      event.target.value as "efectivo" | "transferencia" | "otro",
                    )
                  }
                >
                  {METODOS_PAGO.map((metodo) => (
                    <option key={metodo.valor} value={metodo.valor}>
                      {metodo.etiqueta}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pago-fecha">Fecha</Label>
                <Input
                  id="pago-fecha"
                  type="date"
                  value={pagoFecha}
                  onChange={(event) => setPagoFecha(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pago-referencia">Referencia (opcional)</Label>
              <Input
                id="pago-referencia"
                placeholder="Nº de transferencia, comprobante, etc."
                value={pagoReferencia}
                onChange={(event) => setPagoReferencia(event.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPago(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmarPago()}
              disabled={registrarPagoMutation.isPending}
            >
              {registrarPagoMutation.isPending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Guardar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle / impresión */}
      <Dialog
        open={dialogDetalle !== null}
        onOpenChange={(abierto) => !abierto && setDialogDetalle(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recibo de cobro</DialogTitle>
            <DialogDescription>
              {detalleQuery.data ? detalleQuery.data.numero : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-4">
            {detalleQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : detalleQuery.data ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{detalleQuery.data.cliente.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Período</span>
                  <span>
                    {formatPeriodo(
                      detalleQuery.data.periodo.anio,
                      detalleQuery.data.periodo.mes,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consumo</span>
                  <span>{formatM3(detalleQuery.data.consumoM3)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cargo fijo</span>
                  <span className="tabular-nums">{formatGs(detalleQuery.data.cargoFijo)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consumo</span>
                  <span className="tabular-nums">
                    {formatGs(detalleQuery.data.montoConsumo)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo anterior</span>
                  <span className="tabular-nums">
                    {formatGs(detalleQuery.data.saldoAnterior)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total a pagar</span>
                  <span className="tabular-nums">
                    {formatGs(detalleQuery.data.totalAPagar)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pagado</span>
                  <span className="tabular-nums">{formatGs(detalleQuery.data.pagado)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold tabular-nums">
                    {formatGs(detalleQuery.data.saldo)}
                  </span>
                </div>
                <div className="flex justify-end pt-2">
                  <EstadoFacturaBadge estado={detalleQuery.data.estado} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">No se pudo cargar la factura.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalle(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (!detalleQuery.data) return;
                if (!imprimirRecibo(detalleQuery.data)) {
                  toast.error("Habilitá las ventanas emergentes para imprimir");
                }
              }}
              disabled={!detalleQuery.data || detalleQuery.data.estado === "anulada"}
            >
              <Printer aria-hidden="true" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={facturaAAnular !== null}
        onOpenChange={(abierto) => !abierto && setFacturaAAnular(null)}
        titulo="Anular factura"
        descripcion="La factura quedará marcada como anulada y no se podrá volver a generar para ese cliente en el período. Los pagos registrados no se borran."
        confirmar="Anular factura"
        cargando={anularFacturaMutation.isPending}
        onConfirm={() => void confirmarAnulacionFactura()}
      />

      <ConfirmDialog
        open={pagoAAnular !== null}
        onOpenChange={(abierto) => !abierto && setPagoAAnular(null)}
        titulo="Anular pago"
        descripcion={
          pagoAAnular
            ? `Se anulará el pago ${pagoAAnular.numeroRecibo} de ${formatGs(pagoAAnular.monto)}. La factura volverá a quedar pendiente o parcial según corresponda.`
            : ""
        }
        confirmar="Anular pago"
        cargando={anularPagoMutation.isPending}
        onConfirm={() => void confirmarAnulacionPago()}
      />

      {dialogCierre && <CierreCajaDialog onClose={() => setDialogCierre(false)} />}
    </div>
  );
}
