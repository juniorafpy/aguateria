import type {
  AuditoriaItem,
  ConfiguracionAguateria,
} from "@aguateria/shared";
import {
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Download,
  History,
  Loader2,
  Save,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { descargarRespaldo } from "@/api/backup";
import { useAuditoria } from "@/hooks/useAuditoria";
import {
  useConfiguracion,
  useGuardarConfiguracion,
} from "@/hooks/useConfiguracion";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { mensajeError } from "@/lib/api";

const ACCIONES: Record<string, string> = {
  registrar_pago: "Pago registrado",
  anular_pago: "Pago anulado",
  anular_factura: "Factura anulada",
  actualizar_configuracion: "Configuración actualizada",
  generar_facturas: "Facturas generadas",
  crear_cliente: "Cliente creado",
  actualizar_cliente: "Cliente actualizado",
  instalar_medidor: "Medidor instalado",
  crear_cargo: "Cargo extra creado",
  anular_cargo: "Cargo extra anulado",
  suspender_cliente: "Servicio suspendido",
  reconectar_cliente: "Servicio reconectado",
  crear_usuario: "Usuario creado",
  actualizar_usuario: "Usuario actualizado",
  cambiar_password_usuario: "Contraseña cambiada",
  activar_usuario: "Usuario reactivado",
  desactivar_usuario: "Usuario desactivado",
  revocar_sesiones_usuario: "Sesiones revocadas",
  descargar_respaldo: "Respaldo descargado",
};

function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;

  return new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

interface FormConfig {
  aguateriaNombre: string;
  aguateriaDireccion: string;
  aguateriaTelefono: string;
  aguateriaRuc: string;
  diaVencimiento: string;
  mesesParaCorte: string;
  recargoMora: string;
}

function FormularioConfiguracion({ config }: { config: ConfiguracionAguateria }) {
  const [form, setForm] = useState<FormConfig>(() => ({
    aguateriaNombre: config.aguateriaNombre,
    aguateriaDireccion: config.aguateriaDireccion,
    aguateriaTelefono: config.aguateriaTelefono,
    aguateriaRuc: config.aguateriaRuc,
    diaVencimiento: String(config.diaVencimiento),
    mesesParaCorte: String(config.mesesParaCorte),
    recargoMora: String(config.recargoMora),
  }));

  const guardar = useGuardarConfiguracion();

  function actualizarCampo<K extends keyof FormConfig>(
    campo: K,
    valor: FormConfig[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.aguateriaNombre.trim()) {
      toast.error("Ingresá el nombre de la aguatería");
      return;
    }

    const dia = Number(form.diaVencimiento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
      toast.error("El día de vencimiento debe estar entre 1 y 28");
      return;
    }

    const meses = Number(form.mesesParaCorte);
    if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
      toast.error("Los meses para corte deben estar entre 1 y 12");
      return;
    }

    const recargo = Number(form.recargoMora);
    if (!Number.isInteger(recargo) || recargo < 0) {
      toast.error("El recargo por mora debe ser un entero en Gs.");
      return;
    }

    try {
      await guardar.mutateAsync({
        aguateriaNombre: form.aguateriaNombre.trim(),
        aguateriaDireccion: form.aguateriaDireccion.trim(),
        aguateriaTelefono: form.aguateriaTelefono.trim(),
        aguateriaRuc: form.aguateriaRuc.trim(),
        diaVencimiento: dia,
        mesesParaCorte: meses,
        recargoMora: recargo,
      });
      toast.success("Configuración guardada");
    } catch (error) {
      toast.error(`No se pudo guardar la configuración: ${mensajeError(error)}`);
    }
  }

  return (
    <form className="space-y-4" onSubmit={guardarFormulario}>
      <Card>
        <CardHeader>
          <CardTitle>Datos de la aguatería</CardTitle>
          <CardDescription>
            Información institucional para comprobantes y reportes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="config-nombre">Nombre</Label>
            <Input
              id="config-nombre"
              value={form.aguateriaNombre}
              maxLength={150}
              onChange={(event) =>
                actualizarCampo("aguateriaNombre", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-ruc">RUC</Label>
            <Input
              id="config-ruc"
              value={form.aguateriaRuc}
              maxLength={20}
              placeholder="Opcional"
              onChange={(event) =>
                actualizarCampo("aguateriaRuc", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-telefono">Teléfono</Label>
            <Input
              id="config-telefono"
              value={form.aguateriaTelefono}
              maxLength={30}
              placeholder="Opcional"
              onChange={(event) =>
                actualizarCampo("aguateriaTelefono", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="config-direccion">Dirección</Label>
            <Input
              id="config-direccion"
              value={form.aguateriaDireccion}
              maxLength={200}
              placeholder="Barrio, calle y referencia"
              onChange={(event) =>
                actualizarCampo("aguateriaDireccion", event.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de cobranza</CardTitle>
          <CardDescription>
            Valores de referencia para vencimientos y mora.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="config-dia">Día de vencimiento</Label>
            <Input
              id="config-dia"
              type="number"
              min={1}
              max={28}
              value={form.diaVencimiento}
              onChange={(event) =>
                actualizarCampo("diaVencimiento", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-meses">Meses para corte</Label>
            <Input
              id="config-meses"
              type="number"
              min={1}
              max={12}
              value={form.mesesParaCorte}
              onChange={(event) =>
                actualizarCampo("mesesParaCorte", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-recargo">Recargo por mora (Gs.)</Label>
            <Input
              id="config-recargo"
              inputMode="numeric"
              value={form.recargoMora}
              onChange={(event) =>
                actualizarCampo("recargoMora", event.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          <Save aria-hidden="true" />
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function ConfiguracionPanel() {
  const { data, isPending, isError, refetch } = useConfiguracion();

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            No pudimos cargar la configuración.
          </p>
          <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <FormularioConfiguracion config={data} />;
}

function DetalleAuditoria({ item }: { item: AuditoriaItem }) {
  if (!item.detalle) return <span className="text-muted-foreground">—</span>;

  const texto = JSON.stringify(item.detalle);

  return (
    <code
      className="block max-w-72 truncate text-xs text-muted-foreground"
      title={texto}
    >
      {texto}
    </code>
  );
}

function AuditoriaPanel() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useAuditoria({ page, size: 20 });

  const totalPaginas = data
    ? Math.max(1, Math.ceil(data.total / data.size))
    : 1;

  return (
    <Card>
      <CardContent className="pt-5">
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, indice) => (
              <Skeleton key={indice} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-10 text-center">
            <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              No pudimos cargar la auditoría.
            </p>
            <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatearFechaHora(item.fecha)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {item.usuario?.name ?? "Sistema"}
                        </p>
                        {item.usuario?.username && (
                          <p className="text-xs text-muted-foreground">
                            {item.usuario.username}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ACCIONES[item.accion] ?? item.accion}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{item.entidad}</span>
                        {item.entidadId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            #{item.entidadId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DetalleAuditoria item={item} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {data.total} movimiento(s)
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
            <History className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium">Todavía no hay movimientos auditados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los pagos y anulaciones van a aparecer acá.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type Pestana = "aguateria" | "auditoria" | "respaldo";

function RespaldoPanel() {
  const [descargando, setDescargando] = useState(false);

  async function descargar() {
    setDescargando(true);
    try {
      await descargarRespaldo();
      toast.success("Respaldo descargado");
    } catch (error) {
      toast.error(`No se pudo descargar el respaldo: ${mensajeError(error)}`);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Respaldo manual</CardTitle>
          <CardDescription>
            Descargá un snapshot JSON con clientes, medidores, lecturas, facturas,
            pagos, cargos extra, usuarios y configuración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sirve para inspeccionar los datos o recuperar registros puntuales. Para
            restaurar la base completa usá el dump de PostgreSQL que genera el
            respaldo automático.
          </p>
          <Button onClick={() => void descargar()} disabled={descargando}>
            {descargando ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            Descargar respaldo JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respaldos automáticos</CardTitle>
          <CardDescription>
            Copia diaria de la base en formato pg_dump, con prueba de restauración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            El workflow <code>.github/workflows/backup.yml</code> se ejecuta todos los
            días en GitHub Actions. Genera un dump comprimido con <code>pg_dump</code>,
            lo restaura en un PostgreSQL temporal para verificar que el archivo sirve,
            y lo guarda como artefacto durante 30 días.
          </p>
          <p>
            Requiere el secreto <code>SUPABASE_DB_URL</code> con la cadena de conexión
            directa a Supabase (puerto 5432, <code>sslmode=require</code>). El respaldo
            también se puede generar desde tu equipo con <code>pnpm backup</code>.
          </p>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="mb-2 font-medium text-foreground">Restauración manual</p>
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
              {`pg_restore --clean --if-exists --no-owner \\\n  --dbname "$DATABASE_URL" respaldo.dump`}
            </pre>
          </div>
          <p>
            Los respaldos quedan en la pestaña <strong>Actions</strong> del repositorio,
            dentro de la ejecución llamada <strong>Respaldo de base de datos</strong>.
            Descargá el artefacto y probá la restauración en una base de staging antes
            de reemplazar producción.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ConfiguracionPage() {
  const [pestana, setPestana] = useState<Pestana>("aguateria");

  return (
    <div>
      <PageHeader
        titulo="Configuración"
        descripcion="Datos de la aguatería, reglas de cobranza, respaldos y auditoría"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={pestana === "aguateria" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("aguateria")}
        >
          <Settings aria-hidden="true" />
          Aguatería
        </Button>
        <Button
          variant={pestana === "auditoria" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("auditoria")}
        >
          <History aria-hidden="true" />
          Auditoría
        </Button>
        <Button
          variant={pestana === "respaldo" ? "default" : "outline"}
          size="sm"
          onClick={() => setPestana("respaldo")}
        >
          <DatabaseBackup aria-hidden="true" />
          Respaldo
        </Button>
      </div>

      {pestana === "aguateria" ? (
        <ConfiguracionPanel />
      ) : pestana === "auditoria" ? (
        <AuditoriaPanel />
      ) : (
        <RespaldoPanel />
      )}
    </div>
  );
}
