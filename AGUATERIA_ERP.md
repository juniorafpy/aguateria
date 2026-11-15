# Mini ERP para Aguatería

> Documento de especificación para implementar con opencode.
> Idioma de la interfaz y del código de dominio: **español**. Moneda: **Guaraníes (Gs.), sin decimales**.

---

## 1. Contexto y objetivo

Una aguatería (junta de saneamiento / comisión vecinal de agua) abastece a **~70 clientes**. Cada cliente tiene un medidor de agua. Una vez al mes el operador:

1. Toma la lectura de cada medidor.
2. El sistema calcula el consumo (lectura actual − lectura anterior).
3. El sistema calcula el monto a cobrar según la tarifa vigente.
4. Se emite la factura/recibo del mes.
5. Se registran los pagos y se controla la deuda.

**Objetivo del MVP:** que una sola persona (el administrador) pueda registrar lecturas, generar cobros mensuales, registrar pagos y ver quién debe, de forma simple, rápida y sin depender de internet.

### Fuera de alcance (por ahora)

- Facturación electrónica oficial (SIFEN). Solo se emite un **recibo/comprobante interno** imprimible.
- Contabilidad completa, inventario, planillas de sueldo.
- App móvil nativa. La web debe ser **responsive** para cargar lecturas desde el celular.
- Portal para clientes.

---

## 2. Usuarios y roles

| Rol               | Descripción                  | Permisos                                                                           |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| **Administrador** | Dueño/encargado              | Todo, incluida configuración de tarifas y anulaciones                              |
| **Operador**      | Lectura de medidores y cobro | Cargar lecturas, registrar pagos, ver clientes. No puede cambiar tarifas ni anular |

MVP: login simple con usuario y contraseña, gestionado por **Better Auth** (sesión por cookie HttpOnly). Un solo administrador inicial creado por script de seed.

---

## 3. Stack técnico recomendado

Stack **100% TypeScript**: SPA en React + API REST en Hono + PostgreSQL, en un monorepo (pnpm workspaces).

**Frontend (`apps/web`)**

- **React 18** + **TypeScript** + **Vite**
- **shadcn/ui** (sobre Tailwind CSS y Radix) para toda la UI: tablas, diálogos, inputs, toasts
- **React Hook Form** + **Zod** (`@hookform/resolvers/zod`) para formularios y validación
- **TanStack Query** + **Axios** para el consumo de la API (instancia de Axios con `baseURL` y `withCredentials: true`; hooks `useQuery`/`useMutation` por módulo)
- React Router (rutas)
- Recharts (gráfico de historial de consumo)
- Impresión de recibos: componente React con CSS `@media print`
- Tests: Vitest + React Testing Library
- Diseño **mobile-first** (la carga de lecturas se usa desde el celular)

**Backend (`apps/api`)**

- **Hono** sobre Node 22 (`@hono/node-server`), API JSON bajo `/api/v1`
- Validación de entrada con **Zod** (`@hono/zod-validator`)
- **Drizzle ORM** + `drizzle-kit` (migraciones) + driver `postgres` (postgres.js) o `pg`
- **Better Auth** con adaptador de Drizzle: autenticación por sesión (cookie HttpOnly), plugin `username` para login con usuario/contraseña y plugin `admin` para los roles (`admin`, `operador`). Se monta en `/api/auth/*`.
- Middleware de Hono que exige sesión válida y chequea el rol en las rutas protegidas
- Tests: Vitest contra una base Postgres de prueba

**Paquete compartido (`packages/shared`)**

- Esquemas **Zod** y tipos TypeScript usados por la API y por el frontend (DTOs, enums de estados, etc.), para tener un único contrato.

**Base de datos**

