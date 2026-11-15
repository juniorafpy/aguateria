import type { DashboardResumen } from "@aguateria/shared";
import { api } from "@/lib/api";

export async function obtenerDashboard(): Promise<DashboardResumen> {
  const { data } = await api.get<DashboardResumen>("/dashboard");
  return data;
}
