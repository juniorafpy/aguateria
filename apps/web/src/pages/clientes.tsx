import {
  formatFecha,
  formatM3,
  formatPeriodo,
  hoyAsuncion,
  type ClienteListItem,
  type EstadoCliente,
} from "@aguateria/shared";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCliente, useClientes, useInstalarMedidor, useActualizarCliente, useRegistrarCliente } from "@/hooks/useClientes";
import { EstadoCuentaDialog } from "@/components/clientes/estado-cuenta-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { mensajeError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const ESTADOS: Array<{ valor: EstadoCliente; etiqueta: string }> = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "suspendido", etiqueta: "Suspendido" },
  { valor: "baja", etiqueta: "Baja" },
];

const VARIANTE_ESTADO: Record<
  EstadoCliente,
  "success" | "warning" | "secondary"
> = {
  activo: "success",
  suspendido: "warning",
  baja: "secondary",
};

const ETIQUETA_ESTADO: Record<EstadoCliente, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  baja: "Baja",
};

function EstadoClienteBadge({ estado }: { estado: EstadoCliente }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

interface FormCliente {
  codigo: string;
  nombre: string;
  ciRuc: string;
  telefono: string;
  direccion: string;
  fechaAlta: string;
  estado: EstadoCliente;
  observaciones: string;
}

interface FormMedidor {
  numeroSerie: string;
  lecturaInicial: string;
  fechaInstalacion: string;
}

function formClienteVacio(): FormCliente {
  return {
    codigo: "",
    nombre: "",
    ciRuc: "",
    telefono: "",
    direccion: "",
    fechaAlta: hoyAsuncion(),
    estado: "activo",
    observaciones: "",
  };
}

function formClienteDesde(cliente: ClienteListItem): FormCliente {
  return {
    codigo: cliente.codigo,
    nombre: cliente.nombre,
    ciRuc: cliente.ciRuc ?? "",
    telefono: cliente.telefono ?? "",
    direccion: cliente.direccion,
    fechaAlta: cliente.fechaAlta,
    estado: cliente.estado,
    observaciones: cliente.observaciones ?? "",
  };
}

function formMedidorVacio(): FormMedidor {
  return {
    numeroSerie: "",
    lecturaInicial: "0",
    fechaInstalacion: hoyAsuncion(),
  };
}

interface ClienteFormDialogProps {
  cliente: ClienteListItem | null;
  onClose: () => void;
}

function ClienteFormDialog({ cliente, onClose }: ClienteFormDialogProps) {
  const esEdicion = cliente !== null;
  const [form, setForm] = useState<FormCliente>(() =>
    cliente ? formClienteDesde(cliente) : formClienteVacio(),
  );
  const [conMedidor, setConMedidor] = useState(false);
  const [medidor, setMedidor] = useState<FormMedidor>(formMedidorVacio);

  const registrar = useRegistrarCliente();
  const actualizar = useActualizarCliente();
  const guardando = registrar.isPending || actualizar.isPending;

  function actualizarCampo<K extends keyof FormCliente>(campo: K, valor: FormCliente[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function validar(): string | null {
    if (!form.codigo.trim()) return "Ingresá el código del cliente";
    if (form.nombre.trim().length < 3) return "Ingresá el nombre del cliente";
    if (form.direccion.trim().length < 3) return "Ingresá la dirección o referencia";
    if (!form.fechaAlta) return "Indicá la fecha de alta";

    if (!esEdicion && conMedidor) {
      if (!medidor.numeroSerie.trim()) return "Ingresá el número de serie del medidor";
      const lectura = Number(medidor.lecturaInicial);
      if (!Number.isFinite(lectura) || lectura < 0) {
        return "La lectura inicial no es válida";
      }
      if (!medidor.fechaInstalacion) return "Indicá la fecha de instalación del medidor";
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

    const base = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      ciRuc: form.ciRuc.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim(),
      fechaAlta: form.fechaAlta,
      estado: form.estado,
      observaciones: form.observaciones.trim() || null,
    };

    try {
      if (esEdicion && cliente) {
        await actualizar.mutateAsync({ id: cliente.id, input: base });
        toast.success("Cliente actualizado");
      } else {
        await registrar.mutateAsync({
          ...base,
          medidor: conMedidor
            ? {
                numeroSerie: medidor.numeroSerie.trim(),
                lecturaInicial: Number(medidor.lecturaInicial),
                fechaInstalacion: medidor.fechaInstalacion,
              }
            : undefined,
        });
        toast.success("Cliente registrado");
      }
      onClose();
    } catch (error) {
      toast.error(`No se pudo guardar el cliente: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualizá los datos del padrón. El medidor se gestiona por separado."
              : "Registrá los datos del cliente y, si ya lo tenés, su medidor."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={guardar}>
          <DialogBody className="space-y-5 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cliente-codigo">Código</Label>
                <Input
                  id="cliente-codigo"
                  value={form.codigo}
                  maxLength={12}
                  placeholder="0009"
                  onChange={(event) => actualizarCampo("codigo", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente-estado">Estado</Label>
                <Select
                  id="cliente-estado"
                  value={form.estado}
                  onChange={(event) =>
                    actualizarCampo("estado", event.target.value as EstadoCliente)
                  }
                >
                  {ESTADOS.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente-nombre">Nombre y apellido</Label>
              <Input
                id="cliente-nombre"
                value={form.nombre}
                maxLength={150}
                placeholder="Ej. María Elena Benítez"
                onChange={(event) => actualizarCampo("nombre", event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cliente-ci">CI / RUC</Label>
                <Input
                  id="cliente-ci"
                  value={form.ciRuc}
                  maxLength={20}
                  placeholder="Opcional"
                  onChange={(event) => actualizarCampo("ciRuc", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente-telefono">Teléfono</Label>
                <Input
                  id="cliente-telefono"
                  value={form.telefono}
                  maxLength={30}
                  placeholder="Opcional"
                  onChange={(event) => actualizarCampo("telefono", event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente-direccion">Dirección o referencia</Label>
              <Input
                id="cliente-direccion"
                value={form.direccion}
                maxLength={200}
                placeholder="Calle, número y referencia"
                onChange={(event) => actualizarCampo("direccion", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente-fecha-alta">Fecha de alta</Label>
              <Input
                id="cliente-fecha-alta"
                type="date"
                value={form.fechaAlta}
                onChange={(event) => actualizarCampo("fechaAlta", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente-observaciones">Observaciones</Label>
              <Textarea
                id="cliente-observaciones"
                value={form.observaciones}
                maxLength={1000}
                placeholder="Opcional"
                onChange={(event) => actualizarCampo("observaciones", event.target.value)}
              />
            </div>

            {!esEdicion && (
              <div className="rounded-lg border border-border p-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={conMedidor}
                    onChange={(event) => setConMedidor(event.target.checked)}
                  />
                  Instalar medidor ahora
                </label>

                {conMedidor && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="medidor-serie">Número de serie</Label>
                      <Input
                        id="medidor-serie"
                        value={medidor.numeroSerie}
                        maxLength={50}
                        placeholder="Ej. AG-2026-009"
                        onChange={(event) =>
                          setMedidor((actual) => ({
                            ...actual,
                            numeroSerie: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="medidor-lectura">Lectura inicial (m³)</Label>
                      <Input
                        id="medidor-lectura"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={medidor.lecturaInicial}
                        onChange={(event) =>
                          setMedidor((actual) => ({
                            ...actual,
                            lecturaInicial: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="medidor-fecha">Fecha de instalación</Label>
                      <Input
                        id="medidor-fecha"
                        type="date"
                        value={medidor.fechaInstalacion}
                        onChange={(event) =>
                          setMedidor((actual) => ({
                            ...actual,
                            fechaInstalacion: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" aria-hidden="true" />}
              {esEdicion ? "Guardar cambios" : "Registrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MedidorDialogProps {
  cliente: ClienteListItem;
  onClose: () => void;
}

function MedidorDialog({ cliente, onClose }: MedidorDialogProps) {
  const [form, setForm] = useState<FormMedidor>(formMedidorVacio);
  const instalar = useInstalarMedidor();

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.numeroSerie.trim()) {
      toast.error("Ingresá el número de serie del medidor");
      return;
    }

    const lectura = Number(form.lecturaInicial);
    if (!Number.isFinite(lectura) || lectura < 0) {
      toast.error("La lectura inicial no es válida");
      return;
    }

    if (!form.fechaInstalacion) {
      toast.error("Indicá la fecha de instalación");
      return;
    }

    try {
      await instalar.mutateAsync({
        clienteId: cliente.id,
        input: {
          numeroSerie: form.numeroSerie.trim(),
          lecturaInicial: lectura,
          fechaInstalacion: form.fechaInstalacion,
        },
      });
      toast.success("Medidor instalado");
      onClose();
    } catch (error) {
      toast.error(`No se pudo instalar el medidor: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instalar medidor</DialogTitle>
          <DialogDescription>
            {cliente.medidor
              ? `Se retirará el medidor ${cliente.medidor.numeroSerie} y se instalará uno nuevo.`
              : `${cliente.nombre} todavía no tiene un medidor activo.`}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={guardar}>
          <DialogBody className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-medidor-serie">Número de serie</Label>
              <Input
                id="nuevo-medidor-serie"
                value={form.numeroSerie}
                maxLength={50}
                placeholder="Ej. AG-2026-009"
                onChange={(event) =>
                  setForm((actual) => ({ ...actual, numeroSerie: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-medidor-lectura">Lectura inicial (m³)</Label>
                <Input
                  id="nuevo-medidor-lectura"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.lecturaInicial}
                  onChange={(event) =>
                    setForm((actual) => ({
                      ...actual,
                      lecturaInicial: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-medidor-fecha">Fecha de instalación</Label>
                <Input
                  id="nuevo-medidor-fecha"
                  type="date"
                  value={form.fechaInstalacion}
                  onChange={(event) =>
                    setForm((actual) => ({
                      ...actual,
                      fechaInstalacion: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={instalar.isPending}>
              {instalar.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Instalar medidor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ClienteDetalleDialogProps {
  clienteId: number;
  onClose: () => void;
  onEstadoCuenta: (clienteId: number) => void;
}

function ClienteDetalleDialog({
  clienteId,
  onClose,
  onEstadoCuenta,
}: ClienteDetalleDialogProps) {
  const { data, isPending, isError } = useCliente(clienteId);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ficha del cliente</DialogTitle>
          <DialogDescription>
            {data ? `${data.cliente.codigo} — ${data.cliente.nombre}` : "Cargando..."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5 pb-6">
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-destructive">No se pudo cargar el cliente.</p>
          ) : (
            <>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">CI / RUC</p>
                  <p className="font-medium">{data.cliente.ciRuc ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{data.cliente.telefono ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-medium">{data.cliente.direccion}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de alta</p>
                  <p className="font-medium">{formatFecha(data.cliente.fechaAlta)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <EstadoClienteBadge estado={data.cliente.estado} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medidor activo</p>
                  <p className="font-medium">
                    {data.medidorActivo
                      ? `${data.medidorActivo.numeroSerie} (inicial ${formatM3(data.medidorActivo.lecturaInicial)})`
                      : "Sin medidor"}
                  </p>
                </div>
                {data.cliente.observaciones && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Observaciones</p>
                    <p className="font-medium">{data.cliente.observaciones}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-bold">Historial de lecturas</h3>
                {data.historial.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay lecturas registradas.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Anterior</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Consumo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.historial.map((lectura) => (
                          <TableRow key={lectura.id}>
                            <TableCell>
                              {formatPeriodo(lectura.anio, lectura.mes)}
                            </TableCell>
                            <TableCell>{formatFecha(lectura.fechaLectura)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatM3(lectura.lecturaAnterior)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatM3(lectura.lecturaActual)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatM3(lectura.consumoM3)}
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
          <Button onClick={() => onEstadoCuenta(clienteId)}>
            <FileText aria-hidden="true" />
            Estado de cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientesPage() {
  const { data: sesion } = authClient.useSession();
  const esAdmin = sesion?.user.role === "admin";

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [estado, setEstado] = useState<EstadoCliente | "">("");
  const [page, setPage] = useState(1);

  const [dialogForm, setDialogForm] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteListItem | null>(null);
  const [clienteMedidor, setClienteMedidor] = useState<ClienteListItem | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [cuentaId, setCuentaId] = useState<number | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const filtros = useMemo(
    () => ({
      q: busquedaDebounced || undefined,
      estado: estado || undefined,
      page,
      size: 20,
    }),
    [busquedaDebounced, estado, page],
  );

  const clientesQuery = useClientes(filtros);
  const totalPaginas = clientesQuery.data
    ? Math.max(1, Math.ceil(clientesQuery.data.total / clientesQuery.data.size))
    : 1;

  function abrirNuevo() {
    setClienteEditando(null);
    setDialogForm(true);
  }

  function abrirEdicion(cliente: ClienteListItem) {
    setClienteEditando(cliente);
    setDialogForm(true);
  }

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        descripcion="Padrón de clientes, datos de contacto y medidores"
      >
        {esAdmin && (
          <Button onClick={abrirNuevo}>
            <Plus aria-hidden="true" />
            Nuevo cliente
          </Button>
        )}
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clientes-busqueda">Buscar</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="clientes-busqueda"
                className="pl-9"
                placeholder="Nombre, código o CI/RUC"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientes-estado">Estado</Label>
            <Select
              id="clientes-estado"
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value as EstadoCliente | "");
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {clientesQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : clientesQuery.isError ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No pudimos cargar los clientes.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void clientesQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : clientesQuery.data && clientesQuery.data.data.length > 0 ? (
            <>
              <div className="divide-y divide-border sm:hidden">
                {clientesQuery.data.data.map((cliente) => (
                  <div key={cliente.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {cliente.codigo}
                          </span>
                          <p className="truncate font-semibold">{cliente.nombre}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {cliente.ciRuc ?? cliente.telefono ?? "Sin documento"}
                        </p>
                        <p className="mt-1 text-sm">{cliente.direccion}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {cliente.medidor
                            ? `Medidor ${cliente.medidor.numeroSerie} · Inicial ${formatM3(cliente.medidor.lecturaInicial)}`
                            : "Sin medidor activo"}
                        </p>
                      </div>
                      <EstadoClienteBadge estado={cliente.estado} />
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetalleId(cliente.id)}
                      >
                        <Eye aria-hidden="true" />
                        Ver
                      </Button>
                      {esAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirEdicion(cliente)}
                          >
                            <Pencil aria-hidden="true" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClienteMedidor(cliente)}
                          >
                            <Gauge aria-hidden="true" />
                            Medidor
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Medidor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesQuery.data.data.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-mono text-xs">{cliente.codigo}</TableCell>
                        <TableCell>
                          <p className="font-medium">{cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.ciRuc ?? cliente.telefono ?? "Sin documento"}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {cliente.direccion}
                        </TableCell>
                        <TableCell>
                          {cliente.medidor ? (
                            <div>
                              <p className="font-mono text-xs">{cliente.medidor.numeroSerie}</p>
                              <p className="text-xs text-muted-foreground">
                                Inicial {formatM3(cliente.medidor.lecturaInicial)}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline">Sin medidor</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <EstadoClienteBadge estado={cliente.estado} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Ver ficha de ${cliente.nombre}`}
                              onClick={() => setDetalleId(cliente.id)}
                            >
                              <Eye aria-hidden="true" />
                            </Button>
                            {esAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Editar ${cliente.nombre}`}
                                  onClick={() => abrirEdicion(cliente)}
                                >
                                  <Pencil aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Instalar medidor a ${cliente.nombre}`}
                                  onClick={() => setClienteMedidor(cliente)}
                                >
                                  <Gauge aria-hidden="true" />
                                </Button>
                              </>
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
                  {clientesQuery.data.total} cliente(s)
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
              <Users className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">No hay clientes para este filtro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Probá con otro estado o registrá el primer cliente.
              </p>
              {esAdmin && (
                <Button className="mt-4" onClick={abrirNuevo}>
                  <Plus aria-hidden="true" />
                  Nuevo cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogForm && (
        <ClienteFormDialog
          cliente={clienteEditando}
          onClose={() => {
            setDialogForm(false);
            setClienteEditando(null);
          }}
        />
      )}

      {clienteMedidor && (
        <MedidorDialog
          cliente={clienteMedidor}
          onClose={() => setClienteMedidor(null)}
        />
      )}

      {detalleId !== null && (
        <ClienteDetalleDialog
          clienteId={detalleId}
          onClose={() => setDetalleId(null)}
          onEstadoCuenta={(id) => {
            setDetalleId(null);
            setCuentaId(id);
          }}
        />
      )}

      {cuentaId !== null && (
        <EstadoCuentaDialog
          clienteId={cuentaId}
          onClose={() => setCuentaId(null)}
        />
      )}
    </div>
  );
}
