# 1 · Instalar y correr en local

Al terminar esta página tendrás en tu computadora la base de datos (Supabase en Docker), los datos de prueba y la API, y habrás comprobado que todo funciona con `npm run flujo`.

Los comandos son para **Windows con PowerShell**. En Mac o Linux son los mismos, salvo los que se indican.

[← Inicio](README.md) · [Siguiente: El día a día →](02-dia-a-dia.md)

---

## Paso 0 · Lo que necesitas instalado

| Programa | Versión | Cómo comprobarlo |
|---|---|---|
| Node.js | 20 o mayor (LTS) | `node -v` y `npm -v` (los dos deben imprimir un número) |
| Git | cualquiera reciente | `git --version` |
| Docker Desktop | con motor de Linux (WSL 2) | `docker info` debe mostrar una sección **Server** |

- Node: `winget install OpenJS.NodeJS.LTS`
- Git: `winget install Git.Git`
- Docker Desktop: https://www.docker.com/products/docker-desktop/ — necesita WSL 2 (`wsl --install` en PowerShell como administrador, luego reiniciar).

Si `npm -v` o `docker info` fallan, ve a [Problemas comunes](#problemas-comunes) antes de seguir.

## Paso 1 · Obtener el código

Necesitas acceso al repositorio privado. La dueña te invita en *Settings → Collaborators*; acepta la invitación que llega a tu correo.

Clona en una carpeta **local**, fuera de OneDrive, Google Drive o Dropbox:

```powershell
New-Item -ItemType Directory C:\dev -Force | Out-Null
git clone https://github.com/USUARIO/oficio.git C:\dev\oficio
cd C:\dev\oficio
git checkout develop
```

> **Por qué fuera de OneDrive:** `npm install` crea decenas de miles de archivos. OneDrive intenta sincronizarlos, lo que vuelve todo lento y provoca errores de "archivo en uso" (`EPERM`). Docker también tiene problemas para leer carpetas sincronizadas.

La primera vez que uses Git en tu computadora, dile quién eres (usa el correo de tu cuenta de GitHub):

```powershell
git config --global user.name "Tu nombre"
git config --global user.email "tu-correo-de-github@ejemplo.com"
```

## Paso 2 · Instalar la CLI de Supabase

```powershell
npm install
npx supabase --version
```

La CLI queda dentro del proyecto (no global), así todos usan la misma versión.

## Paso 3 · Arrancar Supabase local

Abre **Docker Desktop** y espera a que diga *Engine running*. Luego:

```powershell
npx supabase start
```

La primera vez descarga varias imágenes (unos GB, de 5 a 15 minutos). Al terminar aplica **todas las migraciones y el seed** y muestra:

| Qué | Dónde |
|---|---|
| API de Supabase | http://127.0.0.1:54321 |
| Studio (panel visual) | http://127.0.0.1:54323 |
| Correos de prueba (códigos de verificación) | http://127.0.0.1:54324 |
| Postgres directo | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

El aviso de telemetría es opcional: `npx supabase telemetry disable`.

## Paso 4 · Comprobar la base en Studio

Abre http://127.0.0.1:54323

1. **Table Editor:** deben existir `profiles`, `service_requests`, `messages`, `client_favorites`… y `categories` con 8 oficios.
2. **SQL Editor:** corre

   ```sql
   select * from match_categories('se me bota la pastilla de la luz');
   ```

   Debe responder `electricidad` (búsqueda por problema, pantalla A3.0).

## Paso 5 · Crear el `.env` de la API

La API necesita cuatro datos que se guardan en `apps\api\.env`. Ese archivo **no se sube a Git** (está en `.gitignore`).

| Variable | Qué es |
|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Llave pública; respeta las reglas de seguridad. La misma que usará la app |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave de administrador: **se salta todas las reglas**. Solo en la API, nunca en la app ni en Git |
| `CRON_SECRET` | Contraseña para las tareas programadas (`/jobs/*`). Mínimo 16 caracteres |

Con Supabase encendido, desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\crear-env.ps1
```

El script lee las llaves de tu Supabase local, inventa un `CRON_SECRET` de 32 caracteres y escribe el archivo. Si ya existe, no lo toca (usa `-Force` para reemplazarlo). Las llaves locales no cambian, así que solo lo corres una vez.

<details>
<summary>Hacerlo a mano (o en Mac/Linux)</summary>

1. `Copy-Item apps\api\.env.example apps\api\.env` (Mac/Linux: `cp apps/api/.env.example apps/api/.env`)
2. `npx supabase status -o env` → copia los valores de `ANON_KEY` y `SERVICE_ROLE_KEY` (o `PUBLISHABLE_KEY` y `SECRET_KEY`, según la versión).
3. Pégalos en `apps\api\.env` **sin comillas y sin espacios alrededor del `=`**. Son de más de 150 caracteres: cópialos completos.
4. Inventa un `CRON_SECRET` de 16 caracteres o más, sin espacios.

</details>

## Paso 6 · Instalar la API y crear usuarios de prueba

```powershell
cd apps\api
npm install
npm run demo
```

Crea a **Mariana García** (clienta, con dirección en Col. La Paz) y a **Rogelio Hernández** (electricista verificado, 3 servicios, horario L–S 8–19 h, radio de 8 km). Contraseña de ambos: `Oficio2026!`. Se puede correr varias veces.

## Paso 7 · Arrancar la API

```powershell
npm run dev
```

Debe decir `API de Oficio escuchando en http://localhost:8080`. Abre http://localhost:8080/health → `{"ok":true,...}`.

Deja esta ventana abierta. La API se reinicia sola cuando guardas cambios en `src\`. Si el puerto 8080 está ocupado, cambia `PORT` en el `.env`.

## Paso 8 · Probar el flujo completo

En **otra** ventana de PowerShell:

```powershell
cd C:\dev\oficio\apps\api
npm run flujo
```

Recorre una solicitud de punta a punta y debe terminar con 14 ✔:

1. "se me bota la pastilla de la luz" → Electricidad
2. Rogelio aparece en la búsqueda de electricistas
3. Mariana envía la solicitud
4. Mariana puede escribir en el chat antes de la cotización
5. Rogelio ve la colonia, pero no la calle ni el teléfono
6. La clienta no puede aceptar su propia solicitud
7. Mariana ve "Vista" y la cotización, todavía sin teléfono
8. Al confirmar, ambos ven el teléfono y Rogelio la dirección
9. Trabajo iniciado y terminado
10. El historial tiene las 4 transiciones
11. Mariana califica con 5 ★
12. Rogelio aparece en sus favoritos de Inicio
13. Cancelar sin motivo se rechaza
14. Cancelar con motivo funciona

Si un paso dice `FALLÓ`, el texto indica qué regla no se cumplió.

### Opcional: probar la expiración de 2 horas

```powershell
$secret = ((Get-Content .env | Select-String '^CRON_SECRET=').Line -split '=', 2)[1]
Invoke-RestMethod -Method Post http://localhost:8080/jobs/expire-requests -Headers @{ 'x-cron-secret' = $secret }
```

Responde `expired : 0` si nada lleva 2 horas pendiente. Con un secreto equivocado debe dar **401**.

---

## Encender y apagar

**Al empezar a trabajar:**

```powershell
# Docker Desktop abierto, "Engine running"
cd C:\dev\oficio
npx supabase start
cd apps\api
npm run dev
```

**Al terminar:** Ctrl+C en la ventana de la API, luego `npx supabase stop` en la raíz. Los datos se conservan.

**Empezar limpio:** `npx supabase db reset` borra todo y vuelve a aplicar migraciones y seed. Después corre otra vez `npm run demo`.

## Cómo está repartido el trabajo

| Dónde | Qué hace | Por qué ahí |
|---|---|---|
| Supabase directo desde la app | Buscar, crear solicitudes, chat, reseñas, favoritos, archivos | Las reglas de seguridad por fila (RLS) deciden qué ve cada quien; no hace falta servidor en medio |
| Funciones en la base (`transition_request`, `match_categories`, `home_favorites`, `provider_busy_days`) | Reglas que no se pueden saltar | Si viven en la base, ningún error en la app las rompe |
| Vistas `provider_request_view` / `client_request_view` | Privacidad por etapas | Teléfono y calle solo con la cita confirmada |
| API Hono (`apps/api`) | Cambios de estado + notificación push, tareas programadas | Necesita secretos o debe correr sin que nadie abra la app |

La API reenvía el token del usuario: las acciones de usuarios respetan las mismas reglas. La llave de administrador solo se usa en tareas del sistema.

### Endpoints de la API

Todas las rutas `/requests` piden `Authorization: Bearer <access_token>` de Supabase Auth.

| Ruta | Quién | Pantalla |
|---|---|---|
| `GET /health` | cualquiera | — |
| `POST /requests/:id/viewed` | prestador | B4 → "Vista" |
| `POST /requests/:id/accept` `{ quotedPrice, scheduledAt, message? }` | prestador | B5 |
| `POST /requests/:id/decline` | prestador | B4 |
| `POST /requests/:id/confirm` | cliente | A7 |
| `POST /requests/:id/start` | prestador | B4.1 |
| `POST /requests/:id/complete` | cliente | A7 |
| `POST /requests/:id/cancel` `{ reason, note? }` | cualquiera de los dos | A7.1 |
| `POST /jobs/expire-requests` (encabezado `x-cron-secret`) | Cloud Scheduler | — |

---

## Problemas comunes

### `npm -v` falla con `Cannot find module '...\npm\bin\node_modules\npm\bin\npm-prefix.js'`

No es el proyecto ni Node: la variable **Path** de Windows tiene la entrada `C:\Program Files\nodejs\node_modules\npm\bin`, y Windows ejecuta un `npm` interno que no está hecho para usarse directo. Reinstalar Node no lo arregla.

1. Confírmalo: `& "C:\Program Files\nodejs\npm.cmd" -v` imprime la versión sin error.
2. Quita la entrada del Path de usuario:

   ```powershell
   $u = [Environment]::GetEnvironmentVariable('Path','User')
   $limpio = ($u -split ';' | Where-Object { $_ -and $_ -notmatch 'nodejs\\node_modules\\npm\\bin' }) -join ';'
   [Environment]::SetEnvironmentVariable('Path', $limpio, 'User')
   ```

   Repite con `'Machine'` en lugar de `'User'` en un PowerShell **como administrador**.
3. Cierra **todas** las terminales (incluida la de VS Code) y abre una nueva. `where.exe npm` debe mostrar primero `C:\Program Files\nodejs\npm`.

### `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`

Docker Desktop no está abierto o no ha terminado de arrancar.

1. Abre Docker Desktop y espera *Engine running*; confirma con `docker info`.
2. Si nunca llega: clic derecho en la ballena → si aparece *Switch to Linux containers…*, elígelo.
3. `wsl --status` y `wsl --update` (PowerShell como administrador). Si WSL no está instalado: `wsl --install` y reinicia.
4. Docker Desktop → Settings → General → *Use the WSL 2 based engine* activado.
5. Reinicio completo: *Quit Docker Desktop* → `wsl --shutdown` → abrir Docker Desktop.

### `Variables de entorno inválidas` al correr la API o `npm run demo`

Falta o está mal una línea del `.env`; el mensaje dice cuál. Vuelve a crearlo con `scripts\crear-env.ps1 -Force`.

### `fetch failed` / `ECONNREFUSED`

Supabase no está corriendo: Docker Desktop abierto y `npx supabase start` en la raíz.

### `No pude entrar como mariana@demo.mx` en `npm run flujo`

Los usuarios de prueba no existen (pasa después de un `db reset`): `npm run demo`.

### `La API no responde en http://localhost:8080`

La ventana con `npm run dev` no está abierta.

### Mi pregunta no está aquí

Abre un issue en GitHub con el comando que corriste y el mensaje completo. Si lo resuelves, agrega la solución a esta sección en tu siguiente pull request.