- **PostgreSQL 18**
- Dinero: `bigint` con `mode: 'number'` (Gs. enteros, entran de sobra en un `number`). Medidas en m³: `numeric(10,2)` (Drizzle lo devuelve como `string`; operar con `decimal.js` o con centésimas enteras, nunca con `float`). Fechas: `date` / `timestamp with time zone`.
- Enums con `pgEnum` de Drizzle. Índices en `cliente_id`, `periodo_id`, `factura_id` y `unique(periodo_id, cliente_id)` en lecturas.

**Infraestructura (sin Docker)**

- **PostgreSQL local** instalado como servicio de Windows, con la base `aguateria` creada una sola vez.
- Un solo comando `pnpm dev` levanta la API (Hono en `:3001`) y el frontend (Vite en `:5173`) en paralelo; Vite hace proxy de `/api` hacia la API.
- Variables de entorno en `.env` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, `VITE_API_URL`).
- CORS con `credentials: true` y origen explícito del frontend (necesario por la cookie de sesión).
- Producción: `pnpm build` y la API sirve también el build estático del frontend (o se publica con un servicio de Windows / pm2).

### Estructura de carpetas sugerida

```
aguateria/
├── .env.example
├── pnpm-workspace.yaml
├── package.json
├── README.md
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts           # app Hono + server
│   │   │   ├── env.ts             # variables de entorno validadas con Zod
│   │   │   ├── auth.ts            # configuración de Better Auth
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # conexión Drizzle
│   │   │   │   └── schema/        # tablas Drizzle (negocio + las de Better Auth)
│   │   │   ├── middleware/        # requireAuth, requireRole, manejo de errores
│   │   │   ├── services/          # reglas de negocio (tarifas, facturación, pagos)
│   │   │   └── routes/            # clientes, lecturas, facturas, pagos, reportes, tarifas, config
│   │   ├── drizzle/               # migraciones generadas
│   │   ├── scripts/
│   │   │   ├── seed.ts            # admin inicial + tarifa de ejemplo + clientes de prueba
│   │   │   ├── backup.ps1         # pg_dump (Windows)
│   │   │   └── backup.sh          # pg_dump (Linux/macOS)
│   │   ├── tests/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── lib/               # axios, queryClient, authClient (Better Auth), formateo de Gs./fechas
│       │   ├── api/               # hooks de TanStack Query por módulo
│       │   ├── components/        # ui/ (shadcn) + componentes propios (inputs numéricos Gs., tablas)
│       │   ├── pages/             # Login, Dashboard, Clientes, Lecturas, Facturas, Pagos, Tarifas, Reportes, Config
│       │   ├── features/          # lógica y formularios por módulo
│       │   └── main.tsx
│       ├── index.html
│       └── package.json
└── packages/
    └── shared/                    # esquemas Zod + tipos compartidos
```

---

## 4. Modelo de datos

### 4.1 Usuarios (gestionados por Better Auth)

Better Auth crea y administra sus propias tablas (`user`, `session`, `account`, `verification`). **No crear una tabla `usuarios` aparte**: se extiende la tabla `user` con los campos necesarios y las tablas de negocio referencian `user.id` (tipo `text`) en las columnas `usuario_id`.

| Campo (tabla `user`) | Tipo                  | Notas                             |
| -------------------- | --------------------- | --------------------------------- |
| id                   | text PK               | Generado por Better Auth          |
| name                 | text                  | Nombre completo                   |
| username             | text unique           | Plugin `username`                 |
| role                 | `admin` \| `operador` | Plugin `admin`                    |
| banned               | bool                  | Se usa como "usuario desactivado" |

La contraseña se guarda hasheada en la tabla `account`; la app no la maneja directamente.

> En el resto del modelo, los campos `usuario_id` (FK a usuarios) son `text` y apuntan a `user.id`.

### 4.2 `clientes`

