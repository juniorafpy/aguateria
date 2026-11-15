import { z } from "zod";

export const estadoClienteSchema = z.enum(["activo", "suspendido", "baja"]);
export type EstadoCliente = z.infer<typeof estadoClienteSchema>;

export const estadoPeriodoSchema = z.enum(["abierto", "facturado", "cerrado"]);
export type EstadoPeriodo = z.infer<typeof estadoPeriodoSchema>;

export const estadoFacturaSchema = z.enum(["pendiente", "parcial", "pagada", "anulada"]);
export type EstadoFactura = z.infer<typeof estadoFacturaSchema>;

export const metodoPagoSchema = z.enum(["efectivo", "transferencia", "otro"]);
export type MetodoPago = z.infer<typeof metodoPagoSchema>;

export const rolSchema = z.enum(["admin", "operador"]);
export type Rol = z.infer<typeof rolSchema>;

export const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato aaaa-mm-dd");

export const idSchema = z.coerce.number().int().positive("El id debe ser un número positivo");

export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

export const periodoQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});

export const periodoCreateSchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  fechaVencimiento: fechaSchema,
});
export type PeriodoCreateInput = z.infer<typeof periodoCreateSchema>;

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  size: number;
  total: number;
}
