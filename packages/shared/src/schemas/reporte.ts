import { z } from "zod";
import { fechaSchema, idSchema } from "./common";

export const reporteFormatoSchema = z.object({
  formato: z.enum(["json", "csv"]).default("json"),
});
export type ReporteFormato = z.infer<typeof reporteFormatoSchema>;

export const reporteConsumoQuerySchema = reporteFormatoSchema.extend({
  periodoId: idSchema.optional(),
});
export type ReporteConsumoQuery = z.infer<typeof reporteConsumoQuerySchema>;

export const reporteRecaudacionQuerySchema = reporteFormatoSchema.extend({
  desde: fechaSchema,
  hasta: fechaSchema,
});
export type ReporteRecaudacionQuery = z.infer<
  typeof reporteRecaudacionQuerySchema
>;
