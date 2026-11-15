#Requires -Version 5.1
<#
.SYNOPSIS
    Genera un respaldo de la base de datos de la aguatería con pg_dump.

.DESCRIPTION
    Lee DATABASE_URL desde el .env de la raíz, ejecuta pg_dump en formato custom
    (compatible con pg_restore) y aplica retención sobre los respaldos anteriores.

.PARAMETER OutDir
    Carpeta de destino. Por defecto: <raíz del repo>\backups.

.PARAMETER RetentionDays
    Cantidad de días que se conservan los respaldos. Por defecto: 14.

.PARAMETER PgDump
    Ruta explícita a pg_dump.exe. Si se omite, se busca en el PATH y en las
    instalaciones habituales de PostgreSQL en Windows.

.EXAMPLE
    pnpm backup

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File apps/api/scripts/backup.ps1 `
      -OutDir "D:\Respaldos\Aguateria" -RetentionDays 30
#>
[CmdletBinding()]
param(
    [string]$OutDir = "",
    [ValidateRange(1, 3650)]
    [int]$RetentionDays = 14,
    [string]$PgDump = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path (Join-Path $scriptDir "..\..\..")).Path
$envFile = Join-Path $rootDir ".env"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "No se encontró el archivo .env en $rootDir. Copiá .env.example y completá DATABASE_URL."
}

$databaseUrl = $null
foreach ($linea in Get-Content -LiteralPath $envFile) {
    $limpia = $linea.TrimStart([char]0xFEFF).Trim()
    if ($limpia -match '^DATABASE_URL\s*=\s*(.+)$') {
        $databaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
        break
    }
}

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "Falta DATABASE_URL en $envFile."
}

try {
    $uri = [System.Uri]$databaseUrl
} catch {
    throw "DATABASE_URL no es una URL válida: $databaseUrl"
}

if (-not $uri.Scheme.StartsWith("postgres")) {
    throw "DATABASE_URL debe comenzar con postgresql:// o postgres://."
}

$userInfo = $uri.UserInfo -split ":", 2
if ([string]::IsNullOrWhiteSpace($userInfo[0])) {
    throw "DATABASE_URL no incluye un usuario."
}

$dbUser = [System.Uri]::UnescapeDataString($userInfo[0])
$dbPass = if ($userInfo.Length -gt 1) { [System.Uri]::UnescapeDataString($userInfo[1]) } else { "" }
$dbHost = $uri.Host
$dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$dbName = $uri.AbsolutePath.TrimStart("/")

if ([string]::IsNullOrWhiteSpace($dbName)) {
    throw "DATABASE_URL no incluye el nombre de la base."
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $rootDir "backups"
}

if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

if ([string]::IsNullOrWhiteSpace($PgDump)) {
    $comando = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($comando) {
        $PgDump = $comando.Source
    } else {
        $candidatos = @(
            "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
        )
        $PgDump = $candidatos | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
}

if ([string]::IsNullOrWhiteSpace($PgDump) -or -not (Test-Path -LiteralPath $PgDump)) {
    throw "No se encontró pg_dump. Instalá PostgreSQL o pasá la ruta con -PgDump."
}

$marca = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$archivo = Join-Path $OutDir "aguateria_$marca.dump"
$passwordAnterior = $env:PGPASSWORD
$env:PGPASSWORD = $dbPass

try {
    Write-Host "Respaldando la base '$dbName' en:"
    Write-Host "  $archivo"

    & $PgDump `
        --host=$dbHost `
        --port=$dbPort `
        --username=$dbUser `
        --dbname=$dbName `
        --format=custom `
        --compress=9 `
        --file=$archivo

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump terminó con el código $LASTEXITCODE."
    }

    if (-not (Test-Path -LiteralPath $archivo)) {
        throw "pg_dump no generó el archivo esperado."
    }

    $tamanoMb = [math]::Round((Get-Item -LiteralPath $archivo).Length / 1MB, 2)
    Write-Host "Respaldo creado correctamente ($tamanoMb MB)."
} finally {
    if ($null -eq $passwordAnterior) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $passwordAnterior
    }
}

$limite = (Get-Date).AddDays(-$RetentionDays)
$viejos = Get-ChildItem -LiteralPath $OutDir -Filter "aguateria_*.dump" -File |
    Where-Object { $_.LastWriteTime -lt $limite }

foreach ($viejo in $viejos) {
    Remove-Item -LiteralPath $viejo.FullName -Force
    Write-Host "Eliminado por retención (más de $RetentionDays días): $($viejo.Name)"
}

Write-Host "Listo."
