import { describe, expect, it } from "vitest";
import { calcularOtrosCargos, sumarCargos } from "../src/services/cargos-calculo";
import { esCandidatoACorte } from "../src/services/mora";

describe("sumarCargos", () => {
  it("suma los cargos pendientes", () => {
    expect(sumarCargos([{ monto: 50_000 }, { monto: 15_000 }])).toBe(65_000);
  });

  it("devuelve 0 sin cargos", () => {
    expect(sumarCargos([])).toBe(0);
  });
});

describe("calcularOtrosCargos", () => {
  it("suma cargos extra y recargo por mora", () => {
    expect(
      calcularOtrosCargos([{ monto: 50_000 }, { monto: 15_000 }], 20_000, true),
    ).toEqual({
      cargosExtra: 65_000,
      cargoMora: 20_000,
      otrosCargos: 85_000,
    });
  });

  it("no aplica mora si el cliente no está en mora", () => {
    expect(calcularOtrosCargos([{ monto: 10_000 }], 20_000, false)).toEqual({
      cargosExtra: 10_000,
      cargoMora: 0,
      otrosCargos: 10_000,
    });
  });

  it("no aplica mora si el recargo configurado es 0", () => {
    expect(calcularOtrosCargos([], 0, true)).toEqual({
      cargosExtra: 0,
      cargoMora: 0,
      otrosCargos: 0,
    });
  });
});

describe("esCandidatoACorte", () => {
  it("marca al cliente cuando alcanza el mínimo de facturas vencidas", () => {
    expect(esCandidatoACorte(2, 2)).toBe(true);
    expect(esCandidatoACorte(3, 2)).toBe(true);
  });

  it("no lo marca cuando todavía no llega al mínimo", () => {
    expect(esCandidatoACorte(1, 2)).toBe(false);
    expect(esCandidatoACorte(0, 1)).toBe(false);
  });
});
