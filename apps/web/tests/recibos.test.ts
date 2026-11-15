import type { FacturaDetalle } from "@aguateria/shared";
import { describe, expect, it } from "vitest";
import { htmlDocumento, htmlRecibo } from "../src/lib/recibos";

function detalle(numero: string, nombre: string): FacturaDetalle {
  return {
    id: 1,
    numero,
    periodoId: 1,
    clienteId: 1,
    lecturaId: 1,
    consumoM3: "10.00",
    cargoFijo: 30_000,
    montoConsumo: 0,
    otrosCargos: 0,
    saldoAnterior: 0,
    total: 30_000,
    totalAPagar: 30_000,
    pagado: 10_000,
    saldo: 20_000,
    estado: "parcial",
    fechaEmision: "2026-11-09",
    fechaVencimiento: "2026-12-10",
    vencida: false,
    creadoEn: "2026-11-09T12:00:00.000Z",
    cliente: {
      id: 1,
      codigo: "0001",
      nombre,
      ciRuc: "1234567",
      direccion: "Barrio San Blas",
    },
    periodo: { id: 1, anio: 2026, mes: 11 },
    lectura: {
      lecturaAnterior: "125.40",
      lecturaActual: "135.40",
      fechaLectura: "2026-11-09",
    },
    pagos: [
      {
        id: 1,
        numeroRecibo: "REC-000001",
        clienteId: 1,
        facturaId: 1,
        fecha: "2026-11-09",
        monto: 10_000,
        metodo: "efectivo",
        referencia: null,
        anulado: false,
        creadoEn: "2026-11-09T12:00:00.000Z",
      },
    ],
  };
}

describe("recibos", () => {
  it("genera un recibo con los datos del cliente y los totales", () => {
    const html = htmlRecibo(detalle("F-202611-0001", "María Elena Benítez"));

    expect(html).toContain("AGUATERÍA");
    expect(html).toContain("F-202611-0001");
    expect(html).toContain("María Elena Benítez");
    expect(html).toContain("30.000 Gs.");
    expect(html).toContain("REC-000001");
    expect(html).toContain("Efectivo");
  });

  it("genera un documento con un recibo por página", () => {
    const contenido = [
      htmlRecibo(detalle("F-202611-0001", "Cliente Uno")),
      htmlRecibo(detalle("F-202611-0002", "Cliente Dos")),
    ].join("");

    const documento = htmlDocumento("Recibos", contenido);

    expect(documento).toContain("Cliente Uno");
    expect(documento).toContain("Cliente Dos");
    expect(documento.match(/class="recibo"/g)).toHaveLength(2);
    expect(documento).toContain("page-break-after: always");
  });
});
