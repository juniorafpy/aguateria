import type {
  ConfiguracionAguateria,
  ConfiguracionUpdateInput,
} from "@aguateria/shared";
import { db } from "../db";
import { auditoria, configuracion } from "../db/schema";

const CLAVES = {
  nombre: "aguateria_nombre",
  direccion: "aguateria_direccion",
  telefono: "aguateria_telefono",
  ruc: "aguateria_ruc",
  diaVencimiento: "dia_vencimiento",
  mesesParaCorte: "meses_para_corte",
  recargoMora: "recargo_mora",
} as const;

const DEFAULTS: ConfiguracionAguateria = {
  aguateriaNombre: "Aguatería",
  aguateriaDireccion: "",
  aguateriaTelefono: "",
  aguateriaRuc: "",
  diaVencimiento: 10,
  mesesParaCorte: 2,
  recargoMora: 0,
};

function aEntero(valor: string | undefined, defecto: number): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : defecto;
}

export async function obtenerConfiguracion(): Promise<ConfiguracionAguateria> {
  const filas = await db.select().from(configuracion);
  const mapa = new Map(filas.map((fila) => [fila.clave, fila.valor]));

  return {
    aguateriaNombre:
      mapa.get(CLAVES.nombre) ?? DEFAULTS.aguateriaNombre,
    aguateriaDireccion:
      mapa.get(CLAVES.direccion) ?? DEFAULTS.aguateriaDireccion,
    aguateriaTelefono:
      mapa.get(CLAVES.telefono) ?? DEFAULTS.aguateriaTelefono,
    aguateriaRuc: mapa.get(CLAVES.ruc) ?? DEFAULTS.aguateriaRuc,
    diaVencimiento: aEntero(
      mapa.get(CLAVES.diaVencimiento),
      DEFAULTS.diaVencimiento,
    ),
    mesesParaCorte: aEntero(
      mapa.get(CLAVES.mesesParaCorte),
      DEFAULTS.mesesParaCorte,
    ),
    recargoMora: aEntero(mapa.get(CLAVES.recargoMora), DEFAULTS.recargoMora),
  };
}

export async function guardarConfiguracion(
  input: ConfiguracionUpdateInput,
  usuarioId: string,
): Promise<ConfiguracionAguateria> {
  const valores = [
    { clave: CLAVES.nombre, valor: input.aguateriaNombre },
    { clave: CLAVES.direccion, valor: input.aguateriaDireccion },
    { clave: CLAVES.telefono, valor: input.aguateriaTelefono },
    { clave: CLAVES.ruc, valor: input.aguateriaRuc },
    { clave: CLAVES.diaVencimiento, valor: String(input.diaVencimiento) },
    { clave: CLAVES.mesesParaCorte, valor: String(input.mesesParaCorte) },
    { clave: CLAVES.recargoMora, valor: String(input.recargoMora) },
  ];

  await db.transaction(async (tx) => {
    for (const valor of valores) {
      await tx
        .insert(configuracion)
        .values(valor)
        .onConflictDoUpdate({
          target: configuracion.clave,
          set: { valor: valor.valor, actualizadoEn: new Date() },
        });
    }

    await tx.insert(auditoria).values({
      usuarioId,
      accion: "actualizar_configuracion",
      entidad: "configuracion",
      detalle: { ...input },
    });
  });

  return obtenerConfiguracion();
}
