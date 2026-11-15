import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { AdminRoute, ProtectedRoute } from "@/components/protected-route";
import { ClientesPage } from "@/pages/clientes";
import { CobranzasPage } from "@/pages/cobranzas";
import { ConfiguracionPage } from "@/pages/configuracion";
import { DashboardPage } from "@/pages/dashboard";
import { LecturasPage } from "@/pages/lecturas";
import { LoginPage } from "@/pages/login";
import { MoraPage } from "@/pages/mora";
import { PeriodosPage } from "@/pages/periodos";
import { ReportesPage } from "@/pages/reportes";
import { TarifasPage } from "@/pages/tarifas";
import { UsuariosPage } from "@/pages/usuarios";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="lecturas" element={<LecturasPage />} />
            <Route path="cobranzas" element={<CobranzasPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="mora" element={<MoraPage />} />

            <Route element={<AdminRoute />}>
              <Route path="periodos" element={<PeriodosPage />} />
              <Route path="tarifas" element={<TarifasPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="configuracion" element={<ConfiguracionPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
