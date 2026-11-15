import type { EstadoCliente } from "./schemas/common";
import type { Cliente } from "./schemas/cliente";

export interface Periodo {
  id: number;
  anio: number;
  mes: number;
  estado: "abierto" | "facturado" | "cerrado";
  fechaVencimiento: string;
}

export interface DashboardResumen {
  clientes: {
    activos: number;
    suspendidos: number;
    total: number;
  };
  periodo: Periodo | null;
  lecturas: {
    cargadas: number;
    faltantes: number;
    total: number;
  };
  facturacion: {
    facturadoMes: number;
    cobradoMes: number;
    pendienteTotal: number;
  };
  morosos: {
    cantidad: number;
    monto: number;
  };
}

export interface Medidor {
  id: number;
  clienteId: number;
  numeroSerie: string;
  lecturaInicial: string;
  fechaInstalacion: string;
  fechaRetiro: string | null;
  activo: boolean;
}

export interface ClienteListItem extends Cliente {
  medidor: Medidor | null;
}

export interface LecturaHistorial {
  id: number;
  periodoId: number;
  anio: number;
  mes: number;
  lecturaAnterior: string;
  lecturaActual: string | null;
  consumoM3: string | null;
  fechaLectura: string | null;
}

export interface ClienteDetalle {
  cliente: Cliente;
  medidorActivo: Medidor | null;
  medidores: Medidor[];
  historial: LecturaHistorial[];
}

export interface TarifaTramo {
  id: number;
  desdeM3: string;
  hastaM3: string | null;
  precioM3: number;
}

export interface TarifaResumen {
  id: number;
  nombre: string;
  cargoFijo: number;
  m3Incluidos: string;
  tramos: TarifaTramo[];
}

