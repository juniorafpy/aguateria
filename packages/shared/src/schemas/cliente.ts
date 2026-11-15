import { z } from "zod";
import { estadoClienteSchema, fechaSchema, paginacionSchema } from "./common";
import { medidorCreateSchema } from "./medidor";

export const clienteBaseSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(12, "El código no puede superar los 12 caracteres"),
  nombre: z.string().trim().min(3, "Ingresá el nombre del cliente").max(150),
  ciRuc: z.string().trim().max(20).optional().nullable(),
  telefono: z.string().trim().max(30).optional().nullable(),
  direccion: z.string().trim().min(3, "Ingresá la dirección o referencia").max(200),
  fechaAlta: fechaSchema,
  estado: estadoClienteSchema.default("activo"),
  observaciones: z.string().trim().max(1000).optional().nullable(),
});
export type ClienteBaseInput = z.infer<typeof clienteBaseSchema>;

export const clienteCreateSchema = clienteBaseSchema.extend({
  medidor: medidorCreateSchema.optional(),
});
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;

export const clienteUpdateSchema = clienteBaseSchema.partial();
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;

export const clienteQuerySchema = paginacionSchema.extend({
  q: z.string().trim().max(100).optional(),
  estado: estadoClienteSchema.optional(),
});
export type ClienteQuery = z.infer<typeof clienteQuerySchema>;

export interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  ciRuc: string | null;
  telefono: string | null;
  direccion: string;
  fechaAlta: string;
  estado: "activo" | "suspendido" | "baja";
  observaciones: string | null;
}
