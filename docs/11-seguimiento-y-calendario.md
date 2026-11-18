# 11 · Seguimiento y calendario

Primera parte del Sprint 4 (4A): el cliente sigue su solicitud paso a paso y puede cancelarla; el prestador tiene su calendario y marca cuándo no está disponible. El chat y las notificaciones llegan en la segunda parte (4B).

[← Respuestas y reseñas](10-respuestas-y-resenas.md) · [Inicio](README.md) · [Chat y notificaciones →](12-chat-y-notificaciones.md)

---

## En corto

| Para | Usa |
|---|---|
| Ver el seguimiento | `mariana@demo.mx` → **Solicitudes** → toca cualquier tarjeta |
| Ver el calendario | `rogelio@demo.mx` → pestaña **Calendario**. `npm run demo` le deja una cita confirmada mañana a las 10:00 (Daniela), su comida de cada día (13:00–14:00) y un día de descanso dentro de 4 días |
| Comprobar todo de un jalón | `npm run seguimiento` en `apps\api` (24 comprobaciones) |

## Las pantallas

**Cliente**

| Pantalla | Qué hace |
|---|---|
| **A7** Detalle y seguimiento | Se abre tocando una tarjeta de Solicitudes o "Tu próximo servicio" en Inicio. Estado (Enviada, Por confirmar, Programada, En curso…), el prestador con **Mensaje** y **Llamar**, la **línea de tiempo** (enviada → cotizó → confirmaste → en curso → terminado y calificado), lo que pediste con tus fotos y video, cuándo y dónde. Abajo, lo que toca: Confirmar cita, Ya terminó, Calificar o Buscar a alguien más. Se pone al día sola |
| **A7.1** Cancelar solicitud | Motivo obligatorio (ya lo resolví, encontré a otro, no puedo ese día, el precio, otro) y nota opcional. Si ya hay cotización o cita, sugiere pedir el cambio por el chat. "No me conviene" llega aquí con "El precio no me convence" marcado |
| **A7.2** Solicitud cancelada | Confirmación y "Ver mis solicitudes" (abre Historial) |

**Llamar** solo se activa con la cita confirmada: antes de eso nadie ve el teléfono del otro. **Mensaje** abre la conversación ([12](12-chat-y-notificaciones.md)).

**Prestador**

| Pantalla | Qué hace |
|---|---|
| **B6.1** Día | Las horas de su horario y cada evento en su lugar: citas confirmadas (verde), cotizaciones esperando confirmación (azul) y horas no disponibles (gris). Si el día está bloqueado completo, todas las horas salen sombreadas. Flechas para cambiar de día; tocar el título regresa a hoy. Una línea roja marca la hora actual |
| **B6.2** Semana | Lunes a domingo con bloques de color. Un día bloqueado completo (o que no trabaja según su horario) sale **sombreado de gris en toda la columna**, con "No disp." arriba. Tocar un día abre su vista de día |
| **B6.3** Mes | Los días no disponibles sombreados y tachados, puntos de color donde hay citas; abajo, lo del día elegido |
| **B6.4** Marcar como no disponible | Día, todo el día o de una hora a otra, motivo privado (comida, otro trabajo, personal, descanso) y **repetir** (no se repite, cada semana, cada día). Tocar un bloqueo en el calendario lo abre para editarlo o quitarlo |

Tocar una cita en el calendario abre su detalle (el del Sprint 3B).

## Decisiones del 4A

- **Una cita dura 1 hora en el calendario.** Todavía no se pide cuánto dura el trabajo; si hace falta, se agrega al cotizar.
- **Repetición sencilla**: cada día o cada semana, sin fecha de fin. Quitar un bloqueo que se repite quita todas sus repeticiones.
- **Un bloqueo no mueve citas.** Si ya hay una cita confirmada a esa hora, sigue en pie (así lo dice Figma).
- **Dónde cuentan los bloqueos**:
  - **A6** (nueva solicitud): un día bloqueado completo sale en gris.
  - **A4**, filtro "Hoy": quien bloqueó todo el día de hoy no aparece.
  - **B5** (cotizar): ya no ofrece horas que el prestador marcó como no disponibles.
