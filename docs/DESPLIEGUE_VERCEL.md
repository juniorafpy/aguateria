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
**Cambiar esas contraseñas** antes de usar el sistema en producción.

## Verificar el deploy

```powershell
curl https://aguateria-one.vercel.app/api/health
# {"ok":true,"servicio":"aguateria-api"}

curl -i https://aguateria-one.vercel.app/api/auth/get-session
```

Y probar el login desde el navegador en `https://aguateria-one.vercel.app/login`.

## Notas

- La función debe exportar el Web Standard `fetch` (`export default { fetch }`). Un
  `export default` que devuelve un `Response` se ignora en el runtime Node y la petición
  queda colgada hasta el timeout.
- La región de las funciones está fijada en `iad1` (cerca de la base en `us-east-2`) para
  reducir la latencia de cada consulta.
- Si Supabase está en el plan gratuito, el proyecto se pausa tras varios días sin actividad;
  la primera petición después de la pausa puede tardar o fallar hasta que se reactive.
