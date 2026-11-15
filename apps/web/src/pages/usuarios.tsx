import {
  formatFecha,
  type Rol,
  type UsuarioListItem,
} from "@aguateria/shared";
import {
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
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
import {
  useActualizarUsuario,
  useCambiarEstadoUsuario,
  useCambiarPasswordUsuario,
  useCrearUsuario,
  useRevocarSesionesUsuario,
  useUsuarios,
} from "@/hooks/useUsuarios";
import { authClient } from "@/lib/auth-client";
import { mensajeError } from "@/lib/api";

const ROLES: Array<{ valor: Rol; etiqueta: string }> = [
  { valor: "admin", etiqueta: "Administrador" },
  { valor: "operador", etiqueta: "Operador" },
];

function RolBadge({ rol }: { rol: Rol }) {
  return (
    <Badge variant={rol === "admin" ? "default" : "secondary"}>
      {rol === "admin" ? "Administrador" : "Operador"}
    </Badge>
  );
}

function EstadoBadge({ usuario }: { usuario: UsuarioListItem }) {
  if (usuario.banned) {
    return (
      <Badge variant="destructive" title={usuario.banReason ?? undefined}>
        Desactivado
      </Badge>
    );
  }
  return <Badge variant="success">Activo</Badge>;
}

interface FormUsuario {
  name: string;
  username: string;
  password: string;
  role: Rol;
}

function UsuarioFormDialog({
  usuario,
  onClose,
}: {
  usuario: UsuarioListItem | null;
  onClose: () => void;
}) {
  const esEdicion = usuario !== null;
  const [form, setForm] = useState<FormUsuario>(() => ({
    name: usuario?.name ?? "",
    username: usuario?.username ?? "",
    password: "",
    role: usuario?.role ?? "operador",
  }));

  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const guardando = crear.isPending || actualizar.isPending;

  function actualizarCampo<K extends keyof FormUsuario>(
    campo: K,
    valor: FormUsuario[K],
  ) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombre = form.name.trim();
    const username = form.username.trim();

    if (nombre.length < 3) {
      toast.error("Ingresá el nombre completo");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      toast.error("El usuario debe tener entre 3 y 30 caracteres válidos");
      return;
    }

    if (!esEdicion && form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      if (usuario) {
        await actualizar.mutateAsync({
          id: usuario.id,
          input: { name: nombre, username, role: form.role },
        });
        toast.success("Usuario actualizado");
      } else {
        await crear.mutateAsync({
          name: nombre,
          username,
          password: form.password,
          role: form.role,
        });
        toast.success("Usuario creado");
      }
      onClose();
    } catch (error) {
      toast.error(`No se pudo guardar el usuario: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualizá los datos y el rol. La contraseña se cambia desde el botón de la llave."
              : "La cuenta se crea sin correo real: el acceso es con nombre de usuario y contraseña."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={guardar}>
          <DialogBody className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="usuario-nombre">Nombre completo</Label>
              <Input
                id="usuario-nombre"
                value={form.name}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => actualizarCampo("name", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usuario-username">Nombre de usuario</Label>
              <Input
                id="usuario-username"
                value={form.username}
                maxLength={30}
                autoComplete="off"
                placeholder="Ej. cobrador1"
                onChange={(event) => actualizarCampo("username", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se usa para iniciar sesión. Se guarda en minúsculas.
              </p>
            </div>

            {!esEdicion && (
              <div className="space-y-1.5">
                <Label htmlFor="usuario-password">Contraseña inicial</Label>
                <Input
                  id="usuario-password"
                  type="password"
                  value={form.password}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  onChange={(event) => actualizarCampo("password", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres. Pedile al usuario que la cambie después del primer ingreso.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="usuario-rol">Rol</Label>
              <Select
                id="usuario-rol"
                value={form.role}
                onChange={(event) =>
                  actualizarCampo("role", event.target.value as Rol)
                }
              >
                {ROLES.map((rol) => (
                  <option key={rol.valor} value={rol.valor}>
                    {rol.etiqueta}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Los administradores pueden gestionar usuarios, configuración, tarifas y anulaciones.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" aria-hidden="true" />}
              {esEdicion ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  usuario,
  onClose,
}: {
  usuario: UsuarioListItem;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const cambiar = useCambiarPasswordUsuario();

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== repetir) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      await cambiar.mutateAsync({ id: usuario.id, input: { newPassword: password } });
      toast.success("Contraseña actualizada.");
      onClose();
    } catch (error) {
      toast.error(`No se pudo cambiar la contraseña: ${mensajeError(error)}`);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            {usuario.name} ({usuario.username ?? usuario.email})
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={guardar}>
          <DialogBody className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="password-nueva">Nueva contraseña</Label>
              <Input
                id="password-nueva"
                type="password"
                value={password}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-repetir">Repetir contraseña</Label>
              <Input
                id="password-repetir"
                type="password"
                value={repetir}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                onChange={(event) => setRepetir(event.target.value)}
              />
            </div>
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Si cambiás la contraseña de otro usuario, se cerrarán todas sus sesiones activas.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cambiar.isPending}>
              {cambiar.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Guardar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsuariosPage() {
  const { data: sesion } = authClient.useSession();
  const usuarioActualId = sesion?.user.id;

  const usuariosQuery = useUsuarios();
  const cambiarEstado = useCambiarEstadoUsuario();
  const revocarSesiones = useRevocarSesionesUsuario();

  const [dialogForm, setDialogForm] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioListItem | null>(null);
  const [passwordUsuario, setPasswordUsuario] = useState<UsuarioListItem | null>(null);
  const [estadoObjetivo, setEstadoObjetivo] = useState<UsuarioListItem | null>(null);
  const [sesionesObjetivo, setSesionesObjetivo] = useState<UsuarioListItem | null>(null);

  const usuarios = usuariosQuery.data ?? [];
  const administradores = usuarios.filter(
    (usuario) => usuario.role === "admin" && !usuario.banned,
  ).length;
  const desactivados = usuarios.filter((usuario) => usuario.banned).length;

  function abrirNuevo() {
    setUsuarioEditando(null);
    setDialogForm(true);
  }

  function abrirEdicion(usuario: UsuarioListItem) {
    setUsuarioEditando(usuario);
    setDialogForm(true);
  }

  async function confirmarEstado() {
    if (!estadoObjetivo) return;

    try {
      await cambiarEstado.mutateAsync({
        id: estadoObjetivo.id,
        input: {
          activo: estadoObjetivo.banned,
          motivo: estadoObjetivo.banned
            ? undefined
            : "Desactivado por administrador",
        },
      });
      toast.success(
        estadoObjetivo.banned
          ? "Usuario reactivado"
          : "Usuario desactivado y sesiones cerradas",
      );
      setEstadoObjetivo(null);
    } catch (error) {
      toast.error(`No se pudo cambiar el estado: ${mensajeError(error)}`);
    }
  }

  async function confirmarRevocarSesiones() {
    if (!sesionesObjetivo) return;

    try {
      await revocarSesiones.mutateAsync(sesionesObjetivo.id);
      toast.success("Sesiones revocadas");
      setSesionesObjetivo(null);
    } catch (error) {
      toast.error(`No se pudieron revocar las sesiones: ${mensajeError(error)}`);
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Usuarios"
        descripcion="Cuentas de acceso, roles y contraseñas del sistema"
      >
        <Button onClick={abrirNuevo}>
          <Plus aria-hidden="true" />
          Nuevo usuario
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Usuarios</p>
              <p className="text-xl font-bold tabular-nums">{usuarios.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="grid size-10 place-items-center rounded-xl bg-success/10 text-success">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Administradores activos</p>
              <p className="text-xl font-bold tabular-nums">{administradores}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="grid size-10 place-items-center rounded-xl bg-warning/10 text-warning">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Desactivados</p>
              <p className="text-xl font-bold tabular-nums">{desactivados}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          {usuariosQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : usuariosQuery.isError ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No pudimos cargar los usuarios.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void usuariosQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => {
                    const esUnoMismo = usuario.id === usuarioActualId;

                    return (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <p className="font-medium">{usuario.name}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {usuario.username ?? "—"}
                          </span>
                          {esUnoMismo && (
                            <Badge variant="outline" className="ml-2">
                              Vos
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <RolBadge rol={usuario.role} />
                        </TableCell>
                        <TableCell>
                          <EstadoBadge usuario={usuario} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatFecha(usuario.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${usuario.name}`}
                              onClick={() => abrirEdicion(usuario)}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Cambiar contraseña de ${usuario.name}`}
                              onClick={() => setPasswordUsuario(usuario)}
                            >
                              <KeyRound aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Revocar sesiones de ${usuario.name}`}
                              onClick={() => setSesionesObjetivo(usuario)}
                            >
                              <LogOut aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                usuario.banned
                                  ? `Reactivar ${usuario.name}`
                                  : `Desactivar ${usuario.name}`
                              }
                              title={
                                esUnoMismo && !usuario.banned
                                  ? "No podés desactivar tu propio usuario"
                                  : undefined
                              }
                              disabled={esUnoMismo && !usuario.banned}
                              onClick={() => setEstadoObjetivo(usuario)}
                            >
                              {usuario.banned ? (
                                <UserCheck aria-hidden="true" />
                              ) : (
                                <UserX aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Recomendación: cambiá las contraseñas iniciales de <code>admin</code> y{" "}
        <code>operador</code> antes de usar el sistema en producción.
      </p>

      {dialogForm && (
        <UsuarioFormDialog
          usuario={usuarioEditando}
          onClose={() => {
            setDialogForm(false);
            setUsuarioEditando(null);
          }}
        />
      )}

      {passwordUsuario && (
        <PasswordDialog
          usuario={passwordUsuario}
          onClose={() => setPasswordUsuario(null)}
        />
      )}

      <ConfirmDialog
        open={estadoObjetivo !== null}
        onOpenChange={(abierto) => !abierto && setEstadoObjetivo(null)}
        titulo={estadoObjetivo?.banned ? "Reactivar usuario" : "Desactivar usuario"}
        descripcion={
          estadoObjetivo
            ? estadoObjetivo.banned
              ? `${estadoObjetivo.name} podrá volver a iniciar sesión con su contraseña actual.`
              : `${estadoObjetivo.name} no podrá iniciar sesión y se cerrarán todas sus sesiones activas.`
            : ""
        }
        confirmar={estadoObjetivo?.banned ? "Reactivar" : "Desactivar"}
        cargando={cambiarEstado.isPending}
        onConfirm={() => void confirmarEstado()}
      />

      <ConfirmDialog
        open={sesionesObjetivo !== null}
        onOpenChange={(abierto) => !abierto && setSesionesObjetivo(null)}
        titulo="Revocar sesiones"
        descripcion={
          sesionesObjetivo
            ? `${sesionesObjetivo.name} tendrá que volver a iniciar sesión en todos sus dispositivos.`
            : ""
        }
        confirmar="Revocar sesiones"
        cargando={revocarSesiones.isPending}
        onConfirm={() => void confirmarRevocarSesiones()}
      />
    </div>
  );
}