- **El prestador todavía no cancela desde la app.** La base lo permite, pero no hay pantalla en Figma; queda pendiente.

## Qué se guarda en la base

La migración `20261216000000_seguimiento_calendario.sql`:

| Cambio | Para qué |
|---|---|
| `provider_unavailability.rrule` solo acepta `FREQ=DAILY` o `FREQ=WEEKLY` | Repetición de B6.4. El motivo, hasta 60 caracteres |
| `ocurrencias_bloqueos(prestador, desde, hasta)` | Despliega los bloqueos que se repiten (interna, no la llama la app) |
| `provider_busy_days(...)` | A6: ahora también con los bloqueos que se repiten |
| `buscar_prestadores(...)` | El filtro "Hoy" usa los bloqueos que se repiten |
| `mis_bloqueos(desde, hasta)` | B5: los bloqueos propios para no ofrecer esas horas |
| `calendario_prestador(desde, hasta)` | B6: citas, cotizaciones por confirmar y bloqueos |
| `seguimiento_solicitud(id)` | A7: todo lo de la pantalla, con la línea de tiempo. Teléfono solo con la cita confirmada. Solo el cliente de la solicitud |
| Nota de cancelación de hasta 500 caracteres | A7.1 |

## Probar en tu computadora

```powershell
cd C:\dev\oficio
npx supabase db reset
npm run db:types
cd apps\api
npm run demo
npm run seguimiento            # 24 comprobaciones
```

## Lista para el iPhone

Arranca Expo con `npx expo start --clear`.

**Cliente** (`mariana@demo.mx`)

- [ ] Envía una solicitud a Rogelio (o usa una que ya tengas). Toca su tarjeta en **Solicitudes** → A7 con "Enviada" y la línea de tiempo
- [ ] Como Rogelio, cotízala. De vuelta como Mariana, el detalle dice **Por confirmar**, con su mensaje → **Confirmar cita** → **Programada**, aparece su teléfono y se activa **Llamar**
- [ ] **Mensaje** → abre la conversación con Rogelio
- [ ] **Cancelar solicitud** → toca "Cancelar solicitud" sin motivo: lo pide. Elige uno, escribe algo → **Cancelaste tu solicitud** → **Ver mis solicitudes** (Historial)
- [ ] En otra cotizada, **No me conviene** → llega con "El precio no me convence" marcado
- [ ] **Inicio** → toca "Tu próximo servicio" → abre su detalle

**Prestador** (`rogelio@demo.mx`)

- [ ] **Calendario** → Día: la comida de 13:00 a 14:00 (con el ícono de que se repite). Flecha → mañana: la cita de las 10:00 con Daniela
- [ ] **Semana**: bloques de color; el domingo y el día de descanso sombreados en toda la columna. Toca el de descanso → vista de día con todas las horas sombreadas
- [ ] **Mes**: el día de descanso en gris y tachado; tócalo y abajo sale "Todo el día · No disponible"
- [ ] **Bloquear** → elige un día, de 15:00 a 16:00, "Personal", "Cada semana" → **Guardar** → aparece en el calendario de ese día y de la semana siguiente
- [ ] Recibe una solicitud de tarde para ese día y ábrela en **Aceptar y cotizar**: no ofrece las 15:00
- [ ] En el calendario, toca el bloqueo → **Quitar (todas las repeticiones)**

## Pendiente

- [x] **4B**: chat y notificaciones push ([12](12-chat-y-notificaciones.md)).
- [ ] **El prestador cancela** una cita (falta diseñarlo en Figma).
- [ ] **Duración de la cita** y aviso si un bloqueo nuevo cae sobre una cita confirmada.
