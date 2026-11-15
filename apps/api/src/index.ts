import { serve } from "@hono/node-server";
import app from "./app";
import { env } from "./env";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API de Aguatería escuchando en http://localhost:${info.port}`);
});
