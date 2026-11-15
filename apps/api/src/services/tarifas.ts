export interface TramoInput {
  desdeM3: string;
  hastaM3: string | null;
  precioM3: number;
}

export interface TarifaInput {
  cargoFijo: number;
  m3Incluidos: string;
  tramos: TramoInput[];
}

export interface DetalleTramo {
  desdeM3: number;
  hastaM3: number | null;
  m3: number;
  precioM3: number;
  subtotal: number;
}

export interface ResultadoCalculo {
  cargoFijo: number;
  m3Incluidos: number;
  excedenteM3: number;
  montoConsumo: number;
  total: number;
  detalle: DetalleTramo[];
}

/** Convierte "12.34" m³ a 1234 centésimas (enteros, sin float). */
export function m3ACentesimas(m3: string | number): number {
  const numero = typeof m3 === "number" ? m3 : Number(m3.replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`Metros cúbicos inválidos: ${m3}`);
  }
  return Math.round(numero * 100);
}

export function centesimasAM3(centesimas: number): number {
  return centesimas / 100;
}

/**
 * Calcula el monto mensual según la tarifa vigente.
 * - El excedente se mide a partir de los m³ incluidos en el cargo fijo.
 * - Los tramos se expresan en m³ de excedente y deben cubrir desde 0.
 * - Todo el dinero se calcula en guaraníes enteros.
 */
export function calcularMonto(tarifa: TarifaInput, consumoM3: string | number): ResultadoCalculo {
  const consumo = m3ACentesimas(consumoM3);
  const incluidos = m3ACentesimas(tarifa.m3Incluidos);
  const excedente = Math.max(0, consumo - incluidos);

  const tramos = [...tarifa.tramos]
    .map((tramo) => ({
      ...tramo,
      desde: m3ACentesimas(tramo.desdeM3),
      hasta: tramo.hastaM3 === null ? null : m3ACentesimas(tramo.hastaM3),
    }))
    .sort((a, b) => a.desde - b.desde);

  let cubierto = 0;
  let montoConsumo = 0;
  const detalle: DetalleTramo[] = [];

  for (const tramo of tramos) {
    if (cubierto >= excedente) break;

    const inicio = Math.max(tramo.desde, cubierto);
    const fin = tramo.hasta === null ? excedente : Math.min(tramo.hasta, excedente);

    if (fin <= inicio) {
      cubierto = Math.max(cubierto, fin);
      continue;
    }

    const m3Tramo = fin - inicio;
    const subtotal = Math.round((m3Tramo * tramo.precioM3) / 100);

    montoConsumo += subtotal;
    cubierto = fin;
    detalle.push({
      desdeM3: centesimasAM3(inicio),
      hastaM3: tramo.hasta === null ? null : centesimasAM3(tramo.hasta),
      m3: centesimasAM3(m3Tramo),
      precioM3: tramo.precioM3,
      subtotal,
    });
  }

  return {
    cargoFijo: tarifa.cargoFijo,
    m3Incluidos: centesimasAM3(incluidos),
    excedenteM3: centesimasAM3(excedente),
    montoConsumo,
    total: tarifa.cargoFijo + montoConsumo,
    detalle,
  };
}
