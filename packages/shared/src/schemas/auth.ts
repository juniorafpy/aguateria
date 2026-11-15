import { z } from "zod";
import { rolSchema } from "./common";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede superar los 30 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const usuarioCreateSchema = z.object({
  name: z.string().trim().min(3, "Ingresá el nombre completo").max(120),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  role: rolSchema.default("operador"),
});
export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;

export const usuarioUpdateSchema = z
  .object({
    name: z.string().trim().min(3, "Ingresá el nombre completo").max(120).optional(),
    username: z
      .string()
      .trim()
      .min(3, "El usuario debe tener al menos 3 caracteres")
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo")
      .optional(),
    role: rolSchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "No hay cambios para guardar",
  });
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

export const usuarioPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede superar los 72 caracteres"),
});
export type UsuarioPasswordInput = z.infer<typeof usuarioPasswordSchema>;

export const usuarioEstadoSchema = z.object({
  activo: z.boolean(),
  motivo: z.string().trim().max(200).optional(),
});
export type UsuarioEstadoInput = z.infer<typeof usuarioEstadoSchema>;

export interface UsuarioSesion {
  id: string;
  name: string;
  username: string | null;
  role: "admin" | "operador";
  banned?: boolean;
}
