import {
  hoyAsuncion,
  type CandidatoCorte,
  type ReporteMora,
} from "@aguateria/shared";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { clientes } from "../db/schema";
import { obtenerConfiguracion } from "./configuracion";
import {
  calcularMesesAtraso,
  obtenerDeudoresConEstado,
  type DeudorConEstado,
} from "./reportes";

/**
 * Un cliente es candidato a corte cuando acumula al menos la cantidad
 * configurada de facturas vencidas e impagas.
 */
export function esCandidatoACorte(
  facturasPendientes: number,
  mesesParaCorte: number,
): boolean {
  return facturasPendientes >= mesesParaCorte;
}

function aCandidato(deudor: DeudorConEstado, hoy: string): CandidatoCorte {
  return {
    clienteId: deudor.clienteId,
    codigo: deudor.codigo,
    nombre: deudor.nombre,
    telefono: deudor.telefono,
    direccion: deudor.direccion,
    estado: deudor.estado,
    fechaSuspension: deudor.fechaSuspension,
    motivoSuspension: deudor.motivoSuspension,
    facturasPendientes: deudor.facturasPendientes,
    deuda: deudor.deuda,
    vencidaDesde: deudor.vencidaDesde,
    mesesAtraso: calcularMesesAtraso(deudor.vencidaDesde, hoy),
  };
}

async function obtenerSuspendidos(): Promise<
  Array<{
    clienteId: number;
    codigo: string;
    nombre: string;
    telefono: string | null;
    direccion: string;
    fechaSuspension: string | null;
    motivoSuspension: string | null;
  }>
> {
  return db
    .select({
      clienteId: clientes.id,
      codigo: clientes.codigo,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      direccion: clientes.direccion,
      fechaSuspension: clientes.fechaSuspension,
      motivoSuspension: clientes.motivoSuspension,
    })
    .from(clientes)
    .where(eq(clientes.estado, "suspendido"))
    .orderBy(asc(clientes.codigo));
}

/**
 * Reporte operativo de mora y corte:
 * - candidatos: clientes activos que alcanzaron el umbral de facturas vencidas.
 * - suspendidos: todos los clientes con el servicio cortado, tengan o no deuda.
 */
export async function obtenerReporteMora(): Promise<ReporteMora> {
  const [configuracion, deudores, suspendidosBase] = await Promise.all([
    obtenerConfiguracion(),
    obtenerDeudoresConEstado(),
    obtenerSuspendidos(),
  ]);

  const hoy = hoyAsuncion();
  const deudoresPorCliente = new Map(
    deudores.map((deudor) => [deudor.clienteId, deudor]),
  );

  const candidatos = deudores
    .filter(
      (deudor) =>
        deudor.estado === "activo" &&
        esCandidatoACorte(deudor.facturasPendientes, configuracion.mesesParaCorte),
    )
    .map((deudor) => aCandidato(deudor, hoy))
    .sort((a, b) => b.deuda - a.deuda || a.nombre.localeCompare(b.nombre));

  const suspendidos = suspendidosBase
    .map((cliente): CandidatoCorte => {
      const deudor = deudoresPorCliente.get(cliente.clienteId);

      if (deudor) {
        return aCandidato(
          {
            ...deudor,
            fechaSuspension: cliente.fechaSuspension,
            motivoSuspension: cliente.motivoSuspension,
          },
          hoy,
        );
      }

      return {
        clienteId: cliente.clienteId,
        codigo: cliente.codigo,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        estado: "suspendido",
        fechaSuspension: cliente.fechaSuspension,
        motivoSuspension: cliente.motivoSuspension,
        facturasPendientes: 0,
        deuda: 0,
        vencidaDesde: null,
        mesesAtraso: 0,
      };
    })
    .sort((a, b) => b.deuda - a.deuda || a.nombre.localeCompare(b.nombre));

  return {
    generadoEn: new Date().toISOString(),
    mesesParaCorte: configuracion.mesesParaCorte,
    recargoMora: configuracion.recargoMora,
    resumen: {
      candidatos: candidatos.length,
      suspendidos: suspendidos.length,
      deudaCandidatos: candidatos.reduce((suma, fila) => suma + fila.deuda, 0),
      deudaSuspendidos: suspendidos.reduce((suma, fila) => suma + fila.deuda, 0),
    },
    candidatos,
    suspendidos,
  };
}
