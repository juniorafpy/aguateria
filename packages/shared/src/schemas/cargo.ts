import { z } from "zod";
import { fechaSchema, idSchema, paginacionSchema } from "./common";

export const cargoEstadoSchema = z.enum(["pendiente", "facturado", "anulado"]);
export type CargoEstado = z.infer<typeof cargoEstadoSchema>;

export const cargoCreateSchema = z.object({
  clienteId: idSchema,
  concepto: z
    .string()
    .trim()
    .min(3, "Describí el motivo del cargo")
    .max(150, "El concepto no puede superar los 150 caracteres"),
  monto: z.coerce
    .number()
    .int("El monto debe ser un entero en Gs.")
    .positive("El monto debe ser mayor a 0")
    .max(1_000_000_000, "El monto es demasiado alto"),
  fecha: fechaSchema,
});
export type CargoCreateInput = z.infer<typeof cargoCreateSchema>;

export const cargoQuerySchema = paginacionSchema.extend({
  clienteId: z.coerce.number().int().positive().optional(),
  estado: cargoEstadoSchema.optional(),
});
export type CargoQuery = z.infer<typeof cargoQuerySchema>;