| Campo         | Tipo                               | Notas                               |
| ------------- | ---------------------------------- | ----------------------------------- |
| id            | int PK                             |                                     |
| codigo        | str unique                         | Número de socio/cliente, ej. `0001` |
| nombre        | str                                | Nombre completo o razón social      |
| ci_ruc        | str nullable                       | Cédula o RUC                        |
| telefono      | str nullable                       |                                     |
| direccion     | str                                | Dirección / referencia / manzana    |
| fecha_alta    | date                               |                                     |
| estado        | enum(`activo`,`suspendido`,`baja`) | `suspendido` = corte de servicio    |
| observaciones | text nullable                      |                                     |

### 4.3 `medidores`

Un cliente puede cambiar de medidor (rotura, reemplazo), por eso es tabla aparte.

| Campo             | Tipo          | Notas                              |
| ----------------- | ------------- | ---------------------------------- |
| id                | int PK        |                                    |
| cliente_id        | FK clientes   |                                    |
| numero_serie      | str           |                                    |
| lectura_inicial   | decimal(10,2) | m³ al momento de instalación       |
| fecha_instalacion | date          |                                    |
| fecha_retiro      | date nullable |                                    |
| activo            | bool          | Solo un medidor activo por cliente |

### 4.4 `tarifas`

Una tarifa vigente por rango de fechas, para conservar historial.

| Campo         | Tipo          | Notas                                       |
| ------------- | ------------- | ------------------------------------------- |
| id            | int PK        |                                             |
| nombre        | str           | ej. "Tarifa 2026"                           |
| vigente_desde | date          |                                             |
| vigente_hasta | date nullable | null = vigente actual                       |
| cargo_fijo    | int           | Gs. por mes (incluye consumo mínimo)        |
| m3_incluidos  | decimal       | m³ incluidos en el cargo fijo (puede ser 0) |

### 4.5 `tarifa_tramos`

Precio por m³ excedente, escalonado.

| Campo     | Tipo             | Notas                                       |
| --------- | ---------------- | ------------------------------------------- |
| id        | int PK           |                                             |
| tarifa_id | FK tarifas       |                                             |
| desde_m3  | decimal          | Inicio del tramo (después de los incluidos) |
| hasta_m3  | decimal nullable | null = sin límite                           |
| precio_m3 | int              | Gs. por m³ en este tramo                    |

> Si la aguatería cobra un precio plano por m³, se define un único tramo `0 → null`.

### 4.6 `periodos`

| Campo             | Tipo                                  | Notas |
| ----------------- | ------------------------------------- | ----- |
| id                | int PK                                |       |
| anio              | int                                   |       |
| mes               | int                                   | 1–12  |
| estado            | enum(`abierto`,`facturado`,`cerrado`) |       |
| fecha_vencimiento | date                                  |       |
| unique(anio, mes) |                                       |       |

### 4.7 `lecturas`

| Campo                          | Tipo          | Notas                                      |
| ------------------------------ | ------------- | ------------------------------------------ |
| id                             | int PK        |                                            |
| periodo_id                     | FK periodos   |                                            |
| cliente_id                     | FK clientes   |                                            |
| medidor_id                     | FK medidores  |                                            |
| lectura_anterior               | decimal(10,2) | Se autocompleta con la lectura previa      |
| lectura_actual                 | decimal(10,2) | Ingresada por el operador                  |
| consumo_m3                     | decimal(10,2) | `actual − anterior` (calculado y guardado) |
| fecha_lectura                  | date          |                                            |
| usuario_id                     | FK usuarios   | Quién cargó                                |
| observacion                    | text nullable | "medidor trabado", "casa cerrada", etc.    |
| unique(periodo_id, cliente_id) |               |                                            |

### 4.8 `facturas` (recibos de cobro mensual)

