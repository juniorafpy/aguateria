import {
  consumoEsAtipico,
  fechaFinMes,
  lecturaQuerySchema,
  lecturaUpsertSchema,
  type LecturaFila,
  type LecturaGuardada,
  type LecturasPeriodo,
  type Periodo,
  type TarifaResumen,
} from "@aguateria/shared";
import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, ne, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { clientes, lecturas, medidores, periodos } from "../db/schema";
import { calcularConsumo, calcularPromedioConsumo } from "../services/lecturas";
import { aTarifaInput, aTarifaResumen, obtenerTarifaEnFecha } from "../services/tarifa-vigente";
import { calcularMonto as calcularMontoTarifa } from "../services/tarifas";
import type { AppEnv } from "../types";
import { parseJson, parseQuery } from "./helpers";

type PeriodoRow = typeof periodos.$inferSelect;

interface HistorialCliente {
  ultimaLectura: string | null;
  consumos: string[];
}

function aPeriodo(fila: PeriodoRow): Periodo {
  return {
    id: fila.id,
    anio: fila.anio,
    mes: fila.mes,
    estado: fila.estado,
    fechaVencimiento: fila.fechaVencimiento,
  };
}

/** Última lectura y consumos recientes (hasta 6) de cada cliente antes del período. */
async function cargarHistorialPrevio(
  clienteIds: number[],
  anio: number,
  mes: number,
): Promise<Map<number, HistorialCliente>> {
  const historial = new Map<number, HistorialCliente>();
  if (clienteIds.length === 0) return historial;

  const filas = await db
    .select({
      clienteId: lecturas.clienteId,
      lecturaActual: lecturas.lecturaActual,
      consumoM3: lecturas.consumoM3,
      anio: periodos.anio,
      mes: periodos.mes,
    })
    .from(lecturas)
    .innerJoin(periodos, eq(periodos.id, lecturas.periodoId))
    .where(
      and(
        inArray(lecturas.clienteId, clienteIds),
        isNotNull(lecturas.lecturaActual),
        or(
          lt(periodos.anio, anio),
          and(eq(periodos.anio, anio), lt(periodos.mes, mes)),
        ),
      ),
    )
    .orderBy(asc(lecturas.clienteId), desc(periodos.anio), desc(periodos.mes));

  for (const fila of filas) {
    const actual = historial.get(fila.clienteId) ?? { ultimaLectura: null, consumos: [] };
    if (actual.ultimaLectura === null && fila.lecturaActual !== null) {
      actual.ultimaLectura = fila.lecturaActual;
    }
    if (fila.consumoM3 !== null && actual.consumos.length < 6) {
      actual.consumos.push(fila.consumoM3);
    }
    historial.set(fila.clienteId, actual);
  }

  return historial;
}

export const lecturasRoutes = new Hono<AppEnv>();

