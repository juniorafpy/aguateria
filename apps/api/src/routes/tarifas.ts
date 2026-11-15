import {
  formatFecha,
  hoyAsuncion,
  sumarDias,
  tarifaCreateSchema,
  tarifaSimularSchema,
  type SimulacionTarifa,
  type Tarifa,
  type TarifaTramo,
} from "@aguateria/shared";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { tarifaTramos, tarifas } from "../db/schema";
import { requireRole } from "../middleware/auth";
import { calcularMonto } from "../services/tarifas";
import {
  aTarifaInput,
  aTarifaResumen,
  obtenerTarifaEnFecha,
  obtenerTarifaPorId,
} from "../services/tarifa-vigente";
import type { AppEnv } from "../types";
import { parseJson } from "./helpers";

export const tarifasRoutes = new Hono<AppEnv>();

tarifasRoutes.get("/", async (c) => {
  const todas = await db
    .select()
    .from(tarifas)
    .orderBy(desc(tarifas.vigenteDesde), desc(tarifas.id));

  const tramos = await db
    .select()
    .from(tarifaTramos)
    .orderBy(asc(tarifaTramos.desdeM3));

  const tramosPorTarifa = new Map<number, TarifaTramo[]>();

  for (const tramo of tramos) {
    const lista = tramosPorTarifa.get(tramo.tarifaId) ?? [];
    lista.push({
      id: tramo.id,
      desdeM3: tramo.desdeM3,
      hastaM3: tramo.hastaM3,
      precioM3: tramo.precioM3,
    });
    tramosPorTarifa.set(tramo.tarifaId, lista);
  }

  const data: Tarifa[] = todas.map((tarifa) => ({
    id: tarifa.id,
    nombre: tarifa.nombre,
    vigenteDesde: tarifa.vigenteDesde,
    vigenteHasta: tarifa.vigenteHasta,
    cargoFijo: tarifa.cargoFijo,
    m3Incluidos: tarifa.m3Incluidos,
    tramos: tramosPorTarifa.get(tarifa.id) ?? [],
  }));

  return c.json({ data });
});

tarifasRoutes.get("/vigente", async (c) => {
  const tarifa = await obtenerTarifaEnFecha(hoyAsuncion());
  if (!tarifa) return c.json({ error: "No hay una tarifa vigente" }, 404);

  const respuesta: Tarifa = {
    ...aTarifaResumen(tarifa),
    vigenteDesde: tarifa.vigenteDesde,
    vigenteHasta: tarifa.vigenteHasta,
  };

  return c.json(respuesta);
});

tarifasRoutes.post("/", requireRole("admin"), async (c) => {
  const body = await parseJson(c, tarifaCreateSchema);
  if (body instanceof Response) return body;

  const [vigente] = await db
    .select()
    .from(tarifas)
    .where(isNull(tarifas.vigenteHasta))
    .orderBy(desc(tarifas.vigenteDesde))
    .limit(1);

  if (vigente && body.vigenteDesde <= vigente.vigenteDesde) {
    return c.json(
      {
        error: `La nueva tarifa debe comenzar después del ${formatFecha(vigente.vigenteDesde)}.`,
      },
      409,
    );
  }

  const creada = await db.transaction(async (tx) => {
    if (vigente) {
      await tx
        .update(tarifas)
        .set({ vigenteHasta: sumarDias(body.vigenteDesde, -1) })
        .where(eq(tarifas.id, vigente.id));
    }

    const [nueva] = await tx
      .insert(tarifas)
      .values({
        nombre: body.nombre,
        vigenteDesde: body.vigenteDesde,
        vigenteHasta: null,
        cargoFijo: body.cargoFijo,
        m3Incluidos: body.m3Incluidos.toFixed(2),
      })
      .returning();

    if (!nueva) throw new Error("No se pudo crear la tarifa");

    const tramosCreados = await tx
      .insert(tarifaTramos)
      .values(
        body.tramos.map((tramo) => ({
          tarifaId: nueva.id,
          desdeM3: tramo.desdeM3.toFixed(2),
          hastaM3: tramo.hastaM3 === null ? null : tramo.hastaM3.toFixed(2),
          precioM3: tramo.precioM3,
        })),
      )
      .returning();

    return { ...nueva, tramos: tramosCreados };
  });

  const respuesta: Tarifa = {
    ...aTarifaResumen(creada),
    vigenteDesde: creada.vigenteDesde,
    vigenteHasta: creada.vigenteHasta,
  };

  return c.json(respuesta, 201);
});

tarifasRoutes.post("/simular", async (c) => {
  const body = await parseJson(c, tarifaSimularSchema);
  if (body instanceof Response) return body;

  const tarifa = body.tarifaId
    ? await obtenerTarifaPorId(body.tarifaId)
    : await obtenerTarifaEnFecha(hoyAsuncion());

  if (!tarifa) return c.json({ error: "No hay una tarifa vigente" }, 404);

  const calculo = calcularMonto(aTarifaInput(tarifa), body.consumoM3);

  const respuesta: SimulacionTarifa = {
    tarifa: aTarifaResumen(tarifa),
    calculo,
  };

  return c.json(respuesta);
});
