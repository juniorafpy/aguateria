import type { Context } from "hono";
import type { z } from "zod";

/** Parsea y valida el cuerpo JSON. Devuelve una Response 400 si no es válido. */
export async function parseJson<T>(
  c: Context,
  schema: z.ZodType<T>,
): Promise<T | Response> {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.issues }, 400);
  }

  return parsed.data;
}

/** Parsea y valida los query params. Devuelve una Response 400 si no son válidos. */
export function parseQuery<T>(c: Context, schema: z.ZodType<T>): T | Response {
  const query: unknown = c.req.query();
  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.issues }, 400);
  }

  return parsed.data;
}