lecturasRoutes.get("/", async (c) => {
  const query = parseQuery(c, lecturaQuerySchema);
  if (query instanceof Response) return query;

  let periodo: PeriodoRow | undefined;

  if (query.periodoId !== undefined) {
    [periodo] = await db
      .select()
      .from(periodos)
      .where(eq(periodos.id, query.periodoId))
      .limit(1);

    if (!periodo) return c.json({ error: "Período no encontrado" }, 404);
  } else {
    [periodo] = await db
      .select()
      .from(periodos)
      .orderBy(desc(periodos.anio), desc(periodos.mes))
      .limit(1);
  }

  if (!periodo) {
    const vacio: LecturasPeriodo = {
      periodo: null,
      tarifa: null,
      filas: [],
      resumen: { total: 0, cargadas: 0, pendientes: 0 },
    };
    return c.json(vacio);
  }

  const condiciones: SQL[] = [ne(clientes.estado, "baja")];

  if (query.q) {
    const patron = `%${query.q}%`;
    const busqueda = or(
      ilike(clientes.nombre, patron),
      ilike(clientes.codigo, patron),
      ilike(clientes.direccion, patron),
      ilike(clientes.ciRuc, patron),
    );
    if (busqueda) condiciones.push(busqueda);
  }

  const filasClientes = await db
    .select({
      clienteId: clientes.id,
      codigo: clientes.codigo,
      nombre: clientes.nombre,
      direccion: clientes.direccion,
      estado: clientes.estado,
      medidorId: medidores.id,
      numeroSerie: medidores.numeroSerie,
      lecturaInicial: medidores.lecturaInicial,
    })
    .from(clientes)
    .leftJoin(
      medidores,
      and(eq(medidores.clienteId, clientes.id), eq(medidores.activo, true)),
    )
    .where(and(...condiciones))
    .orderBy(asc(clientes.codigo));

  const ids = filasClientes.map((fila) => fila.clienteId);

  const lecturasPeriodo =
    ids.length > 0
      ? await db
          .select()
          .from(lecturas)
          .where(and(eq(lecturas.periodoId, periodo.id), inArray(lecturas.clienteId, ids)))
      : [];

  const lecturaPorCliente = new Map(lecturasPeriodo.map((fila) => [fila.clienteId, fila]));
  const historial = await cargarHistorialPrevio(ids, periodo.anio, periodo.mes);
  const tarifa = await obtenerTarifaEnFecha(fechaFinMes(periodo.anio, periodo.mes));
  const tarifaResumen: TarifaResumen | null = tarifa ? aTarifaResumen(tarifa) : null;

  const todasLasFilas: LecturaFila[] = filasClientes.map((fila) => {
    const lectura = lecturaPorCliente.get(fila.clienteId);
    const previo = historial.get(fila.clienteId);
    const lecturaAnterior =
      lectura?.lecturaAnterior ?? previo?.ultimaLectura ?? fila.lecturaInicial ?? "0.00";
    const promedio = previo ? calcularPromedioConsumo(previo.consumos) : null;

    let montoEstimado: number | null = null;
    if (lectura?.consumoM3 && tarifa) {
      montoEstimado = calcularMontoTarifa(aTarifaInput(tarifa), lectura.consumoM3).total;
    }

    return {
      clienteId: fila.clienteId,
      codigo: fila.codigo,
      nombre: fila.nombre,
      direccion: fila.direccion,
      estado: fila.estado,
      medidorId: fila.medidorId,
      numeroSerie: fila.numeroSerie,
      lecturaId: lectura?.id ?? null,
      lecturaAnterior,
      lecturaActual: lectura?.lecturaActual ?? null,
      consumoM3: lectura?.consumoM3 ?? null,
      fechaLectura: lectura?.fechaLectura ?? null,
      observacion: lectura?.observacion ?? null,
      promedioConsumo: promedio === null ? null : promedio.toFixed(2),
      montoEstimado,
    };
  });

  const cargadas = todasLasFilas.filter((fila) => fila.lecturaActual !== null).length;
  const resumen = {
    total: todasLasFilas.length,
    cargadas,
    pendientes: todasLasFilas.length - cargadas,
  };

  const filas =
    query.estado === "todas"
      ? todasLasFilas
      : todasLasFilas.filter((fila) =>
          query.estado === "cargadas"
            ? fila.lecturaActual !== null
            : fila.lecturaActual === null,
        );

  const respuesta: LecturasPeriodo = {
    periodo: aPeriodo(periodo),
    tarifa: tarifaResumen,
    filas,
    resumen,
  };

  return c.json(respuesta);
});