| Campo             | Tipo                                           | Notas                                                 |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------- |
| id                | int PK                                         |                                                       |
| numero            | str unique                                     | Correlativo interno, ej. `2026-11-0001`               |
| periodo_id        | FK periodos                                    |                                                       |
| cliente_id        | FK clientes                                    |                                                       |
| lectura_id        | FK lecturas nullable                           |                                                       |
| consumo_m3        | decimal                                        | Snapshot                                              |
| cargo_fijo        | int                                            | Snapshot                                              |
| monto_consumo     | int                                            | Excedente calculado                                   |
| otros_cargos      | int                                            | default 0 (reconexión, multa, etc.)                   |
| saldo_anterior    | int                                            | Deuda arrastrada al emitir                            |
| total             | int                                            | `cargo_fijo + monto_consumo + otros_cargos` (del mes) |
| total_a_pagar     | int                                            | `total + saldo_anterior`                              |
| estado            | enum(`pendiente`,`parcial`,`pagada`,`anulada`) |                                                       |
| fecha_emision     | date                                           |                                                       |
| fecha_vencimiento | date                                           |                                                       |

> **Importante:** guardar _snapshots_ de los montos. Si la tarifa cambia después, las facturas ya emitidas no deben modificarse.

### 4.9 `pagos`

| Campo      | Tipo                                    | Notas                                 |
| ---------- | --------------------------------------- | ------------------------------------- |
| id         | int PK                                  |                                       |
| cliente_id | FK clientes                             |                                       |
| factura_id | FK facturas nullable                    | Si se aplica a una factura específica |
| fecha      | date                                    |                                       |
| monto      | int                                     | Gs.                                   |
| metodo     | enum(`efectivo`,`transferencia`,`otro`) |                                       |
| referencia | str nullable                            | Nº de transferencia, etc.             |
| usuario_id | FK usuarios                             |                                       |
| anulado    | bool                                    | default false                         |

### 4.10 `cargos_extra` (opcional en MVP)

Para multas, reconexiones, mano de obra, etc.: `id, cliente_id, concepto, monto, fecha, facturado (bool)`.

### 4.11 `auditoria` (recomendado)

`id, usuario_id, accion, entidad, entidad_id, detalle(json), fecha`. Registrar: edición de lecturas, anulación de facturas/pagos, cambios de tarifa.

---

## 5. Reglas de negocio

### 5.1 Cálculo del consumo

```
consumo_m3 = lectura_actual − lectura_anterior
```

- Si `lectura_actual < lectura_anterior` → **error de validación** (salvo que se marque "cambio de medidor", en cuyo caso se usa la lectura inicial del nuevo medidor).
- Si el consumo es **mayor a 3× el promedio** de los últimos 3 meses del cliente → mostrar **advertencia** (posible error de tipeo o fuga), permitir confirmar.
- Si el cliente está `suspendido`, no se genera lectura obligatoria, pero sí se permite cargar.

### 5.2 Cálculo del monto

```
excedente_m3 = max(0, consumo_m3 − tarifa.m3_incluidos)
monto_consumo = Σ (m3 del excedente que cae en cada tramo × precio_m3 del tramo)
total_mes = cargo_fijo + monto_consumo + otros_cargos
```

**Ejemplo:** cargo fijo 30.000 Gs. incluye 10 m³. Tramo 1: 0–20 m³ excedentes a 3.000 Gs./m³. Tramo 2: >20 m³ a 5.000 Gs./m³.
Consumo de 35 m³ → excedente 25 m³ → 20×3.000 + 5×5.000 = 85.000 → total mes = **115.000 Gs.**

Todos los montos se redondean a **enteros** (Gs. no tiene decimales). Usar enteros o `Decimal`, **nunca `float`**, para dinero.

### 5.3 Ciclo mensual

1. **Abrir período** (mes/año, fecha de vencimiento). Crea filas de lectura vacías para cada cliente activo, con `lectura_anterior` ya cargada.
2. **Cargar lecturas** (pantalla rápida, ver 6.3).
3. **Generar facturas** del período: solo para clientes con lectura cargada. Los que faltan se listan como "sin lectura" para completar.
4. **Cerrar período** cuando todo está facturado. Un período cerrado no permite editar lecturas (solo admin puede reabrir).

### 5.4 Pagos y deuda

