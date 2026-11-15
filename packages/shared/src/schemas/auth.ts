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

export interface UsuarioSesion {
  id: string;
  name: string;
  username: string | null;
  role: "admin" | "operador";
  banned?: boolean;
}
