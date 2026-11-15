import { z } from "zod";
import { fechaSchema } from "./common";

export const medidorCreateSchema = z.object({
  numeroSerie: z
    .string()
    .trim()
    .min(1, "El número de serie es obligatorio")
    .max(50, "El número de serie no puede superar los 50 caracteres"),
  lecturaInicial: z.coerce
    .number()
    .min(0, "La lectura inicial no puede ser negativa")
    .max(99_999_999.99, "La lectura inicial es demasiado grande"),
  fechaInstalacion: fechaSchema,
});
export type MedidorCreateInput = z.infer<typeof medidorCreateSchema>;
