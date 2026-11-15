import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { env } from "./env";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import api from "./routes";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use(logger());

app.use(
  "/api/*",
  cors({
    origin: env.corsOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true, servicio: "aguateria-api" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/api/v1/*", requireAuth);
app.route("/api/v1", api);

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API de Aguatería escuchando en http://localhost:${info.port}`);
});
