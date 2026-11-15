import type { PagoListItem } from "@aguateria/shared";
import { describe, expect, it } from "vitest";
import { agruparPorDia, calcularMesesAtraso } from "../src/services/reportes";

describe("calcularMesesAtraso", () => {
  it("cuenta meses completos de atraso", () => {
    expect(calcularMesesAtraso("2026-09-10", "2026-11-09")).toBe(1);
    expect(calcularMesesAtraso("2026-08-10", "2026-11-09")).toBe(2);
    expect(calcularMesesAtraso("2026-09-10", "2026-11-10")).toBe(2);
  });

  it("nunca devuelve menos de un mes cuando ya venció", () => {
    expect(calcularMesesAtraso("2026-11-01", "2026-11-09")).toBe(1);
  });
});

function pago(id: number, fecha: string, monto: number): PagoListItem {
  return {
    id,
    numeroRecibo: `REC-${String(id).padStart(6, "0")}`,
    clienteId: 1,
    facturaId: null,
    fecha,
    monto,
    metodo: "efectivo",
    referencia: null,
    anulado: false,
    creadoEn: "2026-11-10T00:00:00.000Z",
    cliente: { id: 1, codigo: "0001", nombre: "Cliente de prueba" },
    factura: null,
  };
}

describe("agruparPorDia", () => {
  it("agrupa por fecha y ordena cronológicamente", () => {
    const resultado = agruparPorDia([
      pago(1, "2026-11-10", 1_000),
      pago(2, "2026-11-09", 500),
      pago(3, "2026-11-10", 2_500),
    ]);

    expect(resultado).toEqual([
      { fecha: "2026-11-09", cantidad: 1, total: 500 },
      { fecha: "2026-11-10", cantidad: 2, total: 3_500 },
    ]);
  });

  it("devuelve una lista vacía si no hay pagos", () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});
