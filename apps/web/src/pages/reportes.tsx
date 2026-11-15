import {
  formatFecha,
  formatGs,
  formatM3,
  formatPeriodo,
  hoyAsuncion,
  rangoMesActual,
} from "@aguateria/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { descargarReporteCsv } from "@/api/reportes";
import {
  useReporteConsumo,
  useReporteMorosos,
  useReporteRecaudacion,
} from "@/hooks/useReportes";
import { usePeriodos } from "@/hooks/usePeriodos";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const METODOS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
} as const;

function formatearMetodo(metodo: string): string {
  return METODOS[metodo as keyof typeof METODOS] ?? metodo;
}

function Resumen({
  items,
}: {
  items: Array<{
    etiqueta: string;
    valor: string;
    tono?: "default" | "danger" | "success";
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.etiqueta} className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">{item.etiqueta}</p>
          <p
            className={
              item.tono === "danger"
                ? "mt-1 text-xl font-bold tabular-nums text-destructive"
                : item.tono === "success"
                  ? "mt-1 text-xl font-bold tabular-nums text-success"
                  : "mt-1 text-xl font-bold tabular-nums"
            }
          >
            {item.valor}
          </p>
        </div>
      ))}
    </div>
  );
}

function BotonExportar({
  onClick,
  cargando,
  deshabilitado,
}: {
  onClick: () => void;
  cargando: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={cargando || deshabilitado}
    >
      {cargando ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Download aria-hidden="true" />
      )}
      Exportar CSV
    </Button>
  );
}

function MensajeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-8 text-center">
      <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
      <p className="mt-2 text-sm text-muted-foreground">
        No pudimos cargar el reporte.
      </p>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function MorososPanel() {
  const { data, isPending, isError, refetch } = useReporteMorosos();
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      await descargarReporteCsv(
        "/reportes/morosos",
        {},
        `morosos-${hoyAsuncion()}.csv`,
      );
      toast.success("Reporte descargado");
    } catch {
      toast.error("No se pudo descargar el reporte");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Clientes morosos</h2>
            <p className="text-sm text-muted-foreground">
              Facturas vencidas e impagas al {formatFecha(hoyAsuncion())}.
            </p>
          </div>
          <BotonExportar
            onClick={() => void exportar()}
            cargando={exportando}
            deshabilitado={!data}
          />
        </div>

        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <MensajeError onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <Resumen
              items={[
                {
                  etiqueta: "Clientes con deuda vencida",
                  valor: String(data.totales.clientes),
                },
                {
                  etiqueta: "Deuda total",
                  valor: formatGs(data.totales.deuda),
                  tono: "danger",
                },
              ]}
            />

            {data.filas.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2
                  className="mx-auto size-9 text-success"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium">No hay clientes morosos</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Todas las facturas vencidas están al día.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Facturas</TableHead>
                      <TableHead className="text-right">Deuda</TableHead>
                      <TableHead className="text-right">Atraso</TableHead>
                      <TableHead>Vencida desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.filas.map((fila) => (
                      <TableRow key={fila.clienteId}>
                        <TableCell className="font-mono text-xs">
                          {fila.codigo}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{fila.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {fila.telefono ?? fila.direccion}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fila.facturasPendientes}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-destructive">
                          {formatGs(fila.deuda)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fila.mesesAtraso}{" "}
                          {fila.mesesAtraso === 1 ? "mes" : "meses"}
                        </TableCell>
                        <TableCell>{formatFecha(fila.vencidaDesde)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConsumoPanel() {
  const { data: periodos } = usePeriodos();
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);

  const predeterminado = useMemo(() => {
    if (!periodos || periodos.length === 0) return null;
    const abierto = periodos.find((periodo) => periodo.estado === "abierto");
    return (abierto ?? periodos[0])?.id ?? null;
  }, [periodos]);

  const periodoEfectivo = periodoId ?? predeterminado;
  const { data, isPending, isError, refetch } =
    useReporteConsumo(periodoEfectivo);

  async function exportar() {
    setExportando(true);
    try {
      const nombre = data?.periodo
        ? `consumo-${data.periodo.anio}-${String(data.periodo.mes).padStart(2, "0")}.csv`
        : "consumo.csv";
      await descargarReporteCsv(
        "/reportes/consumo",
        { periodoId: periodoEfectivo ?? undefined },
        nombre,
      );
      toast.success("Reporte descargado");
    } catch {
      toast.error("No se pudo descargar el reporte");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full space-y-1.5 sm:w-64">
            <Label htmlFor="reporte-consumo-periodo">Período</Label>
            <Select
              id="reporte-consumo-periodo"
              value={periodoEfectivo ?? ""}
              onChange={(event) =>
                setPeriodoId(Number(event.target.value) || null)
              }
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
          <BotonExportar
            onClick={() => void exportar()}
            cargando={exportando}
            deshabilitado={!data?.periodo}
          />
        </div>

        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <MensajeError onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <Resumen
              items={[
                {
                  etiqueta: "Clientes en el padrón",
                  valor: String(data.totales.clientes),
                },
                {
                  etiqueta: "Lecturas cargadas",
                  valor: `${data.totales.cargadas} / ${data.totales.clientes}`,
                },
                {
                  etiqueta: "Consumo total",
                  valor: formatM3(data.totales.consumoM3),
                },
              ]}
            />

            {data.filas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay clientes para el período seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Consumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.filas.map((fila) => (
                      <TableRow key={fila.clienteId}>
                        <TableCell className="font-mono text-xs">
                          {fila.codigo}
                        </TableCell>
                        <TableCell className="font-medium">{fila.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatM3(fila.lecturaAnterior)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatM3(fila.lecturaActual)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatM3(fila.consumoM3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RecaudacionPanel() {
  const [desde, setDesde] = useState(() => rangoMesActual().desde);
  const [hasta, setHasta] = useState(() => rangoMesActual().hasta);
  const [exportando, setExportando] = useState(false);

  const rangoValido = Boolean(desde) && Boolean(hasta) && desde <= hasta;
  const { data, isPending, isError, refetch } = useReporteRecaudacion(
    desde,
    hasta,
  );

  async function exportar() {
    setExportando(true);
    try {
      await descargarReporteCsv(
        "/reportes/recaudacion",
        { desde, hasta },
        `recaudacion-${desde}-${hasta}.csv`,
      );
      toast.success("Reporte descargado");
    } catch {
      toast.error("No se pudo descargar el reporte");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reporte-desde">Desde</Label>
              <Input
                id="reporte-desde"
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reporte-hasta">Hasta</Label>
              <Input
                id="reporte-hasta"
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
              />
            </div>
          </div>
          <BotonExportar
            onClick={() => void exportar()}
            cargando={exportando}
            deshabilitado={!data || !rangoValido}
          />
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
        ) : isError ? (
          <MensajeError onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <Resumen
              items={[
                { etiqueta: "Total recaudado", valor: formatGs(data.total) },
                { etiqueta: "Pagos vigentes", valor: String(data.cantidad) },
                { etiqueta: "Pagos anulados", valor: String(data.anulados) },
              ]}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold">Por método</h3>
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
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">Por día</h3>
                {data.porDia.length === 0 ? (
                  <p className="rounded-lg border border-border px-3 py-4 text-sm text-muted-foreground">
                    No hay pagos en el rango seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Pagos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.porDia.map((dia) => (
                          <TableRow key={dia.fecha}>
                            <TableCell>{formatFecha(dia.fecha)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {dia.cantidad}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatGs(dia.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

type Pestana = "morosos" | "consumo" | "recaudacion";

export function ReportesPage() {
  const [pestana, setPestana] = useState<Pestana>("morosos");

  return (
    <div>
      <PageHeader
        titulo="Reportes"
        descripcion="Morosos, consumo y recaudación con exportación a CSV"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={pestana === "morosos" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("morosos")}
        >
          <AlertTriangle aria-hidden="true" />
          Morosos
        </Button>
        <Button
          variant={pestana === "consumo" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("consumo")}
        >
          <Gauge aria-hidden="true" />
          Consumo
        </Button>
        <Button
          variant={pestana === "recaudacion" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("recaudacion")}
        >
          <Wallet aria-hidden="true" />
          Recaudación
        </Button>
      </div>

      {pestana === "morosos" ? (
        <MorososPanel />
      ) : pestana === "consumo" ? (
        <ConsumoPanel />
      ) : (
        <RecaudacionPanel />
      )}
    </div>
  );
}
