import { auditoriaQuerySchema } from "@aguateria/shared";
import { Hono } from "hono";
import { requireRole } from "../middleware/auth";
import { listarAuditoria } from "../services/auditoria";
import type { AppEnv } from "../types";
import { parseQuery } from "./helpers";

export const auditoriaRoutes = new Hono<AppEnv>();

auditoriaRoutes.use("*", requireRole("admin"));

auditoriaRoutes.get("/", async (c) => {
  const query = parseQuery(c, auditoriaQuerySchema);
  if (query instanceof Response) return query;

  return c.json(await listarAuditoria(query));
});