lecturasRoutes.post("/", async (c) => {
  const body = await parseJson(c, lecturaUpsertSchema);
  if (body instanceof Response) return body;

  const [periodo] = await db
    .select()
    .from(periodos)
    .where(eq(periodos.id, body.periodoId))
    .limit(1);

  if (!periodo) return c.json({ error: "Período no encontrado" }, 404);

  if (periodo.estado !== "abierto") {
    return c.json(
      {
        error: `El período ${periodo.mes}/${periodo.anio} está ${periodo.estado}; no se pueden editar lecturas.`,
      },
      409,
    );
  }

  const [cliente] = await db
    .select({ id: clientes.id, estado: clientes.estado })
    .from(clientes)
    .where(eq(clientes.id, body.clienteId))
    .limit(1);

  if (!cliente) return c.json({ error: "Cliente no encontrado" }, 404);

  const [medidor] = body.medidorId
    ? await db
        .select()
        .from(medidores)
        .where(and(eq(medidores.id, body.medidorId), eq(medidores.clienteId, body.clienteId)))
        .limit(1)
    : await db
        .select()
        .from(medidores)
        .where(and(eq(medidores.clienteId, body.clienteId), eq(medidores.activo, true)))
        .limit(1);

  if (!medidor) {
    return c.json({ error: "El cliente no tiene un medidor activo" }, 409);
  }

  if (!medidor.activo) {
    return c.json({ error: "El medidor seleccionado está retirado" }, 409);
  }

  const [existente] = await db
    .select()
    .from(lecturas)
    .where(and(eq(lecturas.periodoId, periodo.id), eq(lecturas.clienteId, cliente.id)))
    .limit(1);

  const historial = await cargarHistorialPrevio([cliente.id], periodo.anio, periodo.mes);
  const previo = historial.get(cliente.id);
  const promedio = previo ? calcularPromedioConsumo(previo.consumos) : null;

  const cambioMedidor = existente !== undefined && existente.medidorId !== medidor.id;
  const lecturaAnterior = cambioMedidor
    ? medidor.lecturaInicial
    : (existente?.lecturaAnterior ?? previo?.ultimaLectura ?? medidor.lecturaInicial);

  let calculo: ReturnType<typeof calcularConsumo>;
  try {
    calculo = calcularConsumo(lecturaAnterior, body.lecturaActual);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Lectura inválida" },
      400,
    );
  }

  const tarifa = await obtenerTarifaEnFecha(fechaFinMes(periodo.anio, periodo.mes));
  const montoEstimado = tarifa
    ? calcularMontoTarifa(aTarifaInput(tarifa), calculo.consumoM3).total
    : null;

  const usuarioId = c.get("user").id;

  const [guardada] = await db
    .insert(lecturas)
    .values({
      periodoId: periodo.id,
      clienteId: cliente.id,
      medidorId: medidor.id,
      lecturaAnterior: calculo.lecturaAnterior,
      lecturaActual: calculo.lecturaActual,
      consumoM3: calculo.consumoM3,
      fechaLectura: body.fechaLectura,
      usuarioId,
      observacion: body.observacion ?? null,
    })
    .onConflictDoUpdate({
      target: [lecturas.periodoId, lecturas.clienteId],
      set: {
        medidorId: medidor.id,
        lecturaAnterior: calculo.lecturaAnterior,
        lecturaActual: calculo.lecturaActual,
        consumoM3: calculo.consumoM3,
        fechaLectura: body.fechaLectura,
        usuarioId,
        observacion: body.observacion ?? null,
      },
    })
    .returning();

  if (!guardada) return c.json({ error: "No se pudo guardar la lectura" }, 500);

  const respuesta: LecturaGuardada = {
    id: guardada.id,
    periodoId: guardada.periodoId,
    clienteId: guardada.clienteId,
    medidorId: guardada.medidorId,
    lecturaAnterior: guardada.lecturaAnterior,
    lecturaActual: guardada.lecturaActual ?? calculo.lecturaActual,
    consumoM3: guardada.consumoM3 ?? calculo.consumoM3,
    fechaLectura: guardada.fechaLectura ?? body.fechaLectura,
    observacion: guardada.observacion,
    montoEstimado,
    consumoAtipico: consumoEsAtipico(
      Number(calculo.consumoM3),
      promedio,
    ),
  };

  return c.json(respuesta, existente ? 200 : 201);
});
