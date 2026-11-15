import { Hono } from "hono";
import { obtenerReporteMora } from "../services/mora";
import type { AppEnv } from "../types";

export const moraRoutes = new Hono<AppEnv>();

moraRoutes.get("/", async (c) => {
  return c.json(await obtenerReporteMora());
});

moraRoutes.get("/candidatos", async (c) => {
  return c.json(await obtenerReporteMora());
});
