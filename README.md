# Oficio

Plataforma móvil que conecta de forma directa a prestadores de servicios del hogar (plomeros, electricistas, pintores, niñeras…) con clientes de su zona. Piloto en Puebla.

**Stack:** Expo + React Native · Supabase (Postgres + PostGIS + pgvector, Auth, Storage, Realtime) · API Node.js + Hono en Cloud Run · IA con Claude (Anthropic) y Voyage AI · TypeScript de punta a punta.

## Empieza aquí

Toda la documentación está en la **[wiki del proyecto (`docs/`)](docs/README.md)**:

1. [Instalar y correr en local](docs/01-instalar-y-correr-local.md)
2. [El día a día](docs/02-dia-a-dia.md): ramas, commits y pull requests
3. [Liberar a producción](docs/03-liberar-a-produccion.md)
4. [Producción: entornos y reglas](docs/04-produccion.md)
5. [Revisión automática (CI)](docs/05-revision-automatica.md)
6. [App móvil](docs/06-app-movil.md): correrla en tu iPhone
7. [Acceso](docs/07-acceso.md): registro, entrar y recuperar la contraseña
8. [Alta de prestador](docs/08-alta-prestador.md): servicios, zona, horario y documentos
9. [Búsqueda y solicitudes](docs/09-busqueda-y-solicitudes.md): buscar, perfil del prestador y pedir un servicio
10. [Respuestas y reseñas](docs/10-respuestas-y-resenas.md): bandeja del prestador, cotizar, rechazar, confirmar y calificar
11. [Seguimiento y calendario](docs/11-seguimiento-y-calendario.md): seguimiento y cancelar del cliente, calendario del prestador
12. [Chat y notificaciones](docs/12-chat-y-notificaciones.md): chat con fotos, video, voz y ubicación; notificaciones push
13. [IA: búsqueda y asistente](docs/13-ia-busqueda-y-asistente.md): buscar con tus palabras y asistente de solicitud

## En corto

```powershell
npx supabase start                                            # base local (Docker Desktop abierto)
powershell -ExecutionPolicy Bypass -File scripts\crear-env.ps1 # solo la primera vez
cd apps\api; npm install; npm run demo; npm run dev           # API en http://localhost:8080
npm run acceso                                                # registro, entrar y recuperar
npm run alta                                                  # alta de prestador
npm run busqueda                                              # buscar y solicitar
npm run respuestas                                            # bandeja, cotizar, rechazar y reseñas
npm run seguimiento                                           # seguimiento, cancelar y calendario
npm run chat                                                  # chat y avisos (con la API apagada)
npm run ia                                                    # búsqueda con IA y asistente (sin gastar)
npm run flujo                                                 # en otra ventana: prueba completa

# App móvil (otra ventana)
powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1   # solo la primera vez
cd apps\mobile; npm install; npx expo start                  # escanea el QR con tu iPhone
```

## Reglas

- Nada llega a `main` sin pasar antes por `develop`.
- Nunca unir un pull request con la revisión en rojo.
- Nunca editar una migración que ya existe.
- Nunca subir llaves ni `apps/api/.env`.
