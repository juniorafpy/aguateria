# Despliegue en Vercel + Supabase

Arquitectura del despliegue:

- **Frontend** (`apps/web`): build estático de Vite publicado por Vercel.
- **API** (`apps/api`): función serverless en `api/index.ts` (runtime Node.js).
- **Base de datos**: Supabase (PostgreSQL). Vercel solo se conecta, no aloja la base.

## Variables de entorno (Vercel)

Configurar en **Project Settings → Environment Variables → Production**:

| Variable             | Valor                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Pooler de Supabase, puerto **6543**, con `?sslmode=require`                            |
| `BETTER_AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres (64 hex recomendado)                      |
| `BETTER_AUTH_URL`    | `https://aguateria-one.vercel.app`                                                     |
| `CORS_ORIGINS`       | `https://aguateria-one.vercel.app`                                                     |
| `VITE_API_URL`       | vacío (el frontend usa `/api/v1` en el mismo dominio)                                  |

Formato de la cadena de Supabase:

```
postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?sslmode=require
```

> Usar el **transaction pooler (6543)**, no la conexión directa ni el session pooler (5432):
> en serverless se abren muchas conexiones cortas y el pooler de transacciones las reutiliza.
> El cliente ya está configurado con `prepare: false` y `max: 1` para este modo.

## Desplegar

Con la CLI (el proyecto ya está linkeado en `.vercel/`):

```powershell
pnpm dlx vercel@latest --prod
```

O hacer push a `main`: el repositorio está conectado a Vercel y despliega automáticamente.

El build lo define `vercel.json`:

```json
{
  "buildCommand": "pnpm -r build",
  "outputDirectory": "apps/web/dist"
}
```

`pnpm -r build` compila `apps/api` a `apps/api/dist` **antes** de empaquetar la función
`api/index.ts`, que importa ese bundle.

## Migraciones y datos

Se ejecutan desde la máquina local apuntando a Supabase (el `.env` de la raíz):

```powershell
pnpm db:migrate   # aplica migraciones de Drizzle
pnpm db:seed      # datos iniciales (solo la primera vez)
```

El seed crea los usuarios `admin` / `admin1234` y `operador` / `operador1234`.

## Usuarios y contraseñas

Después del primer login, entrá a **Usuarios** con la cuenta `admin` y:

1. Cambiá la contraseña de `admin` con el botón de la llave.
2. Cambiá la contraseña de `operador` o desactivalo si no se va a usar.
3. Creá una cuenta nominal para cada persona que use el sistema. No compartas la cuenta
   `admin` entre varias personas.

Reglas de seguridad implementadas:

- Solo los administradores ven y usan la pantalla **Usuarios**.
- No se puede desactivar el propio usuario ni quitar el rol al último administrador activo.
- Resetear la contraseña de otro usuario revoca sus sesiones activas.
- Desactivar una cuenta invalida sus sesiones y le impide volver a ingresar.

## Respaldos y restauración

### Respaldo JSON desde la app

Con una sesión de administrador, **Configuración → Respaldo → Descargar respaldo JSON**
genera un snapshot lógico con todas las tablas de negocio. Es útil para inspección o para
recuperar registros puntuales, pero no reemplaza al dump de PostgreSQL.

### Respaldo automático diario

El workflow `.github/workflows/backup.yml` corre todos los días a las 06:00 UTC (03:00 en
Asunción) y también se puede ejecutar manualmente desde **Actions → Respaldo de base de
datos → Run workflow**.

Configuración única:

1. En Supabase, **Project Settings → Database → Connection string**. Usá la conexión
   **directa** o el **session pooler** (puerto **5432**, `sslmode=require`), no el
   transaction pooler.
2. En GitHub, **Settings → Secrets and variables → Actions → New repository secret**.
3. Nombre: `SUPABASE_DB_URL`. Valor: la cadena directa de Supabase.

El workflow genera un dump de los esquemas `public` y `drizzle`, calcula su SHA-256, lo
restaura en un PostgreSQL 17 temporal para verificar que sirve, consulta las tablas
principales y publica el dump como artefacto durante **30 días**.

> El artefacto contiene datos personales y hashes de contraseñas. Descargalo solo a equipos
> autorizados.

### Restaurar un dump

1. Descargá el artefacto desde la ejecución del workflow y descomprimilo.
2. Probá primero la restauración en una base de staging.
3. Para restaurar sobre producción, detené las escrituras (o usá una ventana de
   mantenimiento) y ejecutá con una versión de `pg_restore` igual o más nueva que la del
   servidor:

```powershell
pg_restore --clean --if-exists --no-owner --no-privileges `
  --dbname "$env:DATABASE_URL" .\aguateria-2026-11-15.dump
```

4. Verificá `GET /api/health`, iniciá sesión y revisá el dashboard y la última factura.

El dump incluye la tabla `drizzle.__drizzle_migrations`, así que después de restaurar podés
seguir aplicando migraciones con `pnpm db:migrate` sin que Drizzle intente recrear tablas
existentes.

## Verificar el deploy

```powershell
curl https://aguateria-one.vercel.app/api/health
# {"ok":true,"servicio":"aguateria-api"}

curl -i https://aguateria-one.vercel.app/api/auth/get-session
```

Y probar el login desde el navegador en `https://aguateria-one.vercel.app/login`.

Con una sesión de administrador, verificar además:

| Ruta                          | Qué comprueba                                          |
| ----------------------------- | ------------------------------------------------------ |
| `/usuarios`                   | Alta, edición, contraseña y estado de usuarios          |
| `/mora`                       | Candidatos a corte y servicios suspendidos              |
| `/configuracion` → Respaldo   | Descarga del snapshot JSON                              |
| `GET /api/v1/backup`          | Respaldo JSON autenticado (solo admin)                  |
| `GET /api/v1/mora/candidatos` | Reporte de mora con `mesesParaCorte` y `recargoMora`    |

## Notas

- La función debe exportar el Web Standard `fetch` (`export default { fetch }`). Un
  `export default` que devuelve un `Response` se ignora en el runtime Node y la petición
  queda colgada hasta el timeout.
- La región de las funciones está fijada en `iad1` (cerca de la base en `us-east-2`) para
  reducir la latencia de cada consulta.
- Si Supabase está en el plan gratuito, el proyecto se pausa tras varios días sin actividad;
  la primera petición después de la pausa puede tardar o fallar hasta que se reactive.
