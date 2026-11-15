import {
  formatFecha,
  formatGs,
  formatPeriodo,
  type EstadoCuentaCliente,
} from "@aguateria/shared";
import { Printer, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useEstadoCuenta } from "@/hooks/useClientes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const METODOS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
} as const;

const VARIANTE_ESTADO: Record<
  string,
  "default" | "secondary" | "success" | "warning"
> = {
  pendiente: "warning",
  parcial: "default",
  pagada: "success",
  anulada: "secondary",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  anulada: "Anulada",
};

function formatearMetodo(metodo: string): string {
  return METODOS[metodo as keyof typeof METODOS] ?? metodo;
}

function imprimirEstadoCuenta(estado: EstadoCuentaCliente) {
  const ventana = window.open("", "_blank", "width=620,height=820");
  if (!ventana) {
    toast.error("Habilitá las ventanas emergentes para imprimir");
    return;
  }

  const facturas = estado.facturas.filter(
    (factura) => factura.estado !== "anulada",
  );
  const pagos = estado.pagos.filter((pago) => !pago.anulado);

  const facturasHtml =
    facturas.length === 0
      ? "<p>Sin facturas registradas.</p>"
      : `<table><thead><tr><th>Nº</th><th>Período</th><th>Vencimiento</th><th class="der">Total</th><th class="der">Pagado</th><th class="der">Saldo</th></tr></thead><tbody>${facturas
          .map(
            (factura) =>
              `<tr><td>${factura.numero}</td><td>${formatPeriodo(
                factura.periodo.anio,
                factura.periodo.mes,
              )}</td><td>${formatFecha(factura.fechaVencimiento)}</td><td class="der">${formatGs(
                factura.totalAPagar,
              )}</td><td class="der">${formatGs(factura.pagado)}</td><td class="der">${formatGs(
                factura.saldo,
              )}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  const pagosHtml =
    pagos.length === 0
      ? "<p>Sin pagos registrados.</p>"
      : `<table><thead><tr><th>Recibo</th><th>Fecha</th><th>Factura</th><th>Método</th><th class="der">Monto</th></tr></thead><tbody>${pagos
          .map(
            (pago) =>
              `<tr><td>${pago.numeroRecibo}</td><td>${formatFecha(pago.fecha)}</td><td>${
                pago.facturaNumero ?? "Saldo a favor"
              }</td><td>${formatearMetodo(pago.metodo)}</td><td class="der">${formatGs(
                pago.monto,
              )}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  const saldoAFavor =
    estado.resumen.saldoAFavor > 0
      ? `<div class="fila"><span>Saldo a favor</span><span>${formatGs(
          estado.resumen.saldoAFavor,
        )}</span></div>`
      : "";

  ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Estado de cuenta — ${estado.cliente.nombre}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; letter-spacing: .5px; }
  .sub { text-align: center; font-size: 11px; margin: 0 0 10px; }
  .linea { border-top: 1px dashed #444; margin: 8px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .fila span:last-child { font-weight: bold; text-align: right; }
  .titulo { font-weight: bold; margin: 6px 0 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #444; padding: 3px 0; }
  td { padding: 3px 0; vertical-align: top; }
  .der { text-align: right; }
  .total { font-size: 14px; font-weight: bold; }
  .nota { font-size: 10px; margin-top: 10px; text-align: center; }
  @media print { body { padding: 0; } @page { margin: 8mm; } }
</style>
</head>
<body>
  <h1>AGUATERÍA — COMISIÓN VECINAL</h1>
  <p class="sub">Estado de cuenta del cliente</p>
  <div class="linea"></div>
  <div class="fila"><span>Cliente</span><span>${estado.cliente.nombre}</span></div>
  <div class="fila"><span>Código</span><span>${estado.cliente.codigo}</span></div>
  <div class="fila"><span>Documento</span><span>${estado.cliente.ciRuc ?? "—"}</span></div>
  <div class="fila"><span>Teléfono</span><span>${estado.cliente.telefono ?? "—"}</span></div>
  <div class="fila"><span>Dirección</span><span>${estado.cliente.direccion}</span></div>
  <div class="fila"><span>Emitido</span><span>${formatFecha(estado.generadoEn)}</span></div>
  <div class="linea"></div>
  <div class="fila"><span>Total facturado</span><span>${formatGs(estado.resumen.facturado)}</span></div>
  <div class="fila"><span>Total pagado</span><span>${formatGs(estado.resumen.pagado)}</span></div>
  <div class="fila total"><span>Deuda pendiente</span><span>${formatGs(estado.resumen.deuda)}</span></div>
  ${saldoAFavor}
  <div class="linea"></div>
  <p class="titulo">Facturas</p>
  ${facturasHtml}
  <div class="linea"></div>
  <p class="titulo">Pagos</p>
  ${pagosHtml}
  <p class="nota">Documento interno. No válido como factura legal. No incluye comprobantes anulados.</p>
</body>
</html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

export function EstadoCuentaDialog({
  clienteId,
  onClose,
}: {
  clienteId: number;
  onClose: () => void;
}) {
  const { data, isPending, isError } = useEstadoCuenta(clienteId);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Estado de cuenta</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.cliente.codigo} — ${data.cliente.nombre}`
              : "Cargando..."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5 pb-4">
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !data ? (
            <div className="py-8 text-center">
              <ShieldAlert
                className="mx-auto size-8 text-destructive"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                No se pudo cargar el estado de cuenta.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Facturado</p>
                  <p className="mt-1 font-bold tabular-nums">
                    {formatGs(data.resumen.facturado)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="mt-1 font-bold tabular-nums">
                    {formatGs(data.resumen.pagado)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Deuda pendiente</p>
                  <p className="mt-1 font-bold tabular-nums text-destructive">
                    {formatGs(data.resumen.deuda)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Saldo a favor</p>
                  <p className="mt-1 font-bold tabular-nums text-success">
                    {formatGs(data.resumen.saldoAFavor)}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-bold">Facturas</h3>
                {data.facturas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    El cliente todavía no tiene facturas.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Pagado</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.facturas.map((factura) => (
                          <TableRow key={factura.id}>
                            <TableCell className="font-mono text-xs">
                              {factura.numero}
                            </TableCell>
                            <TableCell>
                              {formatPeriodo(
                                factura.periodo.anio,
                                factura.periodo.mes,
                              )}
                            </TableCell>
                            <TableCell>{formatFecha(factura.fechaVencimiento)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatGs(factura.totalAPagar)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatGs(factura.pagado)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatGs(factura.saldo)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={VARIANTE_ESTADO[factura.estado] ?? "secondary"}
                                >
                                  {ETIQUETA_ESTADO[factura.estado] ?? factura.estado}
                                </Badge>
                                {factura.vencida && (
                                  <Badge variant="destructive">Vencida</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">Pagos</h3>
                {data.pagos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    El cliente todavía no tiene pagos registrados.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recibo</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pagos.map((pago) => (
                          <TableRow key={pago.id}>
                            <TableCell className="font-mono text-xs">
                              {pago.numeroRecibo}
                            </TableCell>
                            <TableCell>{formatFecha(pago.fecha)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {pago.facturaNumero ?? "Saldo a favor"}
                            </TableCell>
                            <TableCell>{formatearMetodo(pago.metodo)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatGs(pago.monto)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pago.anulado ? "secondary" : "success"}>
                                {pago.anulado ? "Anulado" : "Vigente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            onClick={() => data && imprimirEstadoCuenta(data)}
            disabled={!data}
          >
            <Printer aria-hidden="true" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
