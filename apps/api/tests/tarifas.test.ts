import { describe, expect, it } from "vitest";
import { calcularMonto, type TarifaInput } from "../src/services/tarifas";

const tarifaBase: TarifaInput = {
  cargoFijo: 30000,
  m3Incluidos: "10.00",
  tramos: [
    { desdeM3: "0.00", hastaM3: "20.00", precioM3: 3000 },
    { desdeM3: "20.00", hastaM3: null, precioM3: 5000 },
  ],
};

describe("calcularMonto", () => {
  it("cobra solo el cargo fijo si el consumo es menor a los m³ incluidos", () => {
    const resultado = calcularMonto(tarifaBase, "5.00");
    expect(resultado.montoConsumo).toBe(0);
    expect(resultado.total).toBe(30000);
    expect(resultado.detalle).toHaveLength(0);
  });

  it("cobra solo el cargo fijo si el consumo es exactamente los m³ incluidos", () => {
    const resultado = calcularMonto(tarifaBase, "10.00");
    expect(resultado.excedenteM3).toBe(0);
    expect(resultado.total).toBe(30000);
  });

  it("cobra solo el cargo fijo si el consumo es 0", () => {
    const resultado = calcularMonto(tarifaBase, "0.00");
    expect(resultado.total).toBe(30000);
  });

  it("calcula el ejemplo del spec: 35 m³ -> 115.000 Gs.", () => {
    const resultado = calcularMonto(tarifaBase, "35.00");
    expect(resultado.excedenteM3).toBe(25);
    expect(resultado.montoConsumo).toBe(85000);
    expect(resultado.total).toBe(115000);
    expect(resultado.detalle).toEqual([
      { desdeM3: 0, hastaM3: 20, m3: 20, precioM3: 3000, subtotal: 60000 },
      { desdeM3: 20, hastaM3: null, m3: 5, precioM3: 5000, subtotal: 25000 },
    ]);
  });

  it("aplica un único tramo plano", () => {
    const plana: TarifaInput = {
      cargoFijo: 0,
      m3Incluidos: "0.00",
      tramos: [{ desdeM3: "0.00", hastaM3: null, precioM3: 2000 }],
    };
    const resultado = calcularMonto(plana, "12.50");
    expect(resultado.montoConsumo).toBe(25000);
    expect(resultado.total).toBe(25000);
  });

  it("trabaja con centésimas de m³ sin errores de float", () => {
    const tarifa: TarifaInput = {
      cargoFijo: 0,
      m3Incluidos: "0.00",
      tramos: [{ desdeM3: "0.00", hastaM3: null, precioM3: 3000 }],
    };
    const resultado = calcularMonto(tarifa, "0.10");
    expect(resultado.montoConsumo).toBe(300);
    expect(resultado.total).toBe(300);
  });

  it("no cobra de más si hay un hueco entre tramos", () => {
    const conHueco: TarifaInput = {
      cargoFijo: 10000,
      m3Incluidos: "0.00",
      tramos: [
        { desdeM3: "0.00", hastaM3: "5.00", precioM3: 1000 },
        { desdeM3: "10.00", hastaM3: null, precioM3: 2000 },
      ],
    };
    const resultado = calcularMonto(conHueco, "12.00");
    expect(resultado.montoConsumo).toBe(5000 + 4000);
    expect(resultado.total).toBe(19000);
  });
});
