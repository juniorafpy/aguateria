import type { Rol } from "@aguateria/shared";
import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import type { AppEnv } from "../types";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const sesion = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!sesion) {
    return c.json({ error: "No autenticado" }, 401);
  }

  c.set("user", sesion.user);
  c.set("session", sesion.session);
  await next();
};

export function requireRole(...roles: Rol[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const usuario = c.get("user");

    if (!usuario || !roles.includes(usuario.role as Rol)) {
      return c.json({ error: "No tenés permiso para esta acción" }, 403);
    }

    await next();
  };
}
