# 10 · Respuestas y reseñas

La otra mitad de una solicitud (Sprint 3B): el prestador la ve en su bandeja, cotiza o rechaza; el cliente confirma, marca "Ya terminó" y califica. También explica cómo se ven las reseñas de un prestador.

[← Búsqueda y solicitudes](09-busqueda-y-solicitudes.md) · [Inicio](README.md) · [Seguimiento y calendario →](11-seguimiento-y-calendario.md)

---

## En corto

| Para | Usa |
|---|---|
| Probar como prestador | `rogelio@demo.mx` / `Oficio2026!`. `npm run demo` le deja **2 solicitudes nuevas**: de Óscar (con 3 fotos y un video de prueba) y de Carmen |
| Probar como cliente | `mariana@demo.mx`. Tiene un trabajo de Rogelio **terminado y sin calificar**. Las solicitudes nuevas de prueba ya no son suyas: lo que ella envíe desde la app es lo único suyo que llega a la bandeja |
| Más clientas | `carmen@demo.mx`, `oscar@demo.mx` y `daniela@demo.mx` (misma contraseña) |
| Solicitudes nuevas otra vez | Vencen a las 2 horas. Vuelve a correr `npm run demo` y aparecen otras dos |
| Comprobar todo de un jalón | `npm run respuestas` en `apps\api` (46 comprobaciones) |

## El recorrido de una solicitud

```
Cliente envía (A6) ──► Nueva en la bandeja (B4) ──► Rechazar con motivo ──► Rechazada (fin)
                                   │
                                   ▼
                        Aceptar y cotizar (B5)
                                   │
          Cliente: "No me conviene" ◄──┤──► Cliente: "Confirmar cita"
              (cancelada)              │       (se comparten calle y teléfono)
                                       ▼
                        Prestador: "Iniciar trabajo"
                                       │
                                       ▼
                         Cliente: "Ya terminó" ──► Calificar (A8)
```

Si el prestador no responde en 2 horas, la solicitud expira: ya no se puede cotizar y el cliente la ve en **Rechazadas**.

## Las pantallas

**Prestador**

| Pantalla | Qué hace |
|---|---|
| **B4** Solicitudes · Nuevas | La que vence primero se ve completa: contador "Responde en 1 h 38 min", cliente ("Mariana G."), colonia, distancia, lo que pidió, sus fotos (y un ▶ si trae video), días y horario. Las demás en una fila con la descripción en una línea. **Verla la marca como vista** (el cliente ve "Vista") |
| **Detalle de la solicitud** | Se abre tocando una fila, "Ver detalle" o cualquier tarjeta de Activas e Historial. Descripción completa, **todas las fotos** (se amplían al tocarlas) y **el video** con reproductor, días, horario, urgencia, forma de pago, dónde (la calle y el teléfono solo con la cita confirmada), tu cotización y el historial. Abajo: Rechazar / Aceptar y cotizar, o Iniciar trabajo |
| **B4** Disponible | Apagado, no aparece en las búsquedas ni le llegan solicitudes nuevas |
| **Rechazar** | Motivo obligatorio (no tengo disponibilidad, fuera de mi zona, no hago ese trabajo, otro) y mensaje opcional |
| **B5** Aceptar y cotizar | Precio (de inicio el de su perfil), hora de llegada **dentro de lo que pidió el cliente** (Tarde 14–18 → 14:00 a 17:00; nunca una hora que ya pasó) y mensaje opcional |
| **B4.1** Activas | Hoy, "Esperando que el cliente confirme" y próximos días. Con la cita confirmada: dirección, teléfono (se puede tocar para llamar) e **Iniciar trabajo** |
| **B4.2** Historial | Trabajos del mes, calificación y % de respondidas a tiempo. Debajo, por mes: "Cobraste $350 · Te calificó con 5 ★", "La rechazaste: …" |
| **B7** Mis reseñas | Promedio, barras por estrella, lo que más destacan sus clientes y filtros (todas, con fotos, 4 ★ o menos) |

