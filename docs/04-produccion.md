# 4 · Producción: entornos y reglas

Las prácticas que se siguen cuando hay usuarios reales de por medio. Algunas aplican desde hoy; otras, cuando creemos los entornos en la nube.

[← Liberar a producción](03-liberar-a-produccion.md) · [Siguiente: Revisión automática →](05-revision-automatica.md)

---

## Entornos

Cada rama permanente tiene su propio entorno, con su propia base de datos y sus propias llaves. **Nunca comparten datos.**

| | Local | Pruebas (staging) | Producción |
|---|---|---|---|
| Rama | `feature/*`, `fix/*` | `develop` | `main` |
| Base de datos | Supabase en Docker | Proyecto Supabase `oficio-staging` (plan gratuito) | Proyecto Supabase `oficio-prod` (Pro, con respaldos) |
| API | `npm run dev` | Cloud Run `oficio-api-staging` | Cloud Run `oficio-api` |
| App | Expo Go | EAS canal `preview` (TestFlight interno / APK de prueba) | EAS canal `production` (tiendas) |
| Datos | Mariana y Rogelio de `npm run demo` | Ficticios, creados para probar | Reales |
| Despliegue | Manual | Automático al unir a `develop` | Automático al unir a `main` |

**Estado:** hoy solo existe el entorno local. Pruebas y producción se crean cerca de la semana 10–11, antes de la beta. En ese momento se agregarán aquí los flujos de despliegue automático y los secretos de cada entorno.

---

## Migraciones seguras

Es la regla más importante con una app móvil: cuando liberas, **la versión anterior de la app sigue instalada** en los celulares que no han actualizado. La base nueva tiene que seguir funcionando con la app vieja.

### 1. Nunca editar una migración que ya existe

Ya se aplicó en pruebas o producción y no se vuelve a correr: tu cambio nunca llegaría a esas bases. Crea una nueva con `npx supabase migration new nombre`. La guardia **"Las migraciones ya existentes no se editan"** lo revisa en cada pull request.

### 2. Cambios compatibles: en una sola liberación

- Agregar una tabla.
- Agregar una columna que acepte vacío o tenga valor por defecto.
- Agregar una función, una vista o un índice.
- Agregar un valor nuevo a un `enum`, si la app vieja tolera recibirlo.

### 3. Cambios destructivos: en tres liberaciones

Renombrar, borrar o cambiar el tipo de una columna sigue el patrón **expandir → migrar → contraer**. Ejemplo: renombrar `cancel_note` a `cancel_comment`.

| Liberación | Base de datos | App |
|---|---|---|
| A · expandir | Agrega `cancel_comment` | La versión nueva escribe en ambas columnas |
| B · migrar | Copia los datos viejos a `cancel_comment` | Lee de `cancel_comment` |
| C · contraer (semanas después) | Borra `cancel_note` | — |

La liberación C espera hasta que casi nadie tenga la versión vieja de la app.

### 4. No hay "deshacer" en la base

Si una migración sale mal en producción, se corrige con **otra migración hacia adelante**. Regresar el código no regresa la base.

### 5. Respaldo antes de tocar la base

Antes de liberar algo con migraciones, confirma que el respaldo del día existe (Supabase Pro → Database → Backups).

---

## Datos personales

- **Nunca** copies datos de producción a pruebas ni a tu computadora, tampoco para reproducir un error. Son datos personales de usuarios reales (LFPDPPP). Para probar, se recrea el caso con datos inventados.
- Las llaves de producción solo viven en Cloud Run, en los secretos de GitHub y en Supabase. Nunca en un `.env` en tu computadora ni en mensajes.
- Documentos de identidad, fotos, videos, notas de voz y ubicaciones van en buckets privados. Ver `supabase/migrations/20261013000200_storage.sql`.

---

## Cómo regresar si algo sale mal

Hay que saberlo **antes** de liberar:

| Qué se rompió | Cómo se regresa | Tiempo |
|---|---|---|
| API | Cloud Run → `oficio-api` → Revisiones → 100% del tráfico a la revisión anterior | 1 minuto |
| App (JavaScript) | `eas update:rollback`, o publicar el update anterior en el canal `production`. Llega al reabrir la app | Minutos |
| App (nativo, versión de tienda) | No se puede retirar: se publica una versión nueva. Por eso los cambios nativos se prueban más en pruebas | Días (revisión de tienda) |
| Base de datos | Migración correctiva hacia adelante. En un caso grave, restaurar el respaldo (se pierde lo escrito después) | Variable |

---

## Limitaciones del plan gratuito de GitHub (repositorio privado)

- **No se puede bloquear** que alguien una un pull request con la revisión en rojo ni que suba directo a `main`. La revisión avisa con ✗ pero no impide. Mientras tanto la regla es de disciplina: **nunca unir en rojo, nunca push directo**.
- Los **Environments** de GitHub (secretos por entorno con aprobación manual) tampoco están disponibles. Cuando existan pruebas y producción, los secretos se nombran con sufijo: `SUPABASE_SERVICE_ROLE_KEY_STAGING`, `SUPABASE_SERVICE_ROLE_KEY_PROD`.
- La pestaña **Wiki** tampoco existe en privados gratuitos; por eso esta wiki vive en `docs/`.
- Con **GitHub Pro o Team**, activa en *Settings → Rules*: `main` y `develop` requieren pull request y las revisiones en verde.
