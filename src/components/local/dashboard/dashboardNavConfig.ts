import {
  BarChart3,
  House,
  PlusCircle,
  QrCode,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavKey =
  | "inicio"
  | "estadisticas"
  | "escanear"
  | "crear"
  | "perfil";

export type DashboardNavItem = {
  href: string;
  label: string;
  key: DashboardNavKey;
  icon: LucideIcon;
  primary?: boolean;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard", label: "Inicio", key: "inicio", icon: House },
  {
    href: "/dashboard/beneficios/nuevo",
    label: "Crear",
    key: "crear",
    icon: PlusCircle,
  },
  {
    href: "/dashboard/escanear",
    label: "QR",
    key: "escanear",
    icon: QrCode,
    primary: true,
  },
  {
    href: "/dashboard/estadisticas",
    label: "Estadísticas",
    key: "estadisticas",
    icon: BarChart3,
  },
  {
    href: "/dashboard/perfil",
    label: "Perfil",
    key: "perfil",
    icon: UserRound,
  },
];

export function getDashboardActiveKey(pathname: string): DashboardNavKey {
  if (pathname === "/dashboard/escanear") return "escanear";
  if (pathname === "/dashboard/beneficios/nuevo") return "crear";
  if (pathname.startsWith("/dashboard/beneficios/")) return "inicio";
  if (pathname === "/dashboard/perfil") return "perfil";
  if (pathname === "/dashboard/estadisticas") return "estadisticas";
  return "inicio";
}
