# 12 · Chat y notificaciones

Segunda parte del Sprint 4 (4B): cliente y prestador platican dentro de la app, con texto, fotos, video, notas de voz y ubicación, y cada evento importante llega como notificación al teléfono.

[← Seguimiento y calendario](11-seguimiento-y-calendario.md) · [Inicio](README.md) · [IA: búsqueda y asistente →](13-ia-busqueda-y-asistente.md)

---

## En corto

| Para | Usa |
|---|---|
| Ver el chat | `mariana@demo.mx` → **Mensajes**, o en el detalle de una solicitud → **Mensaje** |
| Ver los mensajes del prestador | `rogelio@demo.mx` → **Mensajes**. `npm run demo` deja una duda de Óscar en Nuevas y una conversación con Daniela en Activas |
| Recibir notificaciones | Una sola vez: conectar la app con Expo ([abajo](#activar-las-notificaciones-una-sola-vez)). Después, con la API corriendo (`npm run dev`) |
| Comprobar todo de un jalón | `npm run chat` en `apps\api`, **con la API apagada** (44 comprobaciones) |

## Las pantallas

| Pantalla | Qué hace |
|---|---|
| **A3.2** Mensajes (cliente) | Una conversación por solicitud, la más reciente arriba: nombre, servicio y estado, último mensaje, hora y cuántos sin leer |
| **B9 · B9.1 · B9.2** Mensajes (prestador) | Igual, en **Nuevas** (solicitudes por responder: puede resolver dudas antes de cotizar), **Activas** (cotizadas y citas) e **Historial** |
| **A3.3 · B9.3** Conversación | Encabezado con la otra persona. Arriba, de qué solicitud se trata, con **Ver detalle**; el prestador, con la cita confirmada, también tiene **Cómo llegar**. Burbujas de texto, fotos (se amplían), video (se reproduce en grande), notas de voz (con avance y duración) y ubicaciones (abren Mapas). Bajo tu último mensaje, **Visto 10:33** cuando el otro lo leyó |
| Escribir | Texto, o el micrófono para una **nota de voz** (hasta 2 min; el bote la descarta). **+**: tomar foto, grabar video (30 s), foto o video de la galería y compartir tu ubicación |
| Insignias | La pestaña Mensajes muestra cuántos mensajes tienes sin leer |
| Perfil → **Notificaciones** | Si están activas en este teléfono, cómo activarlas y **Mandarme un aviso de prueba** |

**Quién puede escribir**: los dos participantes, desde que se envía la solicitud hasta que termina. Después de terminada, rechazada, cancelada o vencida, la conversación queda para consulta.

**Privacidad**: el chat no comparte teléfonos. La calle y "Cómo llegar" solo aparecen con la cita confirmada, igual que en la bandeja.

## Qué avisa y a quién

| Cuándo | A quién | Ejemplo |
|---|---|---|
| Llega una solicitud | Prestador | "Nueva solicitud: Visita de diagnóstico · Mariana G. · tienes 2 horas para responder" |
| Cotiza | Cliente | "Rogelio cotizó $350 · Visita de diagnóstico · 19/11 16:00. Confírmala para apartar la cita." |
| Rechaza / expira | Cliente | "Rogelio no puede tomar tu solicitud" · "Tu solicitud expiró" |
| El cliente confirma | Prestador | "Mariana G. confirmó la cita. Ya puedes ver su dirección y teléfono." |
| Inicia / termina | El otro | "Rogelio empezó el trabajo" · "Mariana G. marcó el trabajo como terminado" |
| Alguien cancela | El otro | "Mariana G. canceló la solicitud" |
| Mensaje nuevo | El otro | "Rogelio Hernández · Llevo multímetro." · "Nota de voz (0:18)" · "Te mandó una foto" |
| Reseña nueva | Prestador | "Mariana G. te calificó con 5 ★" |

Tocar la notificación abre la pantalla correspondiente (la conversación, el seguimiento o la solicitud en la bandeja). Si ya estás viendo esa conversación, el aviso de mensaje no aparece arriba.

## Cómo funciona por dentro

```
App ──escribe──► Supabase ──disparador──► tabla avisos ──API (cada 3 s)──► Expo Push ──► iPhone
```

- La app sigue hablando solo con Supabase. **Los avisos los deja la base** (disparadores en `service_requests`, `messages` y `reviews`) en la tabla `avisos`.
- **La API** revisa esa cola cada 3 segundos y la manda por Expo Push a los teléfonos de cada persona (tabla `push_tokens`). Reintenta hasta 5 veces si Expo no responde y borra los teléfonos que Expo ya no reconoce.
- Si la API está apagada, los avisos se acumulan y salen cuando la prendas. Nada se pierde ni se bloquea en la app.
- **En producción** (Cloud Run se apaga sin tráfico): `AVISOS_CADA_MS=0` y Cloud Scheduler llama cada minuto a `POST /jobs/enviar-avisos` con el `x-cron-secret`. Ver [Producción](04-produccion.md).
- Un teléfono pertenece a una sola cuenta: si otra persona entra en ese teléfono, sus avisos pasan a la cuenta nueva. Al cerrar sesión se borra el token.

## Activar las notificaciones (una sola vez)

Expo solo entrega notificaciones a apps conectadas con un proyecto de Expo. Es gratis.

1. Crea una cuenta en https://expo.dev (o entra con la tuya).
2. En PowerShell:

   ```powershell
   cd C:\dev\oficio\apps\mobile
   npx eas-cli@latest login
   npx eas-cli@latest init        # "Create a new project?" → Yes
   ```

   Esto agrega a `app.json` el `projectId` (en `extra.eas`) y el `owner`. No es secreto: va en el commit.
3. En el iPhone, abre Expo Go → pestaña de perfil → entra con la misma cuenta de Expo.
4. Arranca la API (`cd apps\api; npm run dev`) y la app (`npx expo start --clear`).
5. Abre la app con tu sesión iniciada. En ese momento la app pide el permiso de notificaciones. **Ojo:** en Expo Go el permiso es **de Expo Go**, no de Oficio, y iOS lo pregunta **una sola vez en la vida** de esa app. Si Expo Go ya tenía el permiso (concedido o negado), no vuelve a aparecer ninguna ventana.
6. Ve a **Perfil → Notificaciones**. Esa pantalla dice en qué quedó:
   - **Activadas en este teléfono** → **Mandarme un aviso de prueba** (con la API corriendo). Llega en unos segundos.
   - **Sin permiso** → Ajustes del iPhone → Expo Go → Notificaciones → **Permitir notificaciones**. Regresa a la pantalla y toca **Activar notificaciones**.
   - **Falta conectar la app con Expo** → falta el paso 2, o Expo se arrancó antes de hacerlo: vuelve a correr `npx expo start --clear`.
   - **No se pudieron activar** → muestra el error entre paréntesis.

**Aviso honesto sobre Expo Go:** en Android, Expo Go ya no recibe notificaciones push desde el SDK 53. En iPhone sí deberían llegar con los pasos de arriba. Si en tu iPhone no llegan (Perfil → Notificaciones muestra el error), la alternativa es una *development build* de la app con EAS Build. Para eso hace falta una cuenta de Apple Developer (99 USD al año) y lo dejamos para la preparación de la beta.

## Qué se guarda en la base

La migración `20261223000000_chat_avisos.sql`:

| Cambio | Para qué |
|---|---|
| Topes en `messages` | Texto hasta 2,000 caracteres, nota de voz hasta 2 min, ubicación válida (el video ya tenía 30 s) |
| `mis_conversaciones()` | A3.2 y B9: una fila por solicitud con el último mensaje y los no leídos |
| `chat_info(id)` | Encabezado de A3.3 / B9.3 y "Cómo llegar" (solo prestador, con cita confirmada) |
| `marcar_leidos(id)` · `mis_no_leidos()` | "Visto" y la insignia de la pestaña |
| `registrar_dispositivo(token, plataforma)` · `olvidar_dispositivo(token)` | El token de Expo de este teléfono, para esta cuenta |
| Tabla `avisos` y disparadores | La cola de notificaciones. Cada quien ve solo los suyos; nadie los crea desde la app |
| `aviso_de_prueba()` | Perfil → Notificaciones (uno por minuto) |

Los archivos del chat van al bucket privado `chat-media/<solicitud>/…` (ya existía): solo los dos participantes pueden subirlos y verlos.

## Probar en tu computadora

```powershell
cd C:\dev\oficio
npx supabase db reset
npm run db:types
cd apps\mobile
npm install                    # paquetes nuevos: notificaciones, dispositivo y audio
cd ..\api
npm run demo
npm run chat                   # 44 comprobaciones (con la API apagada)
npm run dev                    # deja la API corriendo para que salgan los avisos
```

## Lista para el iPhone

Arranca Expo con `npx expo start --clear`. La primera vez, iOS pide permiso para **notificaciones** y, al grabar, para el **micrófono**.

**Cliente** (`mariana@demo.mx`)

- [ ] Envía una solicitud a Rogelio. Abre **Mensajes** → la conversación nueva → escribe una duda
- [ ] Prueba **+ → Tomar foto**, **+ → Compartir mi ubicación** y una **nota de voz** (toca el micrófono, habla y toca el cuadro para enviar)
- [ ] Toca la foto (se amplía) y reproduce la nota de voz

**Prestador** (`rogelio@demo.mx`, de preferencia en otro teléfono o en el simulador)

- [ ] **Mensajes → Nuevas**: la conversación de Mariana con su insignia; la de Óscar con su duda
- [ ] Ábrela: los mensajes de Mariana; responde. Del lado de Mariana aparece la respuesta sola y luego **Visto**
- [ ] **Activas**: la conversación con Daniela
- [ ] Cotiza la solicitud de Mariana → Mariana recibe "Rogelio cotizó $350" (si activaste las notificaciones). Al tocarla, abre su seguimiento
- [ ] Con la cita confirmada, en la conversación aparece **Cómo llegar** → abre Mapas

**Con un solo teléfono**: activa las notificaciones con Mariana, deja la app en segundo plano y responde como Rogelio desde la versión web en la computadora.

La primera vez, instala los paquetes de la versión web (quedan en `package.json`):

```powershell
cd C:\dev\oficio\apps\mobile
npx expo install react-native-web react-dom @expo/metro-runtime
npx expo start --web --clear
```

En la versión web no hay notificaciones push ni se pueden grabar notas de voz (el navegador graba en un formato que el bucket no acepta). Texto, fotos, ubicación y todo lo demás sí funcionan.

## Pendiente

- [ ] **Development build** si Expo Go no recibe las notificaciones en iPhone, y en Android en todo caso (beta).
- [ ] **Preferencias de avisos** (por ejemplo, silenciar mensajes).
- [ ] **Recordatorio** antes de la cita (necesita una tarea programada).
- [ ] **Reportar** un mensaje o usuario (la tabla `reports` ya existe).
- [ ] **Moderación de archivos** del chat antes de la beta.
