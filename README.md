# Aguatería ERP

Sistema de gestión para una aguatería comunitaria: padrón de clientes, lecturas de medidor,
facturación mensual, cobros, deuda y reportes. Interfaz en español (Paraguay), pensada para
usarse desde el celular en la calle y desde la oficina en la computadora.

**Estado actual: Fase 5 completa.** Están listos el monorepo, la base de datos, la autenticación
con roles, el dashboard, el diseño responsive con modo claro/oscuro, el circuito de facturación y
pagos (generación de facturas del período, recibos individuales y masivos, registro de pagos con
aplicación FIFO, saldo a favor y anulaciones auditadas), la gestión de clientes con alta, edición,
instalación de medidores e historial de lecturas, la carga de lecturas con guardado por fila,
consumo en vivo y alerta de consumo atípico, la administración de tarifas con calculadora de
consumo, el estado de cuenta por cliente, el cierre de caja, la gestión de períodos, los reportes
con exportación CSV, y la configuración y auditoría visibles. Los respaldos se generan con los
scripts incluidos. El uso diario está documentado en el
[manual del administrador](./docs/MANUAL_ADMINISTRADOR.md).

---

## Stack

| Capa          | Tecnología                                                                         |
| ------------- | ---------------------------------------------------------------------------------- |
| Monorepo      | pnpm workspaces + TypeScript estricto                                              |
| Frontend      | React 19 + Vite + Tailwind CSS v4 + componentes shadcn/ui + TanStack Query + Axios |
| Backend       | Hono + Drizzle ORM + PostgreSQL 18                                                 |
| Autenticación | Better Auth (usuario/contraseña, plugins `username` y `admin`)                     |
| Validación    | Zod compartido entre API y web (`packages/shared`)                                 |
| Tests         | Vitest (reglas de negocio) + Playwright (flujo en navegador)                       |

**Reglas del dominio**

- Dinero en **guaraníes enteros** (`bigint`), sin decimales. Se muestra con
  `Intl.NumberFormat("es-PY")`, por ejemplo `115.000 Gs.`.
- Consumo en **m³** con `numeric(10,2)`; los cálculos usan centésimas enteras, nunca `float`.
- Fechas en pantalla `dd/mm/aaaa`; timestamps en zona horaria `America/Asuncion`.
- Los cálculos de tarifas y saldos viven **solo en el backend**.

---

## Requisitos

- **Node.js 22 o superior**
- **pnpm 12** (`npm install -g pnpm`)
- **PostgreSQL 18** instalado como servicio local de Windows (o el motor equivalente en
  Linux/macOS). No se usa Docker.

> En Windows, si PowerShell bloquea los scripts de pnpm, usá `pnpm.cmd` en lugar de `pnpm`,
> o ejecutá los comandos desde `cmd.exe`.

---

## Puesta en marcha (Windows)

### 1. Crear la base de datos

Con PostgreSQL corriendo como servicio:

```powershell
$env:PGPASSWORD='TU_PASSWORD_DE_POSTGRES'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost `
  -c "CREATE DATABASE aguateria;"
```

Si la base ya existe, el comando devuelve un error de duplicado y se puede ignorar.

### 2. Configurar las variables de entorno

```powershell
Copy-Item .env.example .env
```

Editá `.env`:

```dotenv
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/aguateria
BETTER_AUTH_SECRET=un_secreto_largo_de_al_menos_32_caracteres
BETTER_AUTH_URL=http://localhost:3001
PORT=3001
CORS_ORIGINS=http://localhost:5173
VITE_API_URL=
```

- `DATABASE_URL`: usuario, contraseña, host, puerto y nombre de la base. Si la contraseña
  contiene caracteres especiales (`@`, `:`, `/`, `#`), codificalos en la URL (por ejemplo,
  `@` se escribe `%40`).
- `BETTER_AUTH_SECRET`: mínimo 32 caracteres. Para generar uno:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `VITE_API_URL` vacío hace que Vite use el proxy `/api` hacia la API local.

### 3. Instalar dependencias, migrar y cargar datos de ejemplo

```powershell
pnpm install
pnpm db:migrate
pnpm db:seed
```

El seed es idempotente: se puede volver a ejecutar sin duplicar usuarios, clientes ni
períodos. Carga:

- Usuarios `admin` (rol administrador) y `operador` (rol operador).
- 8 clientes de prueba con su medidor.
- Tarifa 2026: cargo fijo de 30.000 Gs., 10 m³ incluidos y dos tramos de excedente.
- Período del mes en curso, abierto, con vencimiento el día 10 del mes siguiente.
- Configuración básica de la aguatería.

### 4. Levantar la aplicación

```powershell
pnpm dev
```

