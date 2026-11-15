import type { TarifaResumen } from "@aguateria/shared";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { tarifaTramos, tarifas } from "../db/schema";
import type { TarifaInput } from "./tarifas";

export interface TarifaConTramos {
  id: number;
  nombre: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  cargoFijo: number;
  m3Incluidos: string;
  tramos: Array<{
    id: number;
    desdeM3: string;
    hastaM3: string | null;
    precioM3: number;
  }>;
}

/** Busca la tarifa vigente en una fecha determinada (inclusive). */
export async function obtenerTarifaEnFecha(fecha: string): Promise<TarifaConTramos | null> {
  const [tarifa] = await db
    .select()
    .from(tarifas)
    .where(
      and(
        lte(tarifas.vigenteDesde, fecha),
        or(isNull(tarifas.vigenteHasta), gte(tarifas.vigenteHasta, fecha)),
      ),
    )
    .orderBy(desc(tarifas.vigenteDesde), desc(tarifas.id))
    .limit(1);

  if (!tarifa) return null;

  const tramos = await db
    .select()
    .from(tarifaTramos)
    .where(eq(tarifaTramos.tarifaId, tarifa.id))
    .orderBy(asc(tarifaTramos.desdeM3));

  return { ...tarifa, tramos };
}

/** Busca una tarifa por id, con sus tramos. */
export async function obtenerTarifaPorId(id: number): Promise<TarifaConTramos | null> {
  const [tarifa] = await db.select().from(tarifas).where(eq(tarifas.id, id)).limit(1);
  if (!tarifa) return null;

  const tramos = await db
    .select()
    .from(tarifaTramos)
    .where(eq(tarifaTramos.tarifaId, tarifa.id))
    .orderBy(asc(tarifaTramos.desdeM3));

  return { ...tarifa, tramos };
}

export function aTarifaResumen(tarifa: TarifaConTramos): TarifaResumen {
  return {
    id: tarifa.id,
    nombre: tarifa.nombre,
    cargoFijo: tarifa.cargoFijo,
    m3Incluidos: tarifa.m3Incluidos,
    tramos: tarifa.tramos.map((tramo) => ({
      id: tramo.id,
      desdeM3: tramo.desdeM3,
      hastaM3: tramo.hastaM3,
      precioM3: tramo.precioM3,
    })),
  };
}

export function aTarifaInput(tarifa: TarifaConTramos): TarifaInput {
  return {
    cargoFijo: tarifa.cargoFijo,
    m3Incluidos: tarifa.m3Incluidos,
    tramos: tarifa.tramos.map((tramo) => ({
      desdeM3: tramo.desdeM3,
      hastaM3: tramo.hastaM3,
      precioM3: tramo.precioM3,
    })),
  };
}
