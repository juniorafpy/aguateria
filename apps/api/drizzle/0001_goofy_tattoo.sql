ALTER TABLE "cargos_extra" ADD COLUMN "anulado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD COLUMN "factura_id" integer;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD COLUMN "usuario_id" text;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD COLUMN "creado_en" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "fecha_suspension" date;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "motivo_suspension" text;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD CONSTRAINT "cargos_extra_factura_id_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_extra" ADD CONSTRAINT "cargos_extra_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cargos_extra_factura_idx" ON "cargos_extra" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "cargos_extra_pendiente_idx" ON "cargos_extra" USING btree ("cliente_id","facturado","anulado");