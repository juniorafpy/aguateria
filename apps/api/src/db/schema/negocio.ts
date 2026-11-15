import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const estadoClienteEnum = pgEnum("estado_cliente", ["activo", "suspendido", "baja"]);
export const estadoPeriodoEnum = pgEnum("estado_periodo", ["abierto", "facturado", "cerrado"]);
export const estadoFacturaEnum = pgEnum("estado_factura", [
  "pendiente",
  "parcial",
  "pagada",
  "anulada",
]);
export const metodoPagoEnum = pgEnum("metodo_pago", ["efectivo", "transferencia", "otro"]);

export const clientes = pgTable(
  "clientes",
  {
    id: serial("id").primaryKey(),
    codigo: text("codigo").notNull(),
    nombre: text("nombre").notNull(),
    ciRuc: text("ci_ruc"),
    telefono: text("telefono"),
    direccion: text("direccion").notNull(),
    fechaAlta: date("fecha_alta", { mode: "string" }).notNull(),
    estado: estadoClienteEnum("estado").default("activo").notNull(),
    observaciones: text("observaciones"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    uniqueIndex("clientes_codigo_uq").on(tabla.codigo),
    index("clientes_estado_idx").on(tabla.estado),
    index("clientes_nombre_idx").on(tabla.nombre),
  ],
);

export const medidores = pgTable(
  "medidores",
  {
    id: serial("id").primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    numeroSerie: text("numero_serie").notNull(),
    lecturaInicial: numeric("lectura_inicial", { precision: 10, scale: 2 }).notNull(),
    fechaInstalacion: date("fecha_instalacion", { mode: "string" }).notNull(),
    fechaRetiro: date("fecha_retiro", { mode: "string" }),
    activo: boolean("activo").default(true).notNull(),
  },
  (tabla) => [
    index("medidores_cliente_idx").on(tabla.clienteId),
    index("medidores_activo_idx").on(tabla.clienteId, tabla.activo),
  ],
);

export const tarifas = pgTable("tarifas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  vigenteDesde: date("vigente_desde", { mode: "string" }).notNull(),
  vigenteHasta: date("vigente_hasta", { mode: "string" }),
  cargoFijo: bigint("cargo_fijo", { mode: "number" }).notNull(),
  m3Incluidos: numeric("m3_incluidos", { precision: 10, scale: 2 }).default("0").notNull(),
});

export const tarifaTramos = pgTable(
  "tarifa_tramos",
  {
    id: serial("id").primaryKey(),
    tarifaId: integer("tarifa_id")
      .notNull()
      .references(() => tarifas.id, { onDelete: "cascade" }),
    desdeM3: numeric("desde_m3", { precision: 10, scale: 2 }).notNull(),
    hastaM3: numeric("hasta_m3", { precision: 10, scale: 2 }),
    precioM3: bigint("precio_m3", { mode: "number" }).notNull(),
  },
  (tabla) => [index("tarifa_tramos_tarifa_idx").on(tabla.tarifaId)],
);

export const periodos = pgTable(
  "periodos",
  {
    id: serial("id").primaryKey(),
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    estado: estadoPeriodoEnum("estado").default("abierto").notNull(),
    fechaVencimiento: date("fecha_vencimiento", { mode: "string" }).notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [uniqueIndex("periodos_anio_mes_uq").on(tabla.anio, tabla.mes)],
);

export const lecturas = pgTable(
  "lecturas",
  {
    id: serial("id").primaryKey(),
    periodoId: integer("periodo_id")
      .notNull()
      .references(() => periodos.id, { onDelete: "restrict" }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    medidorId: integer("medidor_id")
      .notNull()
      .references(() => medidores.id, { onDelete: "restrict" }),
    lecturaAnterior: numeric("lectura_anterior", { precision: 10, scale: 2 }).notNull(),
    lecturaActual: numeric("lectura_actual", { precision: 10, scale: 2 }),
    consumoM3: numeric("consumo_m3", { precision: 10, scale: 2 }),
    fechaLectura: date("fecha_lectura", { mode: "string" }),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    observacion: text("observacion"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    uniqueIndex("lecturas_periodo_cliente_uq").on(tabla.periodoId, tabla.clienteId),
    index("lecturas_periodo_idx").on(tabla.periodoId),
    index("lecturas_cliente_idx").on(tabla.clienteId),
    index("lecturas_medidor_idx").on(tabla.medidorId),
  ],
);

export const facturas = pgTable(
  "facturas",
  {
    id: serial("id").primaryKey(),
    numero: text("numero").notNull(),
    periodoId: integer("periodo_id")
      .notNull()
      .references(() => periodos.id, { onDelete: "restrict" }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    lecturaId: integer("lectura_id").references(() => lecturas.id, { onDelete: "set null" }),
    consumoM3: numeric("consumo_m3", { precision: 10, scale: 2 }).notNull(),
    cargoFijo: bigint("cargo_fijo", { mode: "number" }).notNull(),
    montoConsumo: bigint("monto_consumo", { mode: "number" }).notNull(),
    otrosCargos: bigint("otros_cargos", { mode: "number" }).default(0).notNull(),
    saldoAnterior: bigint("saldo_anterior", { mode: "number" }).default(0).notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    totalAPagar: bigint("total_a_pagar", { mode: "number" }).notNull(),
    estado: estadoFacturaEnum("estado").default("pendiente").notNull(),
    fechaEmision: date("fecha_emision", { mode: "string" }).notNull(),
    fechaVencimiento: date("fecha_vencimiento", { mode: "string" }).notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    uniqueIndex("facturas_numero_uq").on(tabla.numero),
    uniqueIndex("facturas_periodo_cliente_uq").on(tabla.periodoId, tabla.clienteId),
    index("facturas_periodo_idx").on(tabla.periodoId),
    index("facturas_cliente_idx").on(tabla.clienteId),
    index("facturas_estado_idx").on(tabla.estado),
  ],
);

export const pagos = pgTable(
  "pagos",
  {
    id: serial("id").primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    facturaId: integer("factura_id").references(() => facturas.id, { onDelete: "set null" }),
    fecha: date("fecha", { mode: "string" }).notNull(),
    monto: bigint("monto", { mode: "number" }).notNull(),
    metodo: metodoPagoEnum("metodo").notNull(),
    referencia: text("referencia"),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    anulado: boolean("anulado").default(false).notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    index("pagos_cliente_idx").on(tabla.clienteId),
    index("pagos_factura_idx").on(tabla.facturaId),
    index("pagos_fecha_idx").on(tabla.fecha),
  ],
);

export const cargosExtra = pgTable(
  "cargos_extra",
  {
    id: serial("id").primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    concepto: text("concepto").notNull(),
    monto: bigint("monto", { mode: "number" }).notNull(),
    fecha: date("fecha", { mode: "string" }).notNull(),
    facturado: boolean("facturado").default(false).notNull(),
  },
  (tabla) => [index("cargos_extra_cliente_idx").on(tabla.clienteId)],
);

export const auditoria = pgTable(
  "auditoria",
  {
    id: serial("id").primaryKey(),
    usuarioId: text("usuario_id").references(() => user.id, { onDelete: "set null" }),
    accion: text("accion").notNull(),
    entidad: text("entidad").notNull(),
    entidadId: text("entidad_id"),
    detalle: jsonb("detalle").$type<Record<string, unknown>>(),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    index("auditoria_usuario_idx").on(tabla.usuarioId),
    index("auditoria_fecha_idx").on(tabla.fecha),
  ],
);

export const configuracion = pgTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});
