import {
  formatFecha,
  formatGs,
  formatPeriodo,
  hoyAsuncion,
  type DashboardResumen,
} from "@aguateria/shared";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  ReceiptText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { obtenerDashboard } from "@/api/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tonos = {
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
} as const;

interface KpiProps {
  titulo: string;
  valor: string;
  detalle: string;
  icon: LucideIcon;
  tono: keyof typeof tonos;
  testId: string;
}

function Kpi({ titulo, valor, detalle, icon: Icon, tono, testId }: KpiProps) {
  return (
    <Card className="p-5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {valor}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tonos[tono])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  titulo,
  detalle,
}: {
  to: string;
  icon: LucideIcon;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function diasHasta(fecha: string): number {
  const hoy = new Date(`${hoyAsuncion()}T12:00:00Z`).getTime();
  const objetivo = new Date(`${fecha}T12:00:00Z`).getTime();
  return Math.ceil((objetivo - hoy) / 86_400_000);
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Skeleton key={indice} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-bold">No pudimos cargar el resumen</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Revisá que la API esté corriendo y volvé a intentar.
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </Card>
  );
}

export function DashboardPage() {
  const { data: sesion } = authClient.useSession();
  const { data, isPending, isError, refetch } = useQuery<DashboardResumen>({
    queryKey: ["dashboard"],
    queryFn: obtenerDashboard,
  });

  if (isPending) return <DashboardSkeleton />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const nombre = sesion?.user.name.split(" ")[0] ?? "";
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const periodoTexto = data.periodo
    ? formatPeriodo(data.periodo.anio, data.periodo.mes)
    : "Sin período abierto";
  const porcentaje =
    data.lecturas.total > 0 ? Math.round((data.lecturas.cargadas / data.lecturas.total) * 100) : 0;
  const dias = data.periodo ? diasHasta(data.periodo.fechaVencimiento) : null;

  return (
    <div>
      <PageHeader
        titulo={`${saludo}, ${nombre}`}
        descripcion={
          data.periodo
            ? `Este es el resumen de ${periodoTexto.toLowerCase()}.`
            : "Todavía no hay un período abierto."
        }
      >
        {data.periodo && (
          <Badge variant={data.periodo.estado === "abierto" ? "success" : "secondary"}>
            {data.periodo.estado === "abierto" ? "Período abierto" : data.periodo.estado}
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Clientes activos"
          valor={String(data.clientes.activos)}
          detalle={`${data.clientes.suspendidos} suspendidos`}
          icon={Users}
          tono="sky"
          testId="kpi-clientes"
        />
        <Kpi
          titulo="Facturado del mes"
          valor={formatGs(data.facturacion.facturadoMes)}
          detalle="Facturas emitidas"
          icon={ReceiptText}
          tono="green"
          testId="kpi-facturado"
        />
        <Kpi
          titulo="Cobrado del mes"
          valor={formatGs(data.facturacion.cobradoMes)}
          detalle="Pagos registrados"
          icon={Wallet}
          tono="amber"
          testId="kpi-cobrado"
        />
        <Kpi
          titulo="Pendiente total"
          valor={formatGs(data.facturacion.pendienteTotal)}
          detalle="Deuda acumulada"
          icon={CircleDollarSign}
          tono="rose"
          testId="kpi-pendiente"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Lecturas del período</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{periodoTexto}</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <Gauge className="size-5" aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {porcentaje}%
              </p>
              <p className="pb-1 text-sm text-muted-foreground">
                {data.lecturas.cargadas} de {data.lecturas.total} cargadas
              </p>
            </div>
            <Progress value={porcentaje} className="mt-4" label="Avance de lecturas" />
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="success">
                <CheckCircle2 aria-hidden="true" />
                {data.lecturas.cargadas} cargadas
              </Badge>
              <Badge variant="warning">
                <AlertCircle aria-hidden="true" />
                {data.lecturas.faltantes} pendientes
              </Badge>
            </div>
            <Button asChild className="mt-5 w-full sm:w-auto">
              <Link to="/lecturas">
                Cargar lecturas
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Los clientes sin lectura figuran como pendientes hasta que se carguen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickAction
              to="/lecturas"
              icon={Gauge}
              titulo="Cargar lecturas"
              detalle="Pantalla de uso diario"
            />
            <QuickAction
              to="/cobranzas"
              icon={Wallet}
              titulo="Registrar pago"
              detalle="Efectivo o transferencia"
            />
            <QuickAction
              to="/clientes"
              icon={Users}
              titulo="Ver clientes"
              detalle="Datos y saldos"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Cobranza</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">Deuda vencida</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <CircleDollarSign className="size-5" aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Morosos
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {data.morosos.cantidad}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Monto
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {formatGs(data.morosos.monto)}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="mt-5">
              <Link to="/reportes">
                Ver morosos
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vencimiento</CardTitle>
          </CardHeader>
          <CardContent>
            {data.periodo ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <CalendarClock className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {formatFecha(data.periodo.fechaVencimiento)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dias !== null && dias >= 0
                        ? `Faltan ${dias} días`
                        : `Venció hace ${Math.abs(dias ?? 0)} días`}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={data.periodo.estado === "abierto" ? "success" : "secondary"}>
                    {data.periodo.estado === "abierto" ? "Abierto" : data.periodo.estado}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Abrí un período para empezar a cargar lecturas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
