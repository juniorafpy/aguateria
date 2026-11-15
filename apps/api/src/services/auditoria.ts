import type { AuditoriaItem } from "@aguateria/shared";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { auditoria } from "../db/schema/negocio";

export interface AuditoriaFiltros {
  page: number;
  size: number;
  accion?: string;
}

export interface AuditoriaListado {
  data: AuditoriaItem[];
  page: number;
  size: number;
  total: number;
}

export async function listarAuditoria(
  filtros: AuditoriaFiltros,
): Promise<AuditoriaListado> {
  const condiciones: SQL[] = [];

  if (filtros.accion) {
    condiciones.push(eq(auditoria.accion, filtros.accion));
  }

  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditoria)
    .where(where);

  const filas = await db
    .select({
      id: auditoria.id,
      fecha: auditoria.fecha,
      accion: auditoria.accion,
      entidad: auditoria.entidad,
      entidadId: auditoria.entidadId,
      detalle: auditoria.detalle,
      usuario: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
    })
    .from(auditoria)
    .leftJoin(user, eq(user.id, auditoria.usuarioId))
    .where(where)
    .orderBy(desc(auditoria.fecha), desc(auditoria.id))
    .limit(filtros.size)
    .offset((filtros.page - 1) * filtros.size);

  return {
    data: filas.map((fila) => ({
      id: fila.id,
      fecha: fila.fecha.toISOString(),
      accion: fila.accion,
      entidad: fila.entidad,
      entidadId: fila.entidadId,
      detalle: fila.detalle,
      usuario: fila.usuario?.id ? fila.usuario : null,
    })),
    page: filtros.page,
    size: filtros.size,
    total: conteo?.total ?? 0,
  };
}
