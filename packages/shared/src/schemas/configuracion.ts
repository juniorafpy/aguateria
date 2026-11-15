import { z } from "zod";
import { paginacionSchema } from "./common";

export const configuracionUpdateSchema = z.object({
  aguateriaNombre: z
    .string()
    .trim()
    .min(1, "Ingresá el nombre de la aguatería")
    .max(150),
  aguateriaDireccion: z.string().trim().max(200).default(""),
  aguateriaTelefono: z.string().trim().max(30).default(""),
  aguateriaRuc: z.string().trim().max(20).default(""),
  diaVencimiento: z.coerce
    .number()
    .int("El día de vencimiento debe ser un entero")
    .min(1, "El día debe estar entre 1 y 28")
    .max(28, "El día debe estar entre 1 y 28"),
  mesesParaCorte: z.coerce
    .number()
    .int("Los meses para corte deben ser un entero")
    .min(1, "Debe ser al menos 1 mes")
    .max(12, "No puede superar los 12 meses"),
  recargoMora: z.coerce
    .number()
    .int("El recargo debe ser un entero en Gs.")
    .min(0, "El recargo no puede ser negativo"),
});
export type ConfiguracionUpdateInput = z.infer<
  typeof configuracionUpdateSchema
>;

export const auditoriaQuerySchema = paginacionSchema.extend({
  accion: z.string().trim().max(50).optional(),
});
export type AuditoriaQuery = z.infer<typeof auditoriaQuerySchema>;
