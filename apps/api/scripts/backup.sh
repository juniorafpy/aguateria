#!/usr/bin/env bash
#
# Genera un respaldo de la base de datos de la aguatería con pg_dump.
# Lee DATABASE_URL desde el .env de la raíz y aplica retención por días.
#
# Uso:
#   bash apps/api/scripts/backup.sh [carpeta_destino] [dias_retencion]
#
# Ejemplo:
#   bash apps/api/scripts/backup.sh /mnt/respaldos/aguateria 30

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
OUT_DIR="${1:-$ROOT_DIR/backups}"
RETENTION_DAYS="${2:-14}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: no se encontró $ENV_FILE. Copiá .env.example y completá DATABASE_URL." >&2
  exit 1
fi

DATABASE_URL="$(grep -E '^[[:space:]]*DATABASE_URL[[:space:]]*=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: falta DATABASE_URL en $ENV_FILE." >&2
  exit 1
fi

if [[ "$DATABASE_URL" =~ ^postgres(ql)?://([^:]+):([^@]*)@([^:/]+):([0-9]+)/(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  DB_PASS="${BASH_REMATCH[3]}"
  DB_HOST="${BASH_REMATCH[4]}"
  DB_PORT="${BASH_REMATCH[5]}"
  DB_NAME="${BASH_REMATCH[6]}"
else
  echo "Error: DATABASE_URL no tiene el formato esperado." >&2
  echo "Formato: postgresql://usuario:password@host:puerto/base" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: no se encontró pg_dump en el PATH." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILE="$OUT_DIR/aguateria_$TIMESTAMP.dump"

echo "Respaldando la base '$DB_NAME' en:"
echo "  $FILE"

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$FILE"

echo "Respaldo creado correctamente ($(du -h "$FILE" | cut -f1))."

# Retención: elimina los respaldos más antiguos que N días.
find "$OUT_DIR" -maxdepth 1 -type f -name 'aguateria_*.dump' -mtime +"$RETENTION_DAYS" -print -delete

echo "Listo."
