import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  FileText,
  Gauge,
  LayoutDashboard,
  Settings,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  soloAdmin?: boolean;
}

export interface NavGroup {
  grupo: string;
  items: NavItem[];
}

export const navegacion: NavGroup[] = [
  {
    grupo: "Operación",
    items: [
      { href: "/", label: "Panel", icon: LayoutDashboard, exact: true },
      { href: "/lecturas", label: "Lecturas", icon: Gauge },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/cobranzas", label: "Cobranzas", icon: FileText },
    ],
  },
  {
    grupo: "Administración",
    items: [
      { href: "/periodos", label: "Períodos", icon: CalendarDays, soloAdmin: true },
      { href: "/tarifas", label: "Tarifas", icon: Tags, soloAdmin: true },
      { href: "/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/mora", label: "Mora y cortes", icon: AlertTriangle },
      { href: "/usuarios", label: "Usuarios", icon: UserCog, soloAdmin: true },
      { href: "/configuracion", label: "Configuración", icon: Settings, soloAdmin: true },
    ],
  },
];

export function tituloDeRuta(pathname: string): string {
  const item = navegacion.flatMap((grupo) => grupo.items).find((i) => i.href === pathname);
  return item?.label ?? "Aguatería";
}
