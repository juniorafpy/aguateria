import {
  formatFecha,
  formatGs,
  type CandidatoCorte,
} from "@aguateria/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Phone,
  Scissors,
  ShieldAlert,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useReconectarCliente,
  useReporteMora,
  useSuspenderCliente,
} from "@/hooks/useMora";
import { authClient } from "@/lib/auth-client";
import { mensajeError } from "@/lib/api";

function ResumenCard({
  etiqueta,
  valor,
  detalle,
  tono = "default",
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: "default" | "danger" | "warning";
  icono: typeof Wallet;
}) {
  const color =
    tono === "danger"
      ? "bg-destructive/10 text-destructive"
      : tono === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-primary/10 text-primary";

  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
          <Icono className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{etiqueta}</p>
          <p className="text-xl font-bold tabular-nums">{valor}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SuspenderDialog({
  candidato,
  onClose,
}: {
  candidato: CandidatoCorte;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("Corte por mora");
  const suspender = useSuspenderCliente();

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await suspender.mutateAsync({
        clienteId: candidato.clienteId,
        input: { motivo: motivo.trim() || "Corte por mora" },
      });
      toast.success(`Servicio suspendido: ${candidato.nombre}`);
      onClose();
    } catch (error) {
      toast.error(`No se pudo suspender el servicio: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender servicio</DialogTitle>
          <DialogDescription>
            {candidato.codigo} — {candidato.nombre}. Deuda actual:{" "}
            {formatGs(candidato.deuda)} en {candidato.facturasPendientes} factura(s).
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={confirmar}>
          <DialogBody className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-suspension">Motivo</Label>
              <Textarea
                id="motivo-suspension"
                value={motivo}
                maxLength={300}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </div>
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              El cliente quedará como suspendido y se registrará la fecha del corte.
              Las facturas y la deuda no se modifican.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={suspender.isPending}>
              {suspender.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Suspender servicio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TablaCandidatos({
  candidatos,
  esAdmin,
  onSuspender,
}: {
  candidatos: CandidatoCorte[];
  esAdmin: boolean;
  onSuspender: (candidato: CandidatoCorte) => void;
}) {
  if (candidatos.length === 0) {
    return (
      <div className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-9 text-success" aria-hidden="true" />
        <p className="mt-3 font-medium">No hay candidatos a corte</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ningún cliente activo alcanzó la cantidad configurada de facturas vencidas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead className="text-right">Facturas vencidas</TableHead>
            <TableHead className="text-right">Deuda</TableHead>
            <TableHead>Vencida desde</TableHead>
            <TableHead className="text-right">Atraso</TableHead>
            {esAdmin && <TableHead className="text-right">Acción</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidatos.map((candidato) => (
            <TableRow key={candidato.clienteId}>
              <TableCell>
                <p className="font-medium">{candidato.nombre}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {candidato.codigo}
                </p>
              </TableCell>
              <TableCell>
                {candidato.telefono ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Phone className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {candidato.telefono}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {candidato.facturasPendientes}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-destructive">
                {formatGs(candidato.deuda)}
              </TableCell>
              <TableCell>{formatFecha(candidato.vencidaDesde)}</TableCell>
              <TableCell className="text-right">
                <Badge variant="warning">{candidato.mesesAtraso} mes(es)</Badge>
              </TableCell>
              {esAdmin && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSuspender(candidato)}
                  >
                    <Scissors aria-hidden="true" />
                    Suspender
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TablaSuspendidos({
  suspendidos,
  esAdmin,
  onReconectar,
}: {
  suspendidos: CandidatoCorte[];
  esAdmin: boolean;
  onReconectar: (candidato: CandidatoCorte) => void;
}) {
  if (suspendidos.length === 0) {
    return (
      <div className="py-10 text-center">
        <UserCheck className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 font-medium">No hay servicios suspendidos</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Los cortes que registres van a aparecer en esta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha de corte</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Deuda</TableHead>
            {esAdmin && <TableHead className="text-right">Acción</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {suspendidos.map((cliente) => (
            <TableRow key={cliente.clienteId}>
              <TableCell>
                <p className="font-medium">{cliente.nombre}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {cliente.codigo}
                </p>
              </TableCell>
              <TableCell>{formatFecha(cliente.fechaSuspension)}</TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                {cliente.motivoSuspension ?? "—"}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatGs(cliente.deuda)}
              </TableCell>
              {esAdmin && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReconectar(cliente)}
                  >
                    <UserCheck aria-hidden="true" />
                    Reconectar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MoraPage() {
  const { data: sesion } = authClient.useSession();
  const esAdmin = sesion?.user.role === "admin";

  const reporteQuery = useReporteMora();
  const reconectar = useReconectarCliente();

  const [suspenderCandidato, setSuspenderCandidato] =
    useState<CandidatoCorte | null>(null);
  const [reconectarCandidato, setReconectarCandidato] =
    useState<CandidatoCorte | null>(null);

  async function confirmarReconexion() {
    if (!reconectarCandidato) return;

    try {
      await reconectar.mutateAsync({
        clienteId: reconectarCandidato.clienteId,
        input: { motivo: "Reconexión del servicio" },
      });
      toast.success(`Servicio reconectado: ${reconectarCandidato.nombre}`);
      setReconectarCandidato(null);
    } catch (error) {
      toast.error(`No se pudo reconectar el servicio: ${mensajeError(error)}`);
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Mora y cortes"
        descripcion="Clientes con deuda vencida, cortes de servicio y reconexiones"
      />

      {reporteQuery.isPending ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, indice) => (
              <Skeleton key={indice} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : reporteQuery.isError || !reporteQuery.data ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              No pudimos cargar el reporte de mora.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void reporteQuery.refetch()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ResumenCard
              etiqueta="Candidatos a corte"
              valor={String(reporteQuery.data.resumen.candidatos)}
              detalle={`Con ${reporteQuery.data.mesesParaCorte} o más facturas vencidas`}
              tono="danger"
              icono={AlertTriangle}
            />
            <ResumenCard
              etiqueta="Deuda de candidatos"
              valor={formatGs(reporteQuery.data.resumen.deudaCandidatos)}
              detalle="Capital pendiente de los clientes activos"
              tono="warning"
              icono={Wallet}
            />
            <ResumenCard
              etiqueta="Servicios suspendidos"
              valor={String(reporteQuery.data.resumen.suspendidos)}
              detalle={`Deuda: ${formatGs(reporteQuery.data.resumen.deudaSuspendidos)}`}
              icono={Scissors}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Reglas actuales: corte con {reporteQuery.data.mesesParaCorte} factura(s)
            vencida(s) y recargo por mora de {formatGs(reporteQuery.data.recargoMora)}.
            Se aplican al generar las facturas del período.
          </p>

          <Card>
            <CardContent className="pt-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold tracking-tight">Candidatos a corte</h2>
                <p className="text-sm text-muted-foreground">
                  Clientes activos que alcanzaron el umbral configurado.
                </p>
              </div>
              <TablaCandidatos
                candidatos={reporteQuery.data.candidatos}
                esAdmin={esAdmin}
                onSuspender={setSuspenderCandidato}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold tracking-tight">Servicios suspendidos</h2>
                <p className="text-sm text-muted-foreground">
                  Reconectá cuando el cliente regularice su situación.
                </p>
              </div>
              <TablaSuspendidos
                suspendidos={reporteQuery.data.suspendidos}
                esAdmin={esAdmin}
                onReconectar={setReconectarCandidato}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {suspenderCandidato && (
        <SuspenderDialog
          candidato={suspenderCandidato}
          onClose={() => setSuspenderCandidato(null)}
        />
      )}

      <ConfirmDialog
        open={reconectarCandidato !== null}
        onOpenChange={(abierto) => !abierto && setReconectarCandidato(null)}
        titulo="Reconectar servicio"
        descripcion={
          reconectarCandidato
            ? `${reconectarCandidato.nombre} volverá a figurar como activo. La deuda pendiente se mantiene.`
            : ""
        }
        confirmar="Reconectar"
        cargando={reconectar.isPending}
        onConfirm={() => void confirmarReconexion()}
      />
    </div>
  );
}