- Un pago se aplica a la **factura más antigua pendiente** (FIFO) salvo que se elija una factura específica.
- Pagos parciales permitidos → factura pasa a `parcial`.
- Pago mayor a la deuda → queda como **saldo a favor** del cliente.
- `saldo_cliente = Σ facturas (no anuladas) − Σ pagos (no anulados)`. Positivo = debe; negativo = a favor.
- Anular un pago o factura requiere rol admin y deja registro en auditoría. **No se borran registros**, solo se marcan como anulados.

### 5.5 Mora y corte (configurable)

- Parámetro `meses_para_corte` (default 2): clientes con deuda ≥ ese número de facturas vencidas aparecen en el listado **"Candidatos a corte"**.
- Parámetro opcional `recargo_mora` (monto fijo o %): se agrega como `otros_cargos` en la siguiente factura. Desactivado por defecto.
- Al cambiar estado a `suspendido` se registra fecha; al reconectar se puede agregar un cargo de reconexión.

---

## 6. Pantallas / funcionalidades del MVP

### 6.1 Login

Usuario + contraseña. Sesión por cookie.

### 6.2 Dashboard

- Total de clientes activos / suspendidos.
- Total facturado del mes, total cobrado, total pendiente.
- Lecturas cargadas vs. faltantes del período actual.
- Accesos directos: "Cargar lecturas", "Registrar pago", "Morosos".

### 6.3 Carga de lecturas (pantalla principal de uso diario)

Debe ser **rápida y usable desde el celular**:

- Selector de período (por defecto el abierto).
- Lista de clientes ordenada por código (o por ruta/manzana si se agrega).
- Por cada cliente: código, nombre, lectura anterior (solo lectura), **campo de lectura actual**, consumo calculado en vivo, observación opcional.
- Guardado por fila con mutación de TanStack Query (actualización optimista, sin recargar). Al guardar, pasar el foco al siguiente cliente. Teclado numérico en móvil (`inputMode="decimal"`).
- Indicador visual: ✅ cargada, ⚠️ consumo atípico, ❌ pendiente.
- Buscador por nombre o código.

### 6.4 Clientes (CRUD)

- Listado con búsqueda y filtro por estado.
- Alta / edición / baja lógica.
- Ficha del cliente: datos, medidor activo, **historial de consumo** (tabla + gráfico simple de últimos 12 meses), facturas, pagos, saldo.

### 6.5 Facturación

- Botón "Generar facturas del período".
- Vista previa antes de confirmar (lista con consumo y monto por cliente).
- Impresión de **recibo individual** y **impresión masiva** de todos los recibos del mes (para entregar casa por casa).

**Contenido del recibo:** nombre de la aguatería, nº de recibo, cliente, código, dirección, período, lectura anterior/actual, consumo, detalle del cálculo (cargo fijo, excedente, otros cargos), saldo anterior, **total a pagar**, fecha de vencimiento.

### 6.6 Pagos

- Buscar cliente → ver deuda → ingresar monto, método, fecha → guardar.
- Comprobante de pago imprimible.
- Listado de pagos del día / rango (cierre de caja simple).

### 6.7 Tarifas (solo admin)

- Crear nueva tarifa con cargo fijo, m³ incluidos y tramos.
- Al crear una nueva, la anterior se cierra automáticamente (`vigente_hasta`).
- Calculadora de prueba: "¿Cuánto se cobra por X m³?"

### 6.8 Reportes

1. **Morosos:** clientes con deuda, monto, meses de atraso. Exportable a CSV/Excel.
2. **Consumo por período:** consumo total en m³ y por cliente.
3. **Recaudación:** pagos por rango de fechas y método.
4. **Estado de cuenta por cliente** (imprimible).
5. **Pérdidas / diferencia** (opcional): si hay medidor general, comparar m³ entregados vs. m³ facturados.

### 6.9 Configuración

