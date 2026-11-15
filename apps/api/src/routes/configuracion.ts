import { configuracionUpdateSchema } from "@aguateria/shared";
import { Hono } from "hono";
import { requireRole } from "../middleware/auth";
import {
  guardarConfiguracion,
  obtenerConfiguracion,
} from "../services/configuracion";
import type { AppEnv } from "../types";
import { parseJson } from "./helpers";

export const configuracionRoutes = new Hono<AppEnv>();

configuracionRoutes.use("*", requireRole("admin"));

configuracionRoutes.get("/", async (c) => {
  return c.json(await obtenerConfiguracion());
});

configuracionRoutes.put("/", async (c) => {
  const body = await parseJson(c, configuracionUpdateSchema);
  if (body instanceof Response) return body;

  const usuarioId = c.get("user").id;
  return c.json(await guardarConfiguracion(body, usuarioId));
});