| Servicio        | URL                          |
| --------------- | ---------------------------- |
| Aplicación web  | http://localhost:5173        |
| API             | http://localhost:3001        |
| Salud de la API | http://localhost:3001/health |

### 5. Ingresar

| Usuario    | Contraseña     | Rol           |
| ---------- | -------------- | ------------- |
| `admin`    | `admin1234`    | Administrador |
| `operador` | `operador1234` | Operador      |

> Cambiá estas contraseñas antes de usar el sistema con datos reales.

---

## Comandos disponibles

Desde la raíz del repositorio:

| Comando            | Qué hace                                              |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Levanta API y web en paralelo con recarga en caliente |
| `pnpm build`       | Compila la API y genera el build estático de la web   |
| `pnpm test`        | Ejecuta los tests de todos los paquetes               |
| `pnpm lint`        | Analiza el código con ESLint                          |
| `pnpm format`      | Formatea con Prettier                                 |
| `pnpm db:generate` | Genera una migración a partir del esquema Drizzle     |
| `pnpm db:migrate`  | Aplica las migraciones pendientes                     |
| `pnpm db:seed`     | Carga los datos de ejemplo                            |
| `pnpm db:studio`   | Abre Drizzle Studio para inspeccionar la base         |
| `pnpm backup`      | Genera un respaldo con `pg_dump` (ver más abajo)      |

Comprobaciones puntuales:

```powershell
pnpm --filter @aguateria/api typecheck
pnpm --filter @aguateria/web typecheck
pnpm --filter @aguateria/api test
```

---

## Estructura del proyecto

```
aguateria/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts          # app Hono, CORS, montaje de rutas
│   │   │   ├── auth.ts           # Better Auth + plugins username/admin
│   │   │   ├── db/               # conexión y esquema Drizzle
│   │   │   ├── middleware/       # requireAuth, requireRole, errores
│   │   │   ├── routes/           # dashboard y rutas de la API
│   │   │   └── services/         # cálculo de tarifas (enteros)
│   │   ├── scripts/
│   │   │   ├── seed.ts           # usuarios, clientes, tarifa y período
│   │   │   ├── backup.ps1        # respaldo para Windows
│   │   │   └── backup.sh         # respaldo para Linux/macOS
│   │   ├── tests/                # Vitest
│   │   └── drizzle/              # migraciones SQL
│   └── web/
│       └── src/
│           ├── pages/            # login, dashboard y módulos del ERP
│           ├── components/       # UI, shell, navegación y diálogos de cada módulo
│           ├── lib/              # axios, authClient, tema, recibos imprimibles
│           └── api/              # consultas HTTP para TanStack Query
├── packages/
│   └── shared/                   # esquemas Zod, tipos y formateo
├── e2e/                          # tests de Playwright
├── docs/
│   └── MANUAL_ADMINISTRADOR.md   # guía de uso diario
├── design-system/                # lineamientos visuales persistidos
└── AGUATERIA_ERP.md              # especificación funcional completa
```

---

## Tests

### Reglas de negocio (Vitest)

```powershell
pnpm --filter @aguateria/api test
```

Cubren el cálculo de tarifas: consumo menor o igual a los m³ incluidos, consumo cero,
varios tramos, tramo plano, centésimas de m³ y huecos entre tramos. El caso de referencia
del spec (35 m³ → 115.000 Gs.) está incluido.

### Flujo en navegador (Playwright)

La primera vez hay que descargar Chromium:

```powershell
pnpm exec playwright install chromium
```

Después:

```powershell
pnpm exec playwright test
```

Los tests verifican, en escritorio y en celular:

- Login válido y acceso al dashboard.
- Credenciales inválidas con mensaje de error.
- Navegación inferior y menú lateral en móvil.
- Modo oscuro.
- Permisos de operador: no ve tarifas ni configuración y no puede entrar por URL.
- Ausencia de errores de consola y de scroll horizontal.

Playwright reutiliza los servidores que ya estén corriendo en `:5173` y `:3001`; si no,
ejecuta `pnpm dev` automáticamente. Las capturas quedan en `test-results/`.

---

## Backup y restauración

### Generar un respaldo

El script lee `DATABASE_URL` del `.env` de la raíz, ejecuta `pg_dump` en formato custom
(apto para `pg_restore`) y guarda el archivo en `backups/`.

```powershell
pnpm backup
```

O directamente, con parámetros opcionales:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File apps/api/scripts/backup.ps1 `
  -OutDir "D:\Respaldos\Aguateria" -RetentionDays 30
```

| Parámetro        | Valor por defecto    | Descripción                                              |
| ---------------- | -------------------- | -------------------------------------------------------- |
| `-OutDir`        | `backups` en la raíz | Carpeta de destino (puede ser un disco externo o de red) |
| `-RetentionDays` | `14`                 | Borra los respaldos más antiguos que N días              |
| `-PgDump`        | autodetectado        | Ruta explícita a `pg_dump.exe`                           |