- Datos de la aguatería (nombre, dirección, teléfono, RUC, logo).
- Día de vencimiento por defecto, meses para corte, recargo por mora.
- Gestión de usuarios (admin).

### 6.10 Backup

- Script `scripts/backup.ps1` (Windows) / `backup.sh` (Linux) con `pg_dump` para copia automática diaria (Programador de tareas / cron) a otra carpeta/USB o almacenamiento externo, con retención de los últimos N días.
- Documentar en el README cómo restaurar con `pg_restore`.
- Opcional: botón "Descargar backup" para el admin (el backend ejecuta `pg_dump` y devuelve el archivo).

---

## 7. Endpoints principales (referencia)

Todos bajo el prefijo `/api/v1`, JSON, protegidos por la sesión de Better Auth (cookie). Las rutas de autenticación las provee Better Auth en `/api/auth/*`. Listados con paginación (`?page=&size=`) y filtros por query string. Toda entrada se valida con Zod y los errores devuelven `{ error, details }` con el código HTTP correcto.

```
ALL    /api/auth/*           (Better Auth: sign-in, sign-out, sesión)

GET    /clientes                     GET/PUT /clientes/{id}
POST   /clientes                     GET     /clientes/{id}/historial

GET    /periodos                     POST    /periodos            (abrir)
POST   /periodos/{id}/cerrar

GET    /lecturas?periodo_id=         PUT     /lecturas/{id}       (guardar lectura)

POST   /periodos/{id}/facturar       GET     /facturas?periodo_id=
GET    /facturas/{id}/imprimir       POST    /facturas/{id}/anular

POST   /pagos                        POST    /pagos/{id}/anular
GET    /clientes/{id}/estado-cuenta

GET/POST /tarifas

GET    /reportes/morosos | /consumo | /recaudacion      (?formato=csv)
GET    /backup
```

---

## 8. Validaciones y casos borde

- No permitir dos lecturas del mismo cliente en el mismo período.
- No permitir facturar un período dos veces el mismo cliente (idempotencia).
- Cliente nuevo a mitad de mes: primera lectura usa `lectura_inicial` del medidor.
- Cambio de medidor: cerrar el medidor viejo (`fecha_retiro`), crear nuevo con su lectura inicial; el consumo de ese mes se calcula como `(lectura_final_viejo − anterior) + (actual_nuevo − inicial_nuevo)` o se ingresa manualmente con observación.
- Cliente sin lectura (casa cerrada / medidor trabado): permitir facturar **consumo promedio** o solo cargo fijo, con observación (configurable).
- Fechas en zona horaria **America/Asuncion**. Formato de fecha `dd/mm/aaaa` en pantalla. Números con separador de miles `.` (ej. `115.000 Gs.`).

---

## 9. Plan de implementación sugerido (fases)

**Fase 1 — Base**

1. Monorepo pnpm (`apps/api`, `apps/web`, `packages/shared`), PostgreSQL local como servicio de Windows, Hono + Drizzle + `drizzle-kit` en la API; Vite + React + TS + Tailwind + shadcn/ui + React Router + TanStack Query + Axios en el frontend.
2. Modelos del punto 4 + migración inicial.
3. Auth con Better Auth (login por usuario, roles admin/operador, middleware `requireAuth`/`requireRole`, pantalla de login) + script `seed.ts` (admin, tarifa de ejemplo, 5 clientes de prueba).

**Fase 2 — Núcleo** 4. CRUD de clientes y medidores. 5. Tarifas + servicio de cálculo (`services/tarifas.ts`) **con tests unitarios** (casos: consumo menor al incluido, un tramo, varios tramos, consumo 0). 6. Períodos + carga de lecturas (pantalla 6.3).

**Fase 3 — Cobranza** 7. Generación de facturas + recibo imprimible. 8. Pagos, aplicación FIFO, saldos, estado de cuenta.

**Fase 4 — Control** 9. Dashboard y reportes (morosos, consumo, recaudación) con exportación CSV. 10. Auditoría, backup, configuración.

