import { loginSchema, type LoginInput } from "@aguateria/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Gauge,
  Loader2,
  LockKeyhole,
  ReceiptText,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Brand } from "@/components/brand";
import { PantallaCarga } from "@/components/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const beneficios = [
  { icon: Gauge, texto: "Cargá las lecturas del mes desde el celular" },
  { icon: ReceiptText, texto: "Generá recibos con el detalle del cálculo" },
  { icon: Wallet, texto: "Controlá pagos, deudas y morosos en un lugar" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { data: sesion, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (sesion) navigate("/", { replace: true });
  }, [sesion, navigate]);

  async function onSubmit(values: LoginInput) {
    setError(null);
    setEnviando(true);

    try {
      const { error: authError } = await authClient.signIn.username({
        username: values.username,
        password: values.password,
      });

      if (authError) {
        setError(authError.message ?? "Usuario o contraseña incorrectos");
        return;
      }

      navigate("/", { replace: true });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  if (isPending) return <PantallaCarga />;

  const errores = form.formState.errors;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#072f47] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-sky-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <Brand variant="light" />
        </div>

        <div className="relative max-w-lg">
          <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
            Sistema interno
          </Badge>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight">
            El agua de tu comunidad, bajo control.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-sky-100/80">
            Lecturas, facturación y cobros en un solo lugar. Simple para el día a día, claro para
            rendir cuentas.
          </p>

          <ul className="mt-9 space-y-4">
            {beneficios.map((beneficio) => (
              <li key={beneficio.texto} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
                  <beneficio.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-sky-50/90">{beneficio.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sky-100/50">
          Aguatería San Blas · Gestión comunitaria del agua
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá con el usuario que te asignó el administrador.
          </p>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Tu usuario"
                  className="pl-9"
                  aria-invalid={Boolean(errores.username)}
                  {...form.register("username")}
                />
              </div>
              {errores.username && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errores.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="pl-9 pr-11"
                  aria-invalid={Boolean(errores.password)}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((valor) => !valor)}
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errores.password && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errores.password.message}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Ingresando…
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Acceso de prueba</p>
              <p className="mt-1">
                Admin: <span className="font-mono">admin / admin1234</span>
              </p>
              <p>
                Operador: <span className="font-mono">operador / operador1234</span>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿Olvidaste tu contraseña? Contactá al administrador.
          </p>
        </div>
      </section>
    </div>
  );
}