El nombre del archivo es `aguateria_AAAA-MM-DD_HH-mm-ss.dump`.

En Linux/macOS:

```bash
bash apps/api/scripts/backup.sh /ruta/de/respaldos 14
```

### Programar el respaldo diario (Windows)

1. Abrir **Programador de tareas** → **Crear tarea básica**.
2. Frecuencia: diaria, por ejemplo a las 22:00.
3. Acción: **Iniciar un programa**.
4. Programa: `powershell.exe`
5. Argumentos:

```text
-NoProfile -ExecutionPolicy Bypass -File "C:\ruta\a\aguateria\apps\api\scripts\backup.ps1" -OutDir "D:\Respaldos\Aguateria" -RetentionDays 30
```

6. Marcar **Ejecutar tanto si el usuario inició sesión como si no** si la PC se usa con
   otra cuenta.

En Linux/macOS, agregar una línea al `crontab`:

```cron
0 22 * * * /ruta/a/aguateria/apps/api/scripts/backup.sh /ruta/de/respaldos 30
```

### Restaurar un respaldo

La forma más segura es restaurar en una base nueva y luego cambiar `DATABASE_URL`:

```powershell
$env:PGPASSWORD='TU_PASSWORD_DE_POSTGRES'
$pg = "C:\Program Files\PostgreSQL\18\bin"

& "$pg\createdb.exe" -U postgres -h localhost aguateria_restaurada
& "$pg\pg_restore.exe" -U postgres -h localhost -d aguateria_restaurada `
  --no-owner --role=postgres "backups\aguateria_2026-11-09_22-00-00.dump"
```

Para restaurar sobre la base actual:

1. Detener la API (`Ctrl+C` en `pnpm dev`).
2. Ejecutar:

```powershell
& "$pg\pg_restore.exe" -U postgres -h localhost -d aguateria `
  --clean --if-exists --no-owner --role=postgres "backups\archivo.dump"
```

3. Volver a levantar con `pnpm dev`.

> `--clean` elimina los objetos existentes antes de recrearlos. Hacé una copia del estado
> actual antes de restaurar sobre la base en uso.

### Restauración lógica alternativa

Si se dispone de un volcado SQL en texto plano (`pg_dump -Fp`), se puede aplicar con:

```powershell
& "$pg\psql.exe" -U postgres -h localhost -d aguateria -f "backups\aguateria.sql"
```

---

## Seguridad y roles

- La sesión se guarda en una cookie httpOnly administrada por Better Auth.
- `requireAuth` protege todas las rutas `/api/v1/*`.
- `requireRole("admin")` se aplica en el backend para las acciones sensibles; ocultar un
  botón en el frontend no reemplaza esa validación.
- El operador puede cargar lecturas y registrar pagos, pero no administrar tarifas,
  usuarios ni anulaciones.
- No se borran datos físicamente: las anulaciones se marcan y quedan auditadas.

---

## Solución de problemas

| Síntoma                                                | Causa probable                          | Solución                                          |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------- |
| `ECONNREFUSED 5432`                                    | PostgreSQL no está corriendo            | Iniciar el servicio `postgresql-x64-18`           |
| `password authentication failed`                       | Contraseña incorrecta en `DATABASE_URL` | Revisar `.env` y reiniciar `pnpm dev`             |
| `BETTER_AUTH_SECRET debe tener al menos 32 caracteres` | Secreto corto                           | Generar uno nuevo y reiniciar la API              |
| La web carga pero la API devuelve 401                  | Sesión vencida o cookie bloqueada       | Volver a iniciar sesión; confirmar `CORS_ORIGINS` |
| `pnpm` no se reconoce en PowerShell                    | Política de ejecución de scripts        | Usar `pnpm.cmd` o `cmd.exe`                       |
| Playwright no encuentra el navegador                   | Chromium no descargado                  | `pnpm exec playwright install chromium`           |

---

## Mejoras pendientes

- Gestión de usuarios y contraseñas desde la interfaz (hoy se usan los usuarios del seed).
- Botón para descargar el respaldo desde la app (los scripts ya existen).
- Impresión de recibos con diseño configurable y logo.
- Integración con facturación electrónica legal (SIFEN), fuera del alcance del MVP.

### Períodos y recibos masivos (implementados)

- `POST /api/v1/periodos` — abre un período y crea las lecturas pendientes.
- `POST /api/v1/periodos/{id}/cerrar` — cierra el período (solo admin).
- `POST /api/v1/periodos/{id}/reabrir` — lo vuelve a abrir (solo admin).
- `GET /api/v1/facturas/recibos?periodoId=` — todos los recibos vigentes del período.

