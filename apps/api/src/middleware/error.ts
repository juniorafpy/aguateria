import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof ZodError) {
    return c.json({ error: "Datos inválidos", details: err.issues }, 400);
  }

  console.error("[api] error no controlado:", err);
  return c.json({ error: "Error interno del servidor" }, 500);
};
