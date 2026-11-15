/** Detecta una violación de índice único de PostgreSQL (código 23505). */
export function esViolacionUnica(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && (error as { code?: unknown }).code === "23505";
}

/** Detecta una violación de clave foránea de PostgreSQL (código 23503). */
export function esViolacionForanea(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && (error as { code?: unknown }).code === "23503";
}
