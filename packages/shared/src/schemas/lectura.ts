import { z } from "zod";
import { fechaSchema, idSchema } from "./common";

export const lecturaUpsertSchema = z.object({
  periodoId: idSchema,
  clienteId: idSchema,
  medidorId: idSchema.optional(),
  lecturaActual: z.coerce
    .number()
    .min(0, "La lectura no puede ser negativa")
    .max(99_999_999.99, "La lectura es demasiado grande"),
  fechaLectura: fechaSchema,
  observacion: z.string().trim().max(500).optional().nullable(),
});
export type LecturaUpsertInput = z.infer<typeof lecturaUpsertSchema>;

export const lecturaQuerySchema = z.object({
  periodoId: idSchema.optional(),
  q: z.string().trim().max(100).optional(),
  estado: z.enum(["todas", "pendientes", "cargadas"]).default("todas"),
});
export type LecturaQuery = z.infer<typeof lecturaQuerySchema>;
