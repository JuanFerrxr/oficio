# Crea apps\mobile\.env para probar la app en tu iPhone contra el Supabase LOCAL.
# Detecta la IP de tu computadora en la red Wi-Fi (el iPhone no puede usar 127.0.0.1)
# y comprueba que Supabase responde en esa IP.
#
# Uso (desde la raiz del proyecto, con Docker Desktop y Supabase encendidos):
#   powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1 -Force          # reemplaza el .env
#   powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1 -Ip 192.168.1.80 # IP a mano
param([switch]$Force, [string]$Ip)
$ErrorActionPreference = 'Stop'

$raiz    = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'apps\mobile\.env'

if ((Test-Path $destino) -and -not $Force) {
  Write-Host "Ya existe apps\mobile\.env. No lo toque."
  Write-Host "Si cambiaste de red o tu IP cambio, vuelve a correr con -Force."
  exit 0
}

# 1. IP de la computadora en la red local
if (-not $Ip) {
  $candidatas = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)' -and
    $_.InterfaceAlias -notmatch 'vEthernet|Loopback|WSL|Docker|VirtualBox|VMware|Bluetooth|Hyper-V'
  }
  $wifi = $candidatas | Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|WLAN|Wireless|Inal' } | Select-Object -First 1
  $elegida = if ($wifi) { $wifi } else { $candidatas | Select-Object -First 1 }
  if (-not $elegida) {
    Write-Host "No encontre la IP de tu computadora en la red local."
    Write-Host "Buscala con 'ipconfig' (Direccion IPv4 del adaptador Wi-Fi) y corre de nuevo con -Ip <esa IP>."
    exit 1
  }
  $Ip = $elegida.IPAddress
  Write-Host ("IP detectada: {0}  (adaptador: {1})" -f $Ip, $elegida.InterfaceAlias)
}

# 2. Llave publica del Supabase local
# La CLI de Supabase escribe avisos en stderr (p. ej. "Stopped services: [...]"). Windows
# PowerShell 5.1 convierte cada linea de stderr en un error y, con 'Stop', detiene el script
# aunque el comando haya funcionado. Por eso aqui se baja a 'Continue' solo durante la llamada.
Push-Location $raiz
$antes = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  $salida = npx supabase status -o env 2>$null
} finally {
  $ErrorActionPreference = $antes
  Pop-Location
}
$kv = @{}
$salida | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object {
  $k, $v = ([string]$_) -split '=', 2
  $kv[$k] = $v.Trim('"')
}
$llave = if ($kv.ANON_KEY) { $kv.ANON_KEY } else { $kv.PUBLISHABLE_KEY }
if (-not $llave) {
  Write-Host "No pude leer la llave de Supabase."
  Write-Host "Revisa que Docker Desktop este abierto y corre 'npx supabase start' en la raiz del proyecto."
  exit 1
}

# 3. Escribir apps\mobile\.env (UTF-8 sin BOM)
$url = "http://${Ip}:54321"
$texto = "EXPO_PUBLIC_SUPABASE_URL=$url`n" +
         "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$llave`n" +
         "EXPO_PUBLIC_API_URL=http://${Ip}:8080`n"
[IO.File]::WriteAllText($destino, $texto, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Listo: apps\mobile\.env creado con $url (API: http://${Ip}:8080)"

# 4. Comprobar que Supabase responde en esa IP (lo mismo que hara el iPhone)
try {
  Invoke-WebRequest -Uri "$url/rest/v1/" -Headers @{ apikey = $llave } -UseBasicParsing -TimeoutSec 5 | Out-Null
  Write-Host "Supabase responde en $url."
} catch {
  if ($_.Exception.Response) {
    Write-Host "Supabase responde en $url."
  } else {
    Write-Host ""
    Write-Host "ATENCION: Supabase no responde en $url."
    Write-Host "  - Revisa que 'npx supabase start' haya terminado."
    Write-Host "  - Si solo responde en 127.0.0.1, avisa: hay que cambiar a que escuche en la red local."
  }
}

# 5. Recordatorio del firewall (crear la regla requiere PowerShell como administrador)
$regla = Get-NetFirewallRule -DisplayName 'Oficio dev (Supabase + Expo)' -ErrorAction SilentlyContinue
if (-not $regla) {
  Write-Host ""
  Write-Host "Falta permitir que el iPhone se conecte a tu computadora. En PowerShell COMO ADMINISTRADOR corre una vez:"
  Write-Host "  New-NetFirewallRule -DisplayName 'Oficio dev (Supabase + Expo)' -Direction Inbound -Protocol TCP -LocalPort 54321,8081 -Action Allow -Profile Private -RemoteAddress LocalSubnet"
}
# Sprint 5A · la app tambien habla con la API (puerto 8080) para la IA
$reglaApi = Get-NetFirewallRule -DisplayName 'Oficio dev (API)' -ErrorAction SilentlyContinue
if (-not $reglaApi) {
  Write-Host ""
  Write-Host "Para que el iPhone llegue a la API (IA), en PowerShell COMO ADMINISTRADOR corre una vez:"
  Write-Host "  New-NetFirewallRule -DisplayName 'Oficio dev (API)' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private -RemoteAddress LocalSubnet"
}
$perfil = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.NetworkCategory -eq 'Public' } | Select-Object -First 1
if ($perfil) {
  Write-Host ""
  Write-Host ("Tu red '{0}' esta marcada como Publica: la regla del firewall no aplica ahi." -f $perfil.Name)
  Write-Host "Si es la red de tu casa, marcala como Privada (PowerShell como administrador):"
  Write-Host ("  Set-NetConnectionProfile -InterfaceAlias '{0}' -NetworkCategory Private" -f $perfil.InterfaceAlias)
}