**Cliente**

| Pantalla | Qué hace |
|---|---|
| **A3.1** Aceptada | La cotización y el mensaje del prestador, con **Confirmar cita** y **No me conviene** (pide confirmar y cancela con motivo "precio") |
| **A3.1** En curso | **Ya terminó** → lleva a calificar |
| **A3.1** Terminada | **Calificar a Rogelio** mientras no la califique |
| **A3.1** Rechazada | El motivo ("Rogelio no tiene disponibilidad esos días") y el mensaje si lo dejó |
| **A5** Perfil | "Ver las N reseñas" → A5.1 |
| **A5.1** Reseñas | Promedio y barras, fotos de clientes y filtros por etiqueta. El autor sale como "Carmen R.", nunca con el apellido completo |
| **A8** Calificar | Estrellas, etiquetas (puntual, explicó bien, buen precio, dejó limpio, amable), comentario, hasta 3 fotos, cuánto pagaste (privado) y guardar en favoritos |

## Decisiones del 3B

- **La app llama a la base directamente**, no a la API: `cotizar_solicitud`, `rechazar_solicitud`, `transition_request` y `calificar_solicitud`. Así funciona en el iPhone sin abrir el puerto 8080 de tu computadora. Las rutas de la API (`/requests/:id/accept`, `/decline`, …) siguen existiendo y usan las mismas funciones; servirán cuando haya notificaciones push.
- **Las calificaciones ya no se inventan.** El promedio, el número de reseñas y de trabajos los calculan los disparadores de la base. `npm run demo` crea trabajos terminados en días pasados y sus reseñas, con Mariana, las clientas de prueba y **cualquier otro cliente que ya tengas en tu base con una dirección guardada**. Por eso Rogelio ya no dice "127 reseñas", sino las que de verdad tiene.
- **El tiempo de respuesta es real**: se recalcula cada vez que el prestador acepta o rechaza (promedio de las últimas 50).
- **Las reseñas solo entran por `calificar_solicitud`.** Se quitó la regla que dejaba insertar directo en la tabla: así se validan las etiquetas, el monto y que la reseña sea del cliente al prestador.
- **Las listas se ponen al día solas**: Solicitudes del cliente y la bandeja del prestador escuchan los cambios en **tiempo real** (Supabase Realtime, respetando RLS), recargan cada 30 segundos por si el tiempo real se cae, al volver a la app y al **jalar la lista hacia abajo**.
- **Las tarjetas muestran lo que pidió el cliente** en una línea, para distinguir dos solicitudes del mismo servicio.
- **El prestador todavía no califica al cliente** ni responde reseñas. Por eso B7 no tiene el filtro "Sin responder" de Figma.

## Qué se guarda en la base

La migración `20261209000000_respuestas_resenas.sql`:

| Cambio | Para qué |
|---|---|
| `service_requests.decline_reason` | Motivo del rechazo: `sin_disponibilidad`, `fuera_de_zona`, `no_lo_hago`, `otro` |
| `bandeja_prestador()` | Todo lo de B4, B4.1 y B4.2 (incluye fotos y la ruta del video). Calle y teléfono del cliente solo con la cita confirmada |
| `cotizar_solicitud(id, precio, hora, mensaje)` | B5. Valida precio ($1–$100,000), hora futura y a menos de 30 días, y que no haya expirado. El mensaje queda en el chat |
| `rechazar_solicitud(id, motivo, nota)` | Rechazo con motivo |
| `mis_solicitudes()` | Ahora también devuelve el motivo de rechazo |
| `resenas_prestador(id)` y `resumen_resenas(id)` | A5.1 y B7. Solo reseñas públicas de prestadores verificados |
| `calificar_solicitud(id, estrellas, etiquetas, comentario, pago, favorito)` | A8. Solo el cliente, solo con el trabajo terminado, una vez |
| Máximo 3 fotos por reseña | En `review-media/<id de la reseña>/` (público) |
| Recalcular al borrar | Si se borra una reseña o una solicitud terminada, se recalculan calificación y trabajos |

