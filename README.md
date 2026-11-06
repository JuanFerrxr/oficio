# Oficio · base de datos y backend (v0.2)

Guía para levantar la base de datos y la API en tu computadora (Windows + PowerShell).
Todo corre en local con Docker: puedes romper y reiniciar cuantas veces quieras sin costo.

```
oficio/
├── package.json                 # trae la CLI de Supabase (npx supabase …)
├── supabase/
│   ├── config.toml              # configuración del Supabase local
│   ├── migrations/              # el esquema, en orden. Única fuente de verdad
│   │   ├── 20261006000000_init.sql          # tablas base (v0.1)
│   │   ├── 20261013000000_v02_figma.sql     # cambios que pidió el prototipo
│   │   ├── 20261013000100_rls_funciones.sql # reglas: RLS, transiciones, triggers
│   │   └── 20261013000200_storage.sql       # buckets de fotos, video y audio
│   └── seed.sql                 # 8 oficios + diccionario “pastilla → Electricidad”
├── apps/api/                    # API Node.js + Hono (irá a Cloud Run)
│   ├── src/                     # rutas, auth, push
│   └── scripts/                 # demo.ts (datos de prueba) y flujo.ts (prueba completa)
└── packages/shared/             # aquí se generan los tipos TypeScript de la base
```

---

## Paso 0 · Revisa lo que ya tienes

Abre **PowerShell** y corre:

```powershell
node -v        # v20 o mayor
git --version
docker info    # debe responder sin error
```

Si `docker info` falla, abre **Docker Desktop** y espera a que diga *Engine running*.
Docker Desktop tiene que estar abierto cada vez que trabajes con la base local.

## Paso 1 · Pon el proyecto en su lugar

Mueve la carpeta `oficio` de Descargas a donde vayas a trabajar, por ejemplo `Documentos\oficio`, y entra:

```powershell
cd $HOME\Documents\oficio
git init
git add .
git commit -m "Base de datos y API v0.2"
```

> **Por qué Git desde ya:** cada cambio al esquema será una migración nueva. Si algo sale mal, regresas al commit anterior.

## Paso 2 · Instala la CLI de Supabase

```powershell
npm install
npx supabase --version     # 2.120.0 o mayor
```

La CLI queda dentro del proyecto (no global), así tú y Persona B usan la misma versión.

## Paso 3 · Arranca Supabase local

```powershell
npx supabase start
```

La primera vez descarga varias imágenes de Docker (unos GB; 5 a 15 minutos). Después tarda segundos.
Al terminar, la CLI **aplica las 4 migraciones y el seed** automáticamente y te muestra las URLs:

| Qué | Dónde |
|---|---|
| API de Supabase | http://127.0.0.1:54321 |
| Studio (panel visual) | http://127.0.0.1:54323 |
| Correos de prueba (códigos de verificación) | http://127.0.0.1:54324 |
| Postgres directo | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Si algo falla aquí, casi siempre es Docker apagado o un puerto ocupado: `npx supabase stop` y vuelve a intentar.

## Paso 4 · Revisa la base en Studio

Abre http://127.0.0.1:54323

1. **Table Editor**: deben aparecer `profiles`, `service_requests`, `messages`, `client_favorites`, `provider_unavailability`, `request_media`… y `categories` con 8 oficios.
2. **SQL Editor**: pega y corre

   ```sql
   select * from match_categories('se me bota la pastilla de la luz');
   ```

   Debe responder `electricidad`. Esa es la búsqueda por problema de A3.0.
3. **Authentication → Policies**: cada tabla tiene su candado (RLS) activado.

## Paso 5 · Configura la API

```powershell
cd apps\api
Copy-Item .env.example .env
npx supabase status -o env      # imprime las llaves del Supabase local
```

Abre `apps\api\.env` en tu editor y pega:

- `SUPABASE_ANON_KEY` ← el valor de **ANON_KEY**
- `SUPABASE_SERVICE_ROLE_KEY` ← el valor de **SERVICE_ROLE_KEY**
- `CRON_SECRET` ← cualquier texto de 16 caracteres o más

> La **service role key salta todas las reglas de seguridad**. Solo vive en la API y en tu `.env`; nunca en la app móvil ni en Git (el `.gitignore` ya excluye `.env`).

Instala dependencias y crea los datos de prueba:

```powershell
npm install
npm run demo
```

Crea a **Mariana** (clienta) y a **Rogelio** (electricista verificado, con servicios, horario L–S y su zona), con contraseña `Oficio2026!`.

## Paso 6 · Arranca la API

```powershell
npm run dev
```

Debe decir `API de Oficio escuchando en http://localhost:8080`. Pruébala en el navegador: http://localhost:8080/health

## Paso 7 · Prueba el flujo completo

Deja la API corriendo y abre **otra** ventana de PowerShell:

```powershell
cd $HOME\Documents\oficio\apps\api
npm run flujo
```

