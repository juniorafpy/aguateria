import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

// En Vercel Serverless se debe usar max: 1 para evitar saturar el pool y bloqueos de conexión
const isServerless = !!process.env.VERCEL;

const client = postgres(env.DATABASE_URL, {
  max: isServerless ? 1 : 10,
  // Supabase (PgBouncer) no soporta varias consultas pipelineadas sobre una
  // misma conexión: con max: 1 eso deja las peticiones colgadas hasta el timeout.
  max_pipeline: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Requerido para Supabase Transaction Pooler (puerto 6543 / 5432)
});

export const db = drizzle(client, { schema });
export { client };
