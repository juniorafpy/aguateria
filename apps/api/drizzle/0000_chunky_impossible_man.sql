CREATE TYPE "public"."estado_cliente" AS ENUM('activo', 'suspendido', 'baja');--> statement-breakpoint
CREATE TYPE "public"."estado_factura" AS ENUM('pendiente', 'parcial', 'pagada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_periodo" AS ENUM('abierto', 'facturado', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'transferencia', 'otro');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" text DEFAULT 'operador' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" text,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text,
	"detalle" jsonb,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargos_extra" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"concepto" text NOT NULL,
	"monto" bigint NOT NULL,
	"fecha" date NOT NULL,
	"facturado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"ci_ruc" text,
	"telefono" text,
	"direccion" text NOT NULL,
	"fecha_alta" date NOT NULL,
	"estado" "estado_cliente" DEFAULT 'activo' NOT NULL,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"periodo_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"lectura_id" integer,
	"consumo_m3" numeric(10, 2) NOT NULL,
	"cargo_fijo" bigint NOT NULL,
	"monto_consumo" bigint NOT NULL,
	"otros_cargos" bigint DEFAULT 0 NOT NULL,
	"saldo_anterior" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"total_a_pagar" bigint NOT NULL,
	"estado" "estado_factura" DEFAULT 'pendiente' NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"periodo_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"medidor_id" integer NOT NULL,
	"lectura_anterior" numeric(10, 2) NOT NULL,
	"lectura_actual" numeric(10, 2),
	"consumo_m3" numeric(10, 2),
	"fecha_lectura" date,
	"usuario_id" text NOT NULL,
	"observacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medidores" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"numero_serie" text NOT NULL,
	"lectura_inicial" numeric(10, 2) NOT NULL,
	"fecha_instalacion" date NOT NULL,
	"fecha_retiro" date,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"factura_id" integer,
	"fecha" date NOT NULL,
	"monto" bigint NOT NULL,
	"metodo" "metodo_pago" NOT NULL,
	"referencia" text,
	"usuario_id" text NOT NULL,
	"anulado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodos" (
	"id" serial PRIMARY KEY NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"estado" "estado_periodo" DEFAULT 'abierto' NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarifa_tramos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tarifa_id" integer NOT NULL,
	"desde_m3" numeric(10, 2) NOT NULL,
	"hasta_m3" numeric(10, 2),
	"precio_m3" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarifas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"cargo_fijo" bigint NOT NULL,
	"m3_incluidos" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD CONSTRAINT "cargos_extra_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_lectura_id_lecturas_id_fk" FOREIGN KEY ("lectura_id") REFERENCES "public"."lecturas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_medidor_id_medidores_id_fk" FOREIGN KEY ("medidor_id") REFERENCES "public"."medidores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medidores" ADD CONSTRAINT "medidores_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_factura_id_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarifa_tramos" ADD CONSTRAINT "tarifa_tramos_tarifa_id_tarifas_id_fk" FOREIGN KEY ("tarifa_id") REFERENCES "public"."tarifas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_usuario_idx" ON "auditoria" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "auditoria_fecha_idx" ON "auditoria" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "cargos_extra_cliente_idx" ON "cargos_extra" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_codigo_uq" ON "clientes" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "clientes_estado_idx" ON "clientes" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "clientes_nombre_idx" ON "clientes" USING btree ("nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_numero_uq" ON "facturas" USING btree ("numero");--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_periodo_cliente_uq" ON "facturas" USING btree ("periodo_id","cliente_id");--> statement-breakpoint
CREATE INDEX "facturas_periodo_idx" ON "facturas" USING btree ("periodo_id");--> statement-breakpoint
CREATE INDEX "facturas_cliente_idx" ON "facturas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "facturas_estado_idx" ON "facturas" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "lecturas_periodo_cliente_uq" ON "lecturas" USING btree ("periodo_id","cliente_id");--> statement-breakpoint
CREATE INDEX "lecturas_periodo_idx" ON "lecturas" USING btree ("periodo_id");--> statement-breakpoint
CREATE INDEX "lecturas_cliente_idx" ON "lecturas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "lecturas_medidor_idx" ON "lecturas" USING btree ("medidor_id");--> statement-breakpoint
CREATE INDEX "medidores_cliente_idx" ON "medidores" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "medidores_activo_idx" ON "medidores" USING btree ("cliente_id","activo");--> statement-breakpoint
CREATE INDEX "pagos_cliente_idx" ON "pagos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "pagos_factura_idx" ON "pagos" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "pagos_fecha_idx" ON "pagos" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_anio_mes_uq" ON "periodos" USING btree ("anio","mes");--> statement-breakpoint
CREATE INDEX "tarifa_tramos_tarifa_idx" ON "tarifa_tramos" USING btree ("tarifa_id");