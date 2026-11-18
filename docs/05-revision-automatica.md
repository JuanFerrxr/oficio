# 5 · Revisión automática (CI)

Qué revisa GitHub en cada cambio y qué hacer cuando algo sale en rojo.

[← Producción: entornos y reglas](04-produccion.md) · [Inicio](README.md)

---

## Cuándo corre

| Flujo | Archivo | Cuándo |
|---|---|---|
| **CI** | `.github/workflows/ci.yml` | En cada pull request y en cada push a `develop` o `main` |
| **Reglas** | `.github/workflows/reglas.yml` | En cada pull request hacia `develop` o `main` |

Los resultados aparecen en la pestaña **Actions** y al pie de cada pull request.

## Qué revisa

### CI

| Trabajo | Paso | Qué comprueba |
|---|---|---|
| **API · compila sin errores** | `npm run typecheck` | Que `apps/api` no tenga errores de TypeScript |
| **App móvil · compila y se empaqueta** | `npm run typecheck` | Que `apps/mobile` no tenga errores de TypeScript (incluye columnas de la base mal escritas) |
| | `npm run export:ios` | Que la app se empaquete como para el iPhone: imports rotos, errores de Babel o NativeWind |
| **Base · migraciones, tipos y flujo completo** | Levantar Supabase | Que **todas** las migraciones, el seed y `supabase/config.toml` funcionen en una base limpia |
| | Los tipos están al día | Que `packages/shared/src/types/database.ts` coincida con las migraciones |
| | Crear usuarios de prueba | Que `npm run demo` funcione |
| | Comprobar el acceso | Las 25 comprobaciones de `npm run acceso`: registro, entrar y recuperar (Sprint 1) |
| | Comprobar el alta de prestador | Las 34 comprobaciones de `npm run alta`: alta, documentos en Storage y quién ve qué (Sprint 2) |
| | Comprobar búsqueda y solicitudes | Las 39 comprobaciones de `npm run busqueda`: buscar, perfil público, favoritos, direcciones y enviar solicitudes (Sprint 3A) |
| | Comprobar respuestas y reseñas | Las 46 comprobaciones de `npm run respuestas`: bandeja, detalle con fotos y video, cotizar, rechazar, confirmar, terminar, calificar y reseñas (Sprint 3B) |
| | Comprobar seguimiento y calendario | Las 24 comprobaciones de `npm run seguimiento`: seguimiento A7, cancelar, bloqueos con repetición y calendario (Sprint 4A) |
| | Comprobar chat y avisos | Las 44 comprobaciones de `npm run chat`: conversaciones, mensajes de cada tipo, leídos, archivos privados, avisos y su envío con un Expo de mentira (Sprint 4B) |
| | Recorrer el flujo completo | Las mismas 16 comprobaciones de `npm run flujo` |

El segundo trabajo tarda de 4 a 8 minutos; la mayor parte es descargar las imágenes de Supabase.

### Reglas

| Guardia | Cuándo aplica | Qué comprueba |
|---|---|---|
| **A main solo entra develop o hotfix/\*** | Pull requests hacia `main` | Que nadie mande una rama de funcionalidad directo a producción |
| **Las migraciones ya existentes no se editan** | Todos los pull requests | Que ningún archivo existente de `supabase/migrations/` se modifique o borre |

## Si sale en rojo

| Falló | Significa | Qué hacer |
|---|---|---|
| API · compila | Error de TypeScript en `apps/api` | El mensaje dice archivo y línea. Reprodúcelo con `npm run typecheck` en `apps\api` |
| App móvil · typecheck | Error de TypeScript en `apps/mobile` | Reprodúcelo con `npm run typecheck` en `apps\mobile`. Si cambiaste la base, regenera los tipos (`npm run db:types`) |
| App móvil · export:ios | La app no se puede empaquetar | Reprodúcelo con `npm run export:ios` en `apps\mobile`; el error dice el archivo |
| Levantar Supabase | Una migración tiene un error de SQL | Abre el paso para ver la línea. Reprodúcelo con `npx supabase db reset` |
| Los tipos están al día | Cambiaste la base y no regeneraste los tipos | `npm run db:types` con Supabase encendido, commit y push |
| Crear usuarios de prueba | La base cambió y el script de demo ya no encaja | Corre `npm run demo` en local para ver el error |
| Comprobar el acceso | Cambió la configuración de Auth, una plantilla de correo o el trigger del perfil | El paso imprime el ✔ que falló. Reprodúcelo con `npm run acceso` en `apps\api` |
| Comprobar el alta de prestador | Cambió una regla de `provider_*`, `verification_documents` o de Storage | El paso imprime el ✔ que falló. Reprodúcelo con `npm run alta` en `apps\api` |
| Comprobar búsqueda y solicitudes | Cambió una función de búsqueda, una regla de `service_requests`, `addresses` o `request-media` | El paso imprime el ✔ que falló. Reprodúcelo con `npm run busqueda` en `apps\api` |
| Comprobar respuestas y reseñas | Cambió una función de la bandeja, `transition_request`, `reviews` o `review-media` | El paso imprime el ✔ que falló. Reprodúcelo con `npm run respuestas` en `apps\api` |
| Comprobar seguimiento y calendario | Cambió `seguimiento_solicitud`, `provider_unavailability`, `calendario_prestador` o la búsqueda | El paso imprime el ✔ que falló. Reprodúcelo con `npm run seguimiento` en `apps\api` |
| Comprobar chat y avisos | Cambió `messages`, `chat-media`, los disparadores de avisos o `services/push.ts` | El paso imprime el ✔ que falló. Reprodúcelo con `npm run chat` en `apps\api` (con la API apagada) |
| Recorrer el flujo completo | Se rompió una regla de negocio | El paso imprime el ✔ que falló y, al final, el registro de la API |
| A main solo entra develop… | El pull request va de una rama de funcionalidad a `main` | Ciérralo y ábrelo hacia `develop` |
| Las migraciones… no se editan | Modificaste o borraste una migración existente | Regresa ese archivo a como estaba (`git checkout origin/develop -- supabase/migrations/ARCHIVO.sql`) y pon tu cambio en una migración nueva |

Después de corregir: commit y `git push` a la misma rama. La revisión vuelve a correr sola.

## Correr lo mismo en tu computadora

Antes de subir, puedes reproducir casi todo:

```powershell
cd C:\dev\oficio
npx supabase db reset          # migraciones + seed desde cero
npm run db:types               # tipos al día
cd apps\api
npm run typecheck
npm run demo
npm run acceso                 # registro, entrar y recuperar
npm run alta                   # alta de prestador
npm run busqueda               # buscar y solicitar
npm run respuestas             # bandeja, cotizar, rechazar y reseñas
npm run seguimiento            # seguimiento, cancelar y calendario
npm run chat                   # chat y avisos (con la API apagada)
npm run flujo                  # con npm run dev corriendo en otra ventana
cd ..\mobile
npm run typecheck
npm run export:ios
```

## Cambiar la revisión

Si agregas una pieza nueva (por ejemplo, la app móvil), agrega su revisión a `ci.yml` en el mismo pull request y actualiza esta página. Valida el archivo antes de subirlo con https://rhysd.github.io/actionlint/ (pega el contenido).
