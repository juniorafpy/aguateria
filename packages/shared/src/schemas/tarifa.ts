import { z } from "zod";
import { fechaSchema, idSchema } from "./common";

export const tarifaTramoCreateSchema = z.object({
  desdeM3: z.coerce.number().min(0, "El desde no puede ser negativo"),
  hastaM3: z.union([z.null(), z.coerce.number().min(0, "El hasta no puede ser negativo")]),
  precioM3: z.coerce.number().int("El precio debe ser un entero en Gs.").min(0),
});
export type TarifaTramoCreateInput = z.infer<typeof tarifaTramoCreateSchema>;

export const tarifaCreateSchema = z
  .object({
    nombre: z.string().trim().min(3, "Ingresá un nombre para la tarifa").max(100),
    vigenteDesde: fechaSchema,
    cargoFijo: z.coerce
      .number()
      .int("El cargo fijo debe ser un entero en Gs.")
      .min(0, "El cargo fijo no puede ser negativo"),
    m3Incluidos: z.coerce.number().min(0, "Los m³ incluidos no pueden ser negativos"),
    tramos: z.array(tarifaTramoCreateSchema).min(1, "Agregá al menos un tramo"),
  })
  .superRefine((tarifa, ctx) => {
    validarTramosTarifa(tarifa.tramos, ctx);
  });
export type TarifaCreateInput = z.infer<typeof tarifaCreateSchema>;

export const tarifaSimularSchema = z.object({
  consumoM3: z.coerce
    .number()
    .min(0, "El consumo no puede ser negativo")
    .max(99_999_999.99, "El consumo es demasiado grande"),
  tarifaId: idSchema.optional(),
});
export type TarifaSimularInput = z.infer<typeof tarifaSimularSchema>;

/**
 * Los tramos deben empezar en 0, ser contiguos y solo el último puede quedar
 * abierto (hastaM3 = null). Así el cálculo nunca deja m³ sin precio.
 */
export function validarTramosTarifa(
  tramos: Array<{ desdeM3: number; hastaM3: number | null }>,
  ctx: z.RefinementCtx,
): void {
  let esperado = 0;

  tramos.forEach((tramo, indice) => {
    if (Math.abs(tramo.desdeM3 - esperado) > 0.001) {
      ctx.addIssue({
        code: "custom",
        path: ["tramos", indice, "desdeM3"],
        message: `El tramo debe comenzar en ${esperado} m³`,
      });
    }

    if (tramo.hastaM3 !== null && tramo.hastaM3 <= tramo.desdeM3) {
      ctx.addIssue({
        code: "custom",
        path: ["tramos", indice, "hastaM3"],
        message: "El hasta debe ser mayor que el desde",
      });
    }

    if (tramo.hastaM3 === null && indice !== tramos.length - 1) {
      ctx.addIssue({
        code: "custom",
        path: ["tramos", indice, "hastaM3"],
        message: "Solo el último tramo puede quedar sin límite",
      });
    }

    if (tramo.hastaM3 !== null) {
      esperado = tramo.hastaM3;
    }
  });
}
