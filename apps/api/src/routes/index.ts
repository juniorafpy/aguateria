import { Hono } from "hono";
import type { AppEnv } from "../types";
import { clientesRoutes } from "./clientes";
import { configuracionRoutes } from "./configuracion";
import { dashboardRoutes } from "./dashboard";
import { auditoriaRoutes } from "./auditoria";
import { lecturasRoutes } from "./lecturas";
import { periodosRoutes } from "./periodos";
import { tarifasRoutes } from "./tarifas";
import { facturasRoutes } from "./facturas";
import { pagosRoutes } from "./pagos";
import { reportesRoutes } from "./reportes";
import { usuariosRoutes } from "./usuarios";
import { cargosRoutes } from "./cargos";
import { moraRoutes } from "./mora";
import { backupRoutes } from "./backup";

const api = new Hono<AppEnv>();

api.get("/me", (c) => {
  const user = c.get("user");
  return c.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  });
});

api.route("/dashboard", dashboardRoutes);
api.route("/clientes", clientesRoutes);
api.route("/periodos", periodosRoutes);
api.route("/lecturas", lecturasRoutes);
api.route("/tarifas", tarifasRoutes);
api.route("/facturas", facturasRoutes);
api.route("/pagos", pagosRoutes);
api.route("/reportes", reportesRoutes);
api.route("/configuracion", configuracionRoutes);
api.route("/auditoria", auditoriaRoutes);
api.route("/usuarios", usuariosRoutes);
api.route("/cargos", cargosRoutes);
api.route("/mora", moraRoutes);
api.route("/backup", backupRoutes);

export default api;