Recorre una solicitud de punta a punta y marca con ✔ cada regla del prototipo:

1. “se me bota la pastilla de la luz” → Electricidad
2. Rogelio aparece en la búsqueda
3. Mariana envía la solicitud
4. Puede chatear antes de la cotización
5. Rogelio ve la colonia, pero no la calle ni el teléfono
6. La clienta no puede aceptar por él
7. Rogelio cotiza; Mariana ve “Vista” y todavía no el teléfono
8. Al confirmar, ambos ven el teléfono y Rogelio la dirección
9. Trabajo iniciado y terminado
10. El historial tiene las 4 transiciones
11. Calificación de 5 ★
12. Rogelio aparece en favoritos
13. Cancelar sin motivo se rechaza…
14. …y con motivo funciona

Si un paso falla, el mensaje dice cuál regla no se cumplió.

Para probar la expiración de 2 h (lo que hará Cloud Scheduler cada 5 minutos):

```powershell
curl.exe -X POST http://localhost:8080/jobs/expire-requests -H "x-cron-secret: TU_CRON_SECRET"
```

---

## Cómo está repartido el trabajo (y por qué)

| Dónde | Qué hace | Por qué ahí |
|---|---|---|
| **Supabase directo desde la app** | leer y crear datos: buscar, crear solicitud, chat, reseñas, favoritos, subir fotos | Con RLS, la base decide qué filas ve cada quien. No hace falta un servidor en medio para cada lectura. |
| **Funciones en la base** (`transition_request`, `match_categories`, `home_favorites`, `provider_busy_days`) | reglas que no se pueden saltar | Si la regla vive en la base, ninguna app ni script con errores puede romperla. |
| **Vistas** `provider_request_view` / `client_request_view` | privacidad por etapas | Teléfono y calle aparecen solo con la cita confirmada, sin depender de la pantalla. |
| **API Hono** | cambios de estado + notificación push, tareas programadas, después KYC y moderación | Lo que necesita secretos (service role, Expo, Truora) o debe pasar aunque nadie tenga la app abierta. |

La API **no** usa la service role para las acciones de usuarios: reenvía el token de quien llama, así las mismas reglas aplican. La service role solo se usa en tareas del sistema.

### Endpoints de la API

| Método y ruta | Quién | Pantalla |
|---|---|---|
| `GET /health` | cualquiera | — |
| `POST /requests/:id/viewed` | prestador | B4 → “Vista” |
| `POST /requests/:id/accept` `{ quotedPrice, scheduledAt, message? }` | prestador | B5 |
| `POST /requests/:id/decline` | prestador | B4 |
| `POST /requests/:id/confirm` | cliente | A7 |
| `POST /requests/:id/start` | prestador | B4.1 |
| `POST /requests/:id/complete` | cliente | A7 |
| `POST /requests/:id/cancel` `{ reason, note? }` | cualquiera de los dos | A7.1 |
| `POST /jobs/expire-requests` (encabezado `x-cron-secret`) | Cloud Scheduler | — |

Todas las rutas `/requests` piden `Authorization: Bearer <access_token>` de Supabase Auth.

---

## Comandos del día a día

```powershell
npx supabase start          # al empezar a trabajar (con Docker Desktop abierto)
npx supabase stop           # al terminar (los datos se conservan)
npx supabase db reset       # borra todo y vuelve a aplicar migraciones + seed
npm run db:types            # regenera los tipos TS en packages/shared
```

**Para cambiar el esquema** nunca edites tablas desde Studio. Siempre:

```powershell
npx supabase migration new nombre_del_cambio   # crea supabase/migrations/<fecha>_nombre_del_cambio.sql
# escribe el SQL en ese archivo
npx supabase db reset                           # pruébalo desde cero
cd apps\api; npm run demo; npm run flujo        # confirma que nada se rompió
```

Después de un `db reset` hay que volver a correr `npm run demo`, porque se borran los usuarios.

---

## Cuando pases a la nube (no todavía)

1. Crea el proyecto en supabase.com, región **us-east-1** o la más cercana disponible.
2. `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`
   (sube solo las migraciones; el `seed.sql` de categorías corre aparte en el SQL Editor, una vez).
3. En **Authentication → Providers** activa Phone con **Twilio Verify** y Email con plantilla de **código** (no enlace).
4. Despliega la API en Cloud Run desde `apps/api` con el `Dockerfile`, con las variables de `.env` como secretos.
5. Programa en Cloud Scheduler `POST /jobs/expire-requests` cada 5 minutos con el encabezado `x-cron-secret`.

## Qué falta (siguientes pasos)

- La app Expo (`apps/mobile`): registro de 4 pasos, búsqueda y solicitud contra esta base.
- SMS real: en local los códigos por correo llegan a http://127.0.0.1:54324; el SMS necesita Twilio configurado.
- Revisión de identidad (Truora o MetaMap) y su ruta en la API.
- Pruebas automáticas de RLS con pgTAP en `supabase/tests`.
