import { Hono } from "hono";
import { db } from "../db";
import {
  account,
  auditoria,
  cargosExtra,
  clientes,
  configuracion,
  facturas,
  lecturas,
  medidores,
  pagos,
  periodos,
  tarifaTramos,
  tarifas,
  user,
} from "../db/schema";
import { requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

export const backupRoutes = new Hono<AppEnv>();

backupRoutes.use("*", requireRole("admin"));

/**
 * Respaldo lógico en JSON para inspección y recuperación manual.
 * El respaldo restaurable con pg_restore se genera con apps/api/scripts/backup.*
 * o con el workflow diario de GitHub Actions.
 */
backupRoutes.get("/", async (c) => {
  const [
    usuarios,
    cuentas,
    clientesFilas,
    medidoresFilas,
    tarifasFilas,
    tarifaTramosFilas,
    periodosFilas,
    lecturasFilas,
    facturasFilas,
    pagosFilas,
    cargosFilas,
    configuracionFilas,
    auditoriaFilas,
  ] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username,
        displayUsername: user.displayUsername,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user),
    db
      .select({
        userId: account.userId,
        providerId: account.providerId,
        accountId: account.accountId,
        password: account.password,
      })
      .from(account),
    db.select().from(clientes),
    db.select().from(medidores),
    db.select().from(tarifas),
    db.select().from(tarifaTramos),
    db.select().from(periodos),
    db.select().from(lecturas),
    db.select().from(facturas),
    db.select().from(pagos),
    db.select().from(cargosExtra),
    db.select().from(configuracion),
    db.select().from(auditoria),
  ]);

  const snapshot = {
    version: 1,
    generadoEn: new Date().toISOString(),
    advertencia:
      "Respaldo lógico en JSON. Para restaurar la base completa usá el dump de pg_dump generado por el workflow o por pnpm backup.",
    tablas: {
      usuarios,
      cuentas,
      clientes: clientesFilas,
      medidores: medidoresFilas,
      tarifas: tarifasFilas,
      tarifaTramos: tarifaTramosFilas,
      periodos: periodosFilas,
      lecturas: lecturasFilas,
      facturas: facturasFilas,
      pagos: pagosFilas,
      cargosExtra: cargosFilas,
      configuracion: configuracionFilas,
      auditoria: auditoriaFilas,
    },
  };

  await db.insert(auditoria).values({
    usuarioId: c.get("user").id,
    accion: "descargar_respaldo",
    entidad: "sistema",
    detalle: {
      clientes: clientesFilas.length,
      facturas: facturasFilas.length,
      pagos: pagosFilas.length,
      usuarios: usuarios.length,
    },
  });

  const hoy = new Date().toISOString().slice(0, 10);
  c.header(
    "Content-Disposition",
    `attachment; filename="aguateria-respaldo-${hoy}.json"`,
  );

  return c.json(snapshot);
});
