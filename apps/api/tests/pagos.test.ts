import { describe, expect, it } from "vitest";
import { distribuirPago } from "../src/services/pago-aplicacion";

const facturas = [
  { id: 1, pendiente: 30_000 },
  { id: 2, pendiente: 115_000 },
  { id: 3, pendiente: 30_000 },
];

describe("distribuirPago", () => {
  it("aplica el pago completo a la factura más antigua (FIFO)", () => {
    const resultado = distribuirPago(30_000, facturas);

    expect(resultado.aplicaciones).toEqual([{ facturaId: 1, monto: 30_000 }]);
    expect(resultado.saldoAFavor).toBe(0);
  });

  it("aplica un pago parcial sin saldo a favor", () => {
    const resultado = distribuirPago(10_000, facturas);

    expect(resultado.aplicaciones).toEqual([{ facturaId: 1, monto: 10_000 }]);
    expect(resultado.saldoAFavor).toBe(0);
  });

  it("reparte entre varias facturas cuando el monto alcanza para más de una", () => {
    const resultado = distribuirPago(175_000, facturas);

    expect(resultado.aplicaciones).toEqual([
      { facturaId: 1, monto: 30_000 },
      { facturaId: 2, monto: 115_000 },
      { facturaId: 3, monto: 30_000 },
    ]);
    expect(resultado.saldoAFavor).toBe(0);
  });

  it("deja el excedente como saldo a favor", () => {
    const resultado = distribuirPago(200_000, facturas);

    expect(resultado.aplicaciones).toEqual([
      { facturaId: 1, monto: 30_000 },
      { facturaId: 2, monto: 115_000 },
      { facturaId: 3, monto: 30_000 },
    ]);
    expect(resultado.saldoAFavor).toBe(25_000);
  });

  it("ignora facturas sin saldo pendiente", () => {
    const resultado = distribuirPago(50_000, [
      { id: 1, pendiente: 0 },
      { id: 2, pendiente: 20_000 },
      { id: 3, pendiente: 30_000 },
    ]);

    expect(resultado.aplicaciones).toEqual([
      { facturaId: 2, monto: 20_000 },
      { facturaId: 3, monto: 30_000 },
    ]);
    expect(resultado.saldoAFavor).toBe(0);
  });

  it("devuelve todo como saldo a favor si no hay facturas pendientes", () => {
    const resultado = distribuirPago(15_000, []);

    expect(resultado.aplicaciones).toEqual([]);
    expect(resultado.saldoAFavor).toBe(15_000);
  });

  it("rechaza montos no enteros o no positivos", () => {
    expect(() => distribuirPago(0, facturas)).toThrow();
    expect(() => distribuirPago(-5, facturas)).toThrow();
    expect(() => distribuirPago(10.5, facturas)).toThrow();
  });
});
