import {
  idSchema,
  pagoAnularSchema,
  pagoCierreQuerySchema,
  pagoCreateSchema,
  pagoQuerySchema,
} from "@aguateria/shared";
import { Hono } from "hono";
import { requireRole } from "../middleware/auth";
import {
  anularPago,
  listarPagos,
  obtenerCierreCaja,
  PagoError,
  registrarPago,
} from "../services/pagos";
import type { AppEnv } from "../types";
import { parseJson, parseQuery } from "./helpers";

export const pagosRoutes = new Hono<AppEnv>();

pagosRoutes.get("/cierre", async (c) => {
  const query = parseQuery(c, pagoCierreQuerySchema);
  if (query instanceof Response) return query;

  if (query.desde > query.hasta) {
    return c.json({ error: "El rango de fechas es inválido" }, 400);
  }

  const cierre = await obtenerCierreCaja(query.desde, query.hasta);
  return c.json(cierre);
});

pagosRoutes.get("/", async (c) => {
  const query = parseQuery(c, pagoQuerySchema);
  if (query instanceof Response) return query;

  const resultado = await listarPagos(query);
  return c.json(resultado);
});

pagosRoutes.post("/", async (c) => {
  const body = await parseJson(c, pagoCreateSchema);
  if (body instanceof Response) return body;

  const usuarioId = c.get("user").id;

  try {
    const resultado = await registrarPago(body, usuarioId);
    return c.json(resultado, 201);
  } catch (error) {
    if (error instanceof PagoError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

pagosRoutes.post("/:id/anular", requireRole("admin"), async (c) => {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ error: "Id inválido" }, 400);

  let motivo: string | undefined;
  if (c.req.header("content-type")?.includes("application/json")) {
    const body = await parseJson(c, pagoAnularSchema);
    if (body instanceof Response) return body;
    motivo = body.motivo;
  }

  const usuarioId = c.get("user").id;

  try {
    const pago = await anularPago(parsed.data, usuarioId, motivo);
    return c.json(pago);
  } catch (error) {
    if (error instanceof PagoError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});
