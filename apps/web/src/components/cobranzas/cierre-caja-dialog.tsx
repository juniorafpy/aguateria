import { formatFecha, formatGs, hoyAsuncion, type CierreCaja } from "@aguateria/shared";
import { Printer, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCierreCaja } from "@/hooks/usePagos";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function formatearMetodo(metodo: string): string {
  return METODOS[metodo as keyof typeof METODOS] ?? metodo;
}

function imprimirCierre(cierre: CierreCaja) {
  const ventana = window.open("", "_blank", "width=520,height=760");
  if (!ventana) {
    toast.error("Habilitá las ventanas emergentes para imprimir");
    return;
  }

  const metodosHtml = cierre.porMetodo
    .map(
      (metodo) =>
        `<div class="fila"><span>${formatearMetodo(metodo.metodo)} (${metodo.cantidad})</span><span>${formatGs(
          metodo.total,
        )}</span></div>`,
    )
    .join("");

  const pagosHtml =
    cierre.pagos.length === 0
      ? "<p>Sin pagos en el rango.</p>"
      : `<table><thead><tr><th>Recibo</th><th>Fecha</th><th>Cliente</th><th class="der">Monto</th></tr></thead><tbody>${cierre.pagos
          .map(
            (pago) =>
              `<tr><td>${pago.numeroRecibo}</td><td>${formatFecha(pago.fecha)}</td><td>${
                pago.cliente.nombre
              }</td><td class="der">${formatGs(pago.monto)}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Cierre de caja</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; letter-spacing: .5px; }
  .sub { text-align: center; font-size: 11px; margin: 0 0 10px; }
  .linea { border-top: 1px dashed #444; margin: 8px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .fila span:last-child { font-weight: bold; text-align: right; }
  .total { font-size: 15px; font-weight: bold; }
  .titulo { font-weight: bold; margin: 6px 0 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #444; padding: 3px 0; }
  td { padding: 3px 0; vertical-align: top; }
  .der { text-align: right; }
  .nota { font-size: 10px; margin-top: 10px; text-align: center; }
  @media print { body { padding: 0; } @page { margin: 8mm; } }
</style>
</head>
<body>
  <h1>AGUATERÍA — COMISIÓN VECINAL</h1>
  <p class="sub">Cierre de caja</p>
  <div class="linea"></div>
  <div class="fila"><span>Desde</span><span>${formatFecha(cierre.desde)}</span></div>
  <div class="fila"><span>Hasta</span><span>${formatFecha(cierre.hasta)}</span></div>
  <div class="linea"></div>
  <div class="fila total"><span>Total recaudado</span><span>${formatGs(cierre.total)}</span></div>
  <div class="fila"><span>Pagos vigentes</span><span>${cierre.cantidad}</span></div>
  <div class="fila"><span>Pagos anulados</span><span>${cierre.anulados}</span></div>
  <div class="linea"></div>
  <p class="titulo">Por método</p>
  ${metodosHtml}
  <div class="linea"></div>
  <p class="titulo">Detalle de pagos</p>
  ${pagosHtml}
  <p class="nota">Documento interno. Los pagos anulados no se incluyen en el total.</p>
</body>
</html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

export function CierreCajaDialog({ onClose }: { onClose: () => void }) {
  const [desde, setDesde] = useState(hoyAsuncion());
  const [hasta, setHasta] = useState(hoyAsuncion());

  const rangoValido = Boolean(desde) && Boolean(hasta) && desde <= hasta;
  const { data, isPending, isError, refetch } = useCierreCaja(desde, hasta);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cierre de caja</DialogTitle>
          <DialogDescription>
            Pagos vigentes del rango y total recaudado por método.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cierre-desde">Desde</Label>
              <Input
                id="cierre-desde"
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cierre-hasta">Hasta</Label>
              <Input
                id="cierre-hasta"
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
              />
            </div>
          </div>

          {!rangoValido ? (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              El rango de fechas es inválido.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError || !data ? (
            <div className="py-6 text-center">
              <ShieldAlert
                className="mx-auto size-8 text-destructive"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                No se pudo obtener el cierre de caja.
              </p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total recaudado</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatGs(data.total)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Pagos</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {data.cantidad}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Anulados</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {data.anulados}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Pagos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.porMetodo.map((metodo) => (
                      <TableRow key={metodo.metodo}>
                        <TableCell>{formatearMetodo(metodo.metodo)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {metodo.cantidad}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatGs(metodo.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-bold">Pagos del rango</h3>
                {data.pagos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay pagos vigentes en el rango seleccionado.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recibo</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pagos.map((pago) => (
                          <TableRow key={pago.id}>
                            <TableCell className="font-mono text-xs">
                              {pago.numeroRecibo}
                            </TableCell>
                            <TableCell>{formatFecha(pago.fecha)}</TableCell>
                            <TableCell>{pago.cliente.nombre}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {pago.factura?.numero ?? "Saldo a favor"}
                            </TableCell>
                            <TableCell>{formatearMetodo(pago.metodo)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatGs(pago.monto)}
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
            onClick={() => data && rangoValido && imprimirCierre(data)}
            disabled={!data || !rangoValido}
          >
            <Printer aria-hidden="true" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
