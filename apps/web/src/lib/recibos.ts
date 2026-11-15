import {
  formatFecha,
  formatGs,
  formatM3,
  formatPeriodo,
  type FacturaDetalle,
} from "@aguateria/shared";

const METODOS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
} as const;

export function formatearMetodo(metodo: string): string {
  return METODOS[metodo as keyof typeof METODOS] ?? metodo;
}

const ESTILOS = `
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; letter-spacing: .5px; }
  .sub { text-align: center; font-size: 11px; margin: 0 0 10px; }
  .linea { border-top: 1px dashed #444; margin: 8px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .fila span:last-child { font-weight: bold; text-align: right; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #444; padding: 3px 0; }
  td { padding: 3px 0; vertical-align: top; }
  .der { text-align: right; }
  .total { font-size: 15px; font-weight: bold; }
  .pagos { margin-top: 4px; }
  .recibo { page-break-after: always; }
  .recibo:last-child { page-break-after: auto; }
  .recibo + .recibo { border-top: 1px dashed #999; padding-top: 14px; }
  @media print {
    body { padding: 0; }
    @page { margin: 8mm; }
    .recibo + .recibo { border-top: 0; padding-top: 0; }
  }
`;

export function htmlRecibo(detalle: FacturaDetalle): string {
  const periodo = formatPeriodo(detalle.periodo.anio, detalle.periodo.mes);

  const pagosHtml =
    detalle.pagos.length === 0
      ? "<p>Sin pagos registrados.</p>"
      : `<table class="pagos"><thead><tr><th>Recibo</th><th>Fecha</th><th>Método</th><th class="der">Monto</th></tr></thead><tbody>${detalle.pagos
          .map(
            (pago) =>
              `<tr><td>${pago.numeroRecibo}</td><td>${formatFecha(pago.fecha)}</td><td>${formatearMetodo(pago.metodo)}</td><td class="der">${formatGs(pago.monto)}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  return `<section class="recibo">
  <h1>AGUATERÍA — COMISIÓN VECINAL</h1>
  <p class="sub">Recibo interno de consumo de agua</p>
  <div class="linea"></div>
  <div class="fila"><span>Nº recibo</span><span>${detalle.numero}</span></div>
  <div class="fila"><span>Emisión</span><span>${formatFecha(detalle.fechaEmision)}</span></div>
  <div class="fila"><span>Vencimiento</span><span>${formatFecha(detalle.fechaVencimiento)}</span></div>
  <div class="fila"><span>Período</span><span>${periodo}</span></div>
  <div class="linea"></div>
  <div class="fila"><span>Cliente</span><span>${detalle.cliente.nombre}</span></div>
  <div class="fila"><span>Código</span><span>${detalle.cliente.codigo}</span></div>
  <div class="fila"><span>Documento</span><span>${detalle.cliente.ciRuc ?? "—"}</span></div>
  <div class="fila"><span>Dirección</span><span>${detalle.cliente.direccion}</span></div>
  <div class="linea"></div>
  <div class="fila"><span>Lectura anterior</span><span>${detalle.lectura ? formatM3(detalle.lectura.lecturaAnterior) : "—"}</span></div>
  <div class="fila"><span>Lectura actual</span><span>${detalle.lectura ? formatM3(detalle.lectura.lecturaActual) : "—"}</span></div>
  <div class="fila"><span>Consumo</span><span>${formatM3(detalle.consumoM3)}</span></div>
  <div class="linea"></div>
  <table>
    <thead><tr><th>Concepto</th><th class="der">Importe</th></tr></thead>
    <tbody>
      <tr><td>Cargo fijo</td><td class="der">${formatGs(detalle.cargoFijo)}</td></tr>
      <tr><td>Consumo de agua</td><td class="der">${formatGs(detalle.montoConsumo)}</td></tr>
      <tr><td>Otros cargos</td><td class="der">${formatGs(detalle.otrosCargos)}</td></tr>
      <tr><td>Saldo anterior</td><td class="der">${formatGs(detalle.saldoAnterior)}</td></tr>
    </tbody>
  </table>
  <div class="linea"></div>
  <div class="fila total"><span>Total a pagar</span><span>${formatGs(detalle.totalAPagar)}</span></div>
  <div class="fila"><span>Pagado</span><span>${formatGs(detalle.pagado)}</span></div>
  <div class="fila"><span>Saldo</span><span>${formatGs(detalle.saldo)}</span></div>
  <div class="linea"></div>
  <p class="sub" style="text-align:left;font-weight:bold;margin-bottom:2px;">Pagos registrados</p>
  ${pagosHtml}
  <div class="linea"></div>
  <p class="sub">Gracias por su pago puntual.</p>
</section>`;
}

export function htmlDocumento(titulo: string, contenido: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>${ESTILOS}</style>
</head>
<body>${contenido}</body>
</html>`;
}

export function abrirVentanaImpresion(ancho = 520, alto = 760): Window | null {
  const ventana = window.open("", "_blank", `width=${ancho},height=${alto}`);
  if (!ventana) return null;

  ventana.document.write(
    htmlDocumento(
      "Preparando…",
      `<p style="font-family:monospace;padding:16px">Preparando recibos…</p>`,
    ),
  );
  ventana.document.close();
  return ventana;
}

export function escribirRecibos(
  ventana: Window,
  detalles: FacturaDetalle[],
  titulo: string,
): void {
  ventana.document.open();
  ventana.document.write(
    htmlDocumento(titulo, detalles.map(htmlRecibo).join("")),
  );
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

/** Abre una ventana con un recibo y lanza la impresión. */
export function imprimirRecibo(detalle: FacturaDetalle): boolean {
  const ventana = abrirVentanaImpresion(460, 720);
  if (!ventana) return false;

  escribirRecibos(ventana, [detalle], detalle.numero);
  return true;
}

/** Abre una ventana con todos los recibos, uno por página. */
export function imprimirRecibos(detalles: FacturaDetalle[]): boolean {
  const ventana = abrirVentanaImpresion(520, 820);
  if (!ventana) return false;

  escribirRecibos(ventana, detalles, `Recibos (${detalles.length})`);
  return true;
}