**Fase 5 — Pulido** 11. Responsive/mobile en carga de lecturas, impresión masiva, mensajes de error claros. 12. README con instrucciones de instalación y uso para el administrador.

---

## 10. Criterios de aceptación del MVP

- [ ] Se pueden cargar las 70 lecturas mensuales en menos de 10 minutos desde el celular.
- [ ] El monto calculado coincide con los ejemplos de la sección 5.2 (tests automáticos).
- [ ] Cambiar la tarifa no altera facturas ya emitidas.
- [ ] Se puede ver quién debe y cuánto en una sola pantalla.
- [ ] Un recibo se puede imprimir con el detalle del cálculo.
- [ ] Ningún dato se borra físicamente; anulaciones quedan auditadas.
- [ ] Hay un backup descargable con un clic.
- [ ] La app completa (db + api + web) levanta con `pnpm dev` (PostgreSQL local como servicio de Windows).
- [ ] Las migraciones de Drizzle crean todo el esquema desde cero y `seed.ts` carga datos de prueba.
- [ ] Un operador no puede acceder a tarifas, anulaciones ni gestión de usuarios (verificado en la API, no solo ocultando botones).

---

## 11. Supuestos a confirmar con el cliente

Estos puntos cambian detalles del diseño; si no se confirman, usar el valor por defecto indicado:

1. **Tarifa:** ¿cargo fijo + tramos, o precio plano por m³? _(Default: cargo fijo con m³ incluidos + tramos configurables.)_
2. **¿Todos los clientes tienen medidor?** Si algunos pagan cuota fija sin medidor, agregar campo `tipo_cobro` (`medido` / `cuota_fija`). _(Default: todos medidos.)_
3. **¿Cobra recargo por mora o multa?** _(Default: no.)_
4. **¿Entrega recibo impreso o por WhatsApp?** _(Default: impreso; WhatsApp queda para fase futura con enlace `wa.me`.)_
5. **¿Hay zonas o rutas de lectura?** _(Default: orden por código.)_
6. **¿Necesita factura legal con timbrado?** _(Default: no, solo recibo interno.)_
7. **¿Dónde correrá?** PC de escritorio, notebook o servidor en la nube (Postgres instalado en la PC local, o un VPS / Neon / Supabase). _(Default: local, acceso por red Wi‑Fi del local.)_

---

## 12. Instrucciones para opencode

- **Sin Docker:** PostgreSQL corre como servicio local de Windows y `pnpm dev` levanta API + web. El `README.md` explica cómo crear la base y el usuario.
- Implementar **por fases** (sección 9), confirmando con tests al final de cada una.
- Priorizar **simplicidad**: sin microservicios, colas ni Docker. PostgreSQL local y `pnpm dev` para todo el entorno.
- Dinero siempre en **enteros** (Gs.); m³ con `decimal.js` o centésimas enteras; nunca `float` para cálculos. En el frontend, formatear con `Intl.NumberFormat('es-PY')`.
- **El cálculo de tarifas y saldos vive solo en el backend** (`services/`); el frontend solo muestra resultados (usar un endpoint de simulación para la calculadora de tarifas y el consumo en vivo).
- Los esquemas Zod y tipos van en `packages/shared` y se reutilizan en API y frontend; no duplicar tipos a mano.
- TypeScript en modo `strict`; sin `any`. ESLint + Prettier configurados en el monorepo.
- Los formularios usan React Hook Form + el mismo esquema Zod del paquete compartido.
- Autenticación solo con Better Auth; no implementar JWT ni hashing de contraseñas a mano.
- Escribir tests para: cálculo de tarifa, consumo, aplicación de pagos y saldos.
- Textos de interfaz y mensajes de error en **español (Paraguay)**.
- Incluir datos de ejemplo en `seed.ts` para poder probar todo de inmediato.
- Documentar en el `README.md` cómo instalar, ejecutar, respaldar y restaurar.