La pantalla **Períodos** permite abrir, cerrar y reabrir el mes. Desde **Cobranzas** se pueden
imprimir todos los recibos en una sola ventana, uno por página, excluyendo las facturas anuladas.
El manual del administrador está en [`docs/MANUAL_ADMINISTRADOR.md`](./docs/MANUAL_ADMINISTRADOR.md).

### Reportes (implementado)

- `GET /api/v1/reportes/morosos` — clientes con facturas vencidas, deuda y meses de atraso.
- `GET /api/v1/reportes/consumo?periodoId=` — consumo del período por cliente y total.
- `GET /api/v1/reportes/recaudacion?desde=&hasta=` — pagos vigentes, por método y por día.
- Los tres aceptan `?formato=csv` y exportan con BOM UTF-8 para Excel.

### Configuración y auditoría (implementado)

- `GET/PUT /api/v1/configuracion` — datos de la aguatería y reglas de cobranza (solo admin).
- `GET /api/v1/auditoria` — movimientos de pagos, anulaciones y cambios de configuración (solo admin).

La pantalla de Configuración permite editar los datos institucionales y consultar la auditoría
paginada con usuario, acción, entidad y detalle.

### Estado de cuenta y cierre de caja (implementados)

- `GET /api/v1/clientes/{id}/estado-cuenta` — facturas, pagos, deuda y saldo a favor del cliente.
- `GET /api/v1/pagos/cierre?desde=&hasta=` — pagos vigentes del rango, total y desglose por método.

Ambos documentos son imprimibles desde la interfaz. El estado de cuenta muestra también los
comprobantes anulados para mantener la trazabilidad, pero no los incluye en los totales.

### Módulo de tarifas (implementado)

- `GET /api/v1/tarifas` — historial de tarifas con sus tramos.
- `GET /api/v1/tarifas/vigente` — tarifa vigente a la fecha.
- `POST /api/v1/tarifas` — alta de tarifa (solo admin); cierra automáticamente la anterior.
- `POST /api/v1/tarifas/simular` — calculadora de consumo con desglose por tramo.

Reglas implementadas: los tramos empiezan en 0 m³, son contiguos y solo el último puede quedar
sin límite; la nueva tarifa debe comenzar después de la vigente; el cálculo del monto vive en el
backend y el frontend solo muestra el desglose.

### Módulo de lecturas (implementado)

- `GET /api/v1/lecturas?periodoId=&q=&estado=` — padrón con lectura anterior, última lectura,
  promedio histórico y avance del período.
- `POST /api/v1/lecturas` — alta o corrección de una lectura (upsert por período y cliente).

Reglas implementadas: solo se editan períodos abiertos; la lectura no puede retroceder; el
consumo se calcula en el servidor; los consumos que superan 3× el promedio piden confirmación
(no bloquean); el guardado es por fila y el foco pasa al siguiente cliente.

### Módulo de clientes (implementado)

- `GET /api/v1/clientes` con búsqueda por nombre/código/CI-RUC y filtro por estado.
- `GET /api/v1/clientes/{id}` — ficha con medidores e historial de lecturas.
- `POST /api/v1/clientes` — alta con medidor opcional (solo admin).
- `PUT /api/v1/clientes/{id}` — edición de datos (solo admin).
- `POST /api/v1/clientes/{id}/medidores` — instala un medidor nuevo y retira el anterior (solo admin).

El operador puede consultar el padrón y la ficha de cada cliente, pero no crear ni editar
clientes ni medidores; la restricción se aplica en la API y en la interfaz.

### Módulo de cobranzas (implementado)

- `GET /api/v1/facturas` con filtros por período, cliente, estado y búsqueda.
- `GET /api/v1/facturas/preview?periodoId=` — vista previa antes de facturar.
- `POST /api/v1/periodos/{id}/facturar` — generación idempotente (solo clientes con lectura).
- `GET /api/v1/facturas/{id}` — detalle con lecturas y pagos aplicados.
- `POST /api/v1/facturas/{id}/anular` — solo admin, queda auditado.
- `GET/POST /api/v1/pagos` — listado con filtros y registro con aplicación FIFO o a una factura.
- `POST /api/v1/pagos/{id}/anular` — solo admin, recalcula el estado de la factura.

Reglas implementadas: pagos parciales, excedente como saldo a favor, saldo anterior arrastrado a
la factura siguiente, numeración correlativa por período (`F-AAAAMM-0001`) y recibos internos
imprimibles.

La especificación completa, el modelo de datos y los criterios de aceptación están en
[`AGUATERIA_ERP.md`](./AGUATERIA_ERP.md).
