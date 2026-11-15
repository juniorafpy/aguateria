import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

try {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
} catch {
  // Ignorar si no existe en producción
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET debe tener al menos 32 caracteres"),
  BETTER_AUTH_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:", parsed.error.format());
  throw new Error("Variables de entorno inválidas");
}

const authUrl =
  parsed.data.BETTER_AUTH_URL ||
  (parsed.data.VERCEL_URL ? `https://${parsed.data.VERCEL_URL}` : "http://localhost:3001");

export const env = {
  ...parsed.data,
  BETTER_AUTH_URL: authUrl,
  corsOrigins: [
    ...parsed.data.CORS_ORIGINS.split(",")
      .map((origen) => origen.trim())
      .filter(Boolean),
    ...(parsed.data.VERCEL_URL ? [`https://${parsed.data.VERCEL_URL}`] : []),
  ],
};
