import { z } from "zod";
import { estadoFacturaSchema, fechaSchema, idSchema } from "./common";

export const facturaQuerySchema = z.object({
  periodoId: idSchema.optional(),
  clienteId: idSchema.optional(),
  estado: estadoFacturaSchema.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type FacturaQuery = z.infer<typeof facturaQuerySchema>;

export const facturaPreviewQuerySchema = z.object({
  periodoId: idSchema,
});
export type FacturaPreviewQuery = z.infer<typeof facturaPreviewQuerySchema>;

export const facturaRecibosQuerySchema = z.object({
  periodoId: idSchema,
});
export type FacturaRecibosQuery = z.infer<typeof facturaRecibosQuerySchema>;

export const pagoCreateSchema = z.object({
  /** Si se omite, el pago se aplica FIFO a las facturas pendientes del cliente. */
  facturaId: idSchema.optional(),
  clienteId: idSchema.optional(),
  fecha: fechaSchema.optional(),
  monto: z.coerce.number().int().positive("El monto debe ser mayor a 0"),
  metodo: z.enum(["efectivo", "transferencia", "otro"]),
  referencia: z.string().trim().max(200).optional(),
});
export type PagoCreateInput = z.infer<typeof pagoCreateSchema>;

export const pagoAnularSchema = z.object({
  motivo: z.string().trim().max(200).optional(),
});
export type PagoAnularInput = z.infer<typeof pagoAnularSchema>;

export const pagoQuerySchema = z.object({
  clienteId: idSchema.optional(),
  facturaId: idSchema.optional(),
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type PagoQuery = z.infer<typeof pagoQuerySchema>;

export const pagoCierreQuerySchema = z.object({
  desde: fechaSchema,
  hasta: fechaSchema,
});
export type PagoCierreQuery = z.infer<typeof pagoCierreQuerySchema>;
