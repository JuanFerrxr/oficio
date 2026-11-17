# Crea apps\api\.env con las llaves del Supabase LOCAL y un CRON_SECRET aleatorio.
# Uso (desde la raiz del proyecto, con Supabase encendido):
#   powershell -ExecutionPolicy Bypass -File scripts\crear-env.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\crear-env.ps1 -Force   # reemplaza un .env existente
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$raiz    = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'apps\api\.env'

if ((Test-Path $destino) -and -not $Force) {
  Write-Host "Ya existe apps\api\.env. No lo toque."
  Write-Host "Si quieres reemplazarlo, vuelve a correr con -Force."
  exit 0
}

Push-Location $raiz
try {
  $kv = @{}
  npx supabase status -o env 2>$null | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    $kv[$k] = $v.Trim('"')
  }
} finally {
  Pop-Location
}

$anon    = if ($kv.ANON_KEY)         { $kv.ANON_KEY }         else { $kv.PUBLISHABLE_KEY }
$service = if ($kv.SERVICE_ROLE_KEY) { $kv.SERVICE_ROLE_KEY } else { $kv.SECRET_KEY }

if (-not $anon -or -not $service) {
  Write-Host "No pude leer las llaves de Supabase."
  Write-Host "Revisa que Docker Desktop este abierto y corre 'npx supabase start' en la raiz del proyecto."
  exit 1
}

$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

$texto = "SUPABASE_URL=http://127.0.0.1:54321`n" +
         "SUPABASE_ANON_KEY=$anon`n" +
         "SUPABASE_SERVICE_ROLE_KEY=$service`n" +
         "CRON_SECRET=$secret`n" +
         "PORT=8080`n"

# UTF-8 sin BOM: Node no reconoce la primera variable si el archivo trae BOM
[IO.File]::WriteAllText($destino, $texto, (New-Object System.Text.UTF8Encoding $false))

Write-Host "Listo: apps\api\.env creado."
Write-Host ("  SUPABASE_ANON_KEY         = {0}..." -f $anon.Substring(0, 12))
Write-Host ("  SUPABASE_SERVICE_ROLE_KEY = {0}..." -f $service.Substring(0, 12))
Write-Host  "  CRON_SECRET               = (32 caracteres aleatorios)"
