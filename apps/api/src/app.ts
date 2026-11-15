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
    origin: (origin) => {
      if (!origin) return "*";
      if (env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
        return origin;
      }
      return origin;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true, servicio: "aguateria-api" }));
app.get("/api/health", (c) => c.json({ ok: true, servicio: "aguateria-api" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/api/v1/*", requireAuth);
app.route("/api/v1", api);

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));

export default app;