## Probar en tu computadora

Con Docker Desktop abierto:

```powershell
cd C:\dev\oficio
npx supabase db reset          # aplica la migración nueva
npm run db:types
cd apps\api
npm run demo
npm run respuestas             # 46 comprobaciones
```

Si vienes del primer envío del 3B, corre también `npm install` en `apps\mobile`: se agregó `expo-video` para reproducir el video de la solicitud.

## Lista para el iPhone

Arranca Expo con `npx expo start --clear`.

**Primero, como cliente** (`mariana@demo.mx`)

- [ ] Inicio → Electricidad → Rogelio → **Solicitar servicio**. Escribe algo que reconozcas, agrega **2 fotos y un video corto** y envíala

**Prestador** (cierra sesión y entra con `rogelio@demo.mx`)

- [ ] **Solicitudes** → "Nuevas · 3". Arriba la de Carmen con "Responde en 1 h 3x min"; en las filas, la de Óscar y la tuya, cada una con lo que pidió
- [ ] Toca la fila de **Óscar** → detalle con 3 fotos y un video de prueba. Toca una foto (se amplía) y reproduce el video. Regresa
- [ ] Toca **tu** fila (la de Mariana) → tus fotos y tu video. **Aceptar y cotizar** desde ahí: el precio viene en $350, elige día y hora, escribe un mensaje → **Enviar cotización**
- [ ] Quedas en **Activas** con "Cotizaste $350 · esperando su confirmación". Toca la tarjeta → el detalle muestra tu cotización y el historial
- [ ] En la de Carmen toca **Rechazar** → **Rechazar solicitud** sin motivo: lo pide. Elige "No tengo disponibilidad" → regresa con el aviso
- [ ] **Historial**: los números del mes y la rechazada con su motivo
- [ ] Apaga **Disponible** → "No disponible" y el aviso. Préndelo otra vez
- [ ] Pestaña **Reseñas**: promedio, barras, etiquetas y filtros

**Cliente** (entra otra vez con `mariana@demo.mx`)

- [ ] **Solicitudes** → tu solicitud dice **Aceptada**, con la cotización y el mensaje de Rogelio → **Confirmar cita**
- [ ] Del lado de Rogelio, en **Activas** ya se ven la dirección y el teléfono → **Iniciar trabajo**
- [ ] De vuelta como Mariana: **Ya terminó** (si no aparece, jala la lista hacia abajo) → pantalla de calificar
- [ ] Toca 5 estrellas, dos etiquetas, escribe algo, **agrega una foto** y **Publicar reseña**
- [ ] En Historial: "Pagaste $… · Calificaste con 5 ★"
- [ ] **Inicio** → Electricidad → Rogelio → "Ver las N reseñas" → tu reseña con la foto arriba
- [ ] También en Historial: el trabajo de ayer con **Calificar a Rogelio**

Si tienes dos teléfonos (o el simulador), deja a Mariana en Solicitudes mientras Rogelio cotiza en el otro: la tarjeta cambia a Aceptada sola, sin tocar nada.

**En Studio** (http://127.0.0.1:54323)

- [ ] **service_requests**: la de Carmen con `decline_reason = sin_disponibilidad`
- [ ] **reviews** y **review_media**: tu reseña y su foto; **Storage → review-media**

## Pendiente

- [x] **A7 · Detalle y seguimiento** y cancelar: Sprint 4A ([11](11-seguimiento-y-calendario.md)). El **chat** llega en 4B.
- [ ] **Notificaciones push** al llegar una solicitud, al cotizar, al confirmar (Sprint 4).
- [ ] **Expirar a las 2 h** en producción: programar `/jobs/expire-requests`.
- [ ] **El prestador califica al cliente** y responde reseñas (después del MVP).
- [ ] **Moderación de reseñas**: hoy toda reseña es pública al instante. Antes de la beta conviene poder ocultar una reseña ofensiva (`is_public = false`) y tener un aviso de cómo reportarla.