export interface Tarifa extends TarifaResumen {
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface TarifaCalculo {
  cargoFijo: number;
  m3Incluidos: number;
  excedenteM3: number;
  montoConsumo: number;
  total: number;
  detalle: Array<{
    desdeM3: number;
    hastaM3: number | null;
    m3: number;
    precioM3: number;
    subtotal: number;
  }>;
}

export interface SimulacionTarifa {
  tarifa: TarifaResumen;
  calculo: TarifaCalculo;
}

export interface LecturaFila {
  clienteId: number;
  codigo: string;
  nombre: string;
  direccion: string;
  estado: EstadoCliente;
  medidorId: number | null;
  numeroSerie: string | null;
  lecturaId: number | null;
  lecturaAnterior: string;
  lecturaActual: string | null;
  consumoM3: string | null;
  fechaLectura: string | null;
  observacion: string | null;
  promedioConsumo: string | null;
  montoEstimado: number | null;
}

export interface LecturasPeriodo {
  periodo: Periodo | null;
  tarifa: TarifaResumen | null;
  filas: LecturaFila[];
  resumen: {
    total: number;
    cargadas: number;
    pendientes: number;
  };
}

export interface LecturaGuardada {
  id: number;
  periodoId: number;
  clienteId: number;
  medidorId: number;
  lecturaAnterior: string;
  lecturaActual: string;
  consumoM3: string;
  fechaLectura: string;
  observacion: string | null;
  montoEstimado: number | null;
  consumoAtipico: boolean;
}

export interface Factura {
  id: number;
  numero: string;
  periodoId: number;
  clienteId: number;
  lecturaId: number | null;
  consumoM3: string;
  cargoFijo: number;
  montoConsumo: number;
  otrosCargos: number;
  saldoAnterior: number;
  total: number;
  totalAPagar: number;
  /** Suma de pagos no anulados aplicados a esta factura. */
  pagado: number;
  /** totalAPagar − pagado (nunca negativo). */
  saldo: number;
  estado: "pendiente" | "parcial" | "pagada" | "anulada";
  fechaEmision: string;
  fechaVencimiento: string;
  vencida: boolean;
  creadoEn: string;
}

export interface FacturaListItem extends Factura {
  cliente: {
    id: number;
    codigo: string;
    nombre: string;
    ciRuc: string | null;
    direccion: string;
  };
  periodo: {
    id: number;
    anio: number;
    mes: number;
  };
}

export interface FacturaDetalle extends FacturaListItem {
  lectura: {
    lecturaAnterior: string;
    lecturaActual: string | null;
    fechaLectura: string | null;
  } | null;
  pagos: Pago[];
}

export interface FacturaPreviewCargo {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
}

export interface FacturaPreviewFila {
  lecturaId: number;
  clienteId: number;
  codigo: string;
  nombre: string;
  direccion: string;
  consumoM3: string;
  cargoFijo: number;
  montoConsumo: number;
  /** Cargos extra pendientes que se incluirán en la factura. */
  cargos: FacturaPreviewCargo[];
  /** Suma de los cargos extra pendientes. */
  cargosExtra: number;
  /** Recargo por mora que se aplicará en esta factura. */
  cargoMora: number;
  otrosCargos: number;
  saldoAnterior: number;
  total: number;
  totalAPagar: number;
}

export interface FacturaPreview {
  periodo: Periodo;
  tarifa: TarifaResumen;
  filas: FacturaPreviewFila[];
  pendientesSinLectura: number;
  totales: {
    facturas: number;
    montoTotal: number;
    montoAPagar: number;
  };
}

export interface FacturaGenerada {
  generadas: number;
  pendientesSinLectura: number;
  yaFacturadas: number;
  /** Cantidad de cargos extra incluidos en las facturas generadas. */
  cargosAplicados: number;
  /** Cantidad de recargos por mora generados. */
  recargosMora: number;
  periodo: Periodo;
}

export interface Pago {
  id: number;
  numeroRecibo: string;
  clienteId: number;
  facturaId: number | null;
  fecha: string;
  monto: number;
  metodo: "efectivo" | "transferencia" | "otro";
  referencia: string | null;
  anulado: boolean;
  creadoEn: string;
}

export interface PagoListItem extends Pago {
  cliente: {
    id: number;
    codigo: string;
    nombre: string;
  };
  factura: {
    id: number;
    numero: string;
  } | null;
}

export interface SaldoCliente {
  clienteId: number;
  facturado: number;
  pagado: number;
  saldo: number;
}

export interface EstadoCuentaFactura {
  id: number;
  numero: string;
  periodo: { anio: number; mes: number };
  fechaEmision: string;
  fechaVencimiento: string;
  totalAPagar: number;
  pagado: number;
  saldo: number;
  estado: "pendiente" | "parcial" | "pagada" | "anulada";
  vencida: boolean;
}

export interface EstadoCuentaPago {
  id: number;
  numeroRecibo: string;
  fecha: string;
  monto: number;
  metodo: "efectivo" | "transferencia" | "otro";
  referencia: string | null;
  facturaNumero: string | null;
  anulado: boolean;
}

export interface EstadoCuentaCliente {
  cliente: Cliente;
  generadoEn: string;
  resumen: {
    facturado: number;
    pagado: number;
    deuda: number;
    saldoAFavor: number;
    saldoNeto: number;
  };
  facturas: EstadoCuentaFactura[];
  pagos: EstadoCuentaPago[];
}

export interface CierreCajaMetodo {
  metodo: "efectivo" | "transferencia" | "otro";
  cantidad: number;
  total: number;
}

export interface CierreCaja {
  desde: string;
  hasta: string;
  generadoEn: string;
  cantidad: number;
  total: number;
  anulados: number;
  porMetodo: CierreCajaMetodo[];
  pagos: PagoListItem[];
}

export interface ReporteMoroso {
  clienteId: number;
  codigo: string;
  nombre: string;
  telefono: string | null;
  direccion: string;
  facturasPendientes: number;
  deuda: number;
  vencidaDesde: string;
  mesesAtraso: number;
}

export interface ReporteMorosos {
  generadoEn: string;
  totales: {
    clientes: number;
    deuda: number;
  };
  filas: ReporteMoroso[];
}

export interface ReporteConsumoFila {
  clienteId: number;
  codigo: string;
  nombre: string;
  lecturaAnterior: string | null;
  lecturaActual: string | null;
  consumoM3: string | null;
}

export interface ReporteConsumo {
  periodo: Periodo | null;
  generadoEn: string;
  totales: {
    clientes: number;
    cargadas: number;
    consumoM3: string;
  };
  filas: ReporteConsumoFila[];
}

export interface ReporteRecaudacionDia {
  fecha: string;
  cantidad: number;
  total: number;
}

export interface ReporteRecaudacion {
  desde: string;
  hasta: string;
  generadoEn: string;
  cantidad: number;
  total: number;
  anulados: number;
  porMetodo: CierreCajaMetodo[];
  porDia: ReporteRecaudacionDia[];
  pagos: PagoListItem[];
}

export interface ConfiguracionAguateria {
  aguateriaNombre: string;
  aguateriaDireccion: string;
  aguateriaTelefono: string;
  aguateriaRuc: string;
  diaVencimiento: number;
  mesesParaCorte: number;
  recargoMora: number;
}

export interface CargoExtra {
  id: number;
  clienteId: number;
  concepto: string;
  monto: number;
  fecha: string;
  facturado: boolean;
  anulado: boolean;
  facturaId: number | null;
  usuarioId: string | null;
  creadoEn: string;
}

export interface CargoExtraListItem extends CargoExtra {
  cliente: {
    id: number;
    codigo: string;
    nombre: string;
  };
  factura: {
    id: number;
    numero: string;
  } | null;
}

export interface CandidatoCorte {
  clienteId: number;
  codigo: string;
  nombre: string;
  telefono: string | null;
  direccion: string;
  estado: EstadoCliente;
  fechaSuspension: string | null;
  motivoSuspension: string | null;
  facturasPendientes: number;
  deuda: number;
  vencidaDesde: string | null;
  mesesAtraso: number;
}

export interface ReporteMora {
  generadoEn: string;
  mesesParaCorte: number;
  recargoMora: number;
  resumen: {
    candidatos: number;
    suspendidos: number;
    deudaCandidatos: number;
    deudaSuspendidos: number;
  };
  candidatos: CandidatoCorte[];
  suspendidos: CandidatoCorte[];
}

export interface UsuarioListItem {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: "admin" | "operador";
  banned: boolean;
  banReason: string | null;
  createdAt: string;
}

export interface AuditoriaItem {
  id: number;
  fecha: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
  usuario: {
    id: string;
    name: string;
    username: string | null;
  } | null;
}

