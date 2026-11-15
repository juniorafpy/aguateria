import { Gauge, LayoutDashboard, Menu, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { navegacion, tituloDeRuta, type NavGroup } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

function NavLinks({ grupos, onNavigate }: { grupos: NavGroup[]; onNavigate?: () => void }) {
  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo.grupo}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {grupo.grupo}
          </p>
          <ul className="space-y-1">
            {grupo.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.exact}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const items = [
    { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
    { href: "/lecturas", label: "Lecturas", icon: Gauge },
    { href: "/cobranzas", label: "Cobranzas", icon: Wallet },
    { href: "/clientes", label: "Clientes", icon: Users },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegación rápida"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              to={item.href}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>Más</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function AppShell() {
  const { data: sesion } = authClient.useSession();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esAdmin = sesion?.user.role === "admin";
  const grupos = navegacion
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => !item.soloAdmin || esAdmin),
    }))
    .filter((grupo) => grupo.items.length > 0);

  const usuario = sesion?.user;

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
          <NavLinks grupos={grupos} />
        </nav>
        {usuario && (
          <div className="border-t border-sidebar-border p-3">
            <UserMenu name={usuario.name ?? "Usuario"} role={usuario.role ?? "operador"} />
          </div>
        )}
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </Button>
          <div className="md:hidden">
            <Brand compact />
          </div>
          <p className="hidden text-sm font-semibold md:block">{tituloDeRuta(location.pathname)}</p>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {usuario && (
              <div className="hidden sm:block">
                <UserMenu
                  name={usuario.name ?? "Usuario"}
                  role={usuario.role ?? "operador"}
                  compact
                />
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNav onMore={() => setMenuAbierto(true)} />

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="flex h-16 items-center border-b border-border px-5">
            <Brand />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación móvil">
            <NavLinks grupos={grupos} onNavigate={() => setMenuAbierto(false)} />
          </nav>
          {usuario && (
            <div className="border-t border-border p-3">
              <UserMenu name={usuario.name ?? "Usuario"} role={usuario.role ?? "operador"} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
