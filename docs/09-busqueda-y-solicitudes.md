# 9 · Búsqueda y solicitudes

Cómo encuentra el cliente a un prestador y le manda una solicitud (Sprint 3A). La otra mitad (el prestador responde, cotiza o rechaza, y el cliente confirma y califica) está en [Respuestas y reseñas](10-respuestas-y-resenas.md).

[← Alta de prestador](08-alta-prestador.md) · [Inicio](README.md) · [Respuestas y reseñas →](10-respuestas-y-resenas.md)

---

## En corto

| Para | Usa |
|---|---|
| Probar como cliente | `mariana@demo.mx` / `Oficio2026!`, con dirección "Casa · 25 Sur 1302, La Paz" |
| Prestadores para encontrar | `npm run demo` crea 9 verificados en Puebla (ver la tabla de abajo) |
| Comprobar todo de un jalón | `npm run busqueda` en `apps\api` (39 comprobaciones) |

## Las pantallas

| Pantalla | Qué hace |
|---|---|
| **A3** Inicio | Desde dónde buscas (toca "Col. La Paz, Puebla" para cambiarlo), buscador, los 8 oficios, tu próximo servicio, tus favoritos y los mejor calificados cerca |
| **A3.0** Búsqueda | Escribes el problema con tus palabras ("se me bota la pastilla") y reconoce el oficio con el diccionario de la base. Si no lo reconoce, te deja elegir el oficio |
| **A4** Resultados | Prestadores del oficio, ordenados por distancia, con filtros: hasta 5 km, 4.5 o más, hoy |
| **A5** Perfil del prestador | INE verificada, certificaciones revisadas, calificación, trabajos, tiempo de respuesta, una reseña, servicios, precios y formas de pago. ♥ para favoritos |
| **A6** Nueva solicitud | Servicio, qué pasa, hasta 5 fotos y 1 video de 30 s, dirección, urgencia, días (en gris los que no trabaja), horario y forma de pago |
| **A3.1** Solicitudes | **En curso** (aceptadas y esperando respuesta), **Rechazadas** (rechazadas o sin respuesta en 2 h) e **Historial** (por mes) |
| **Direcciones guardadas** | Desde Perfil o al pedir. Con pin en el mapa, calle, número, colonia, C.P. y referencias. Una es la principal |

Las reseñas completas (A5.1) y los botones de Confirmar y Calificar llegaron en el Sprint 3B ([10](10-respuestas-y-resenas.md)). El detalle de cada solicitud (A7) y Mensajes son del Sprint 4: por ahora abren una pantalla provisional.

### Privacidad

- La búsqueda y el perfil del prestador **no** devuelven teléfonos, correos ni la ubicación exacta del prestador.
- El prestador **no** ve las direcciones del cliente. Con la solicitud ve la colonia; la calle y el número solo con la cita confirmada (`provider_request_view`, desde v0.2).
- Las fotos y el video de la solicitud están en el bucket privado `request-media`. Solo los ven el cliente y ese prestador.

## Qué se guarda en la base

La migración `20261202000000_busqueda_solicitudes.sql`:

| Función o regla | Para qué |
|---|---|
| `buscar_prestadores(lat, lng, oficio, km, calificación, hoy, orden, ids)` | Todas las listas de prestadores: búsqueda, resultados, "Mejor calificados" y favoritos. Solo verificados |
| `servicios_relacionados(oficio)` | Los chips de A3.0 |
| `perfil_prestador(id)` | Todo lo de A5 en una consulta |
| `mis_solicitudes()` | Las tarjetas de A3.1 y "Tu próximo servicio" |
| Revisión al enviar (trigger) | Que el prestador esté verificado, que el servicio sea suyo, que acepte esa forma de pago, que no haya días pasados y que el horario sea válido |
| Una dirección principal | Al marcar una como principal, las demás dejan de serlo |

Todas las funciones corren con permisos de dueño porque necesitan el nombre del prestador (cada quien solo puede leer su propio perfil). Por eso cada una devuelve solo datos públicos.

Además, `scripts/flujo.ts` ahora usa días en el futuro: la base ya no acepta solicitudes para días que pasaron.

## Prestadores de prueba

`npm run demo` los crea ya verificados. Todos entran con su correo y `Oficio2026!` (te servirán en el Sprint 3B para responder solicitudes).

| Prestador | Correo | Oficio | Colonia |
|---|---|---|---|
| Rogelio Hernández | rogelio@demo.mx | Electricidad | La Paz |
| Jorge Cuautle | jorge@demo.mx | Electricidad | Huexotitla |
| Ana Pérez | ana@demo.mx | Electricidad (solo cotiza) y Pintura | Volcanes |
| Miguel Tlapa | miguel@demo.mx | Electricidad | Gabriel Pastor |
| Lucía Morales | lucia@demo.mx | Pintura | Centro |
| Luis Romero | luis@demo.mx | Plomería | Anzures |
| Patricia Flores | patricia@demo.mx | Limpieza (por hora) | El Carmen |
| Sofía Ramírez | sofia@demo.mx | Niñeras (por hora) | La Paz |
| Raúl Vázquez | raul@demo.mx | Carpintería | Zavaleta |

Desde el Sprint 3B sus calificaciones, reseñas y trabajos son reales: salen de trabajos terminados y reseñas que crea el mismo script (ver [10](10-respuestas-y-resenas.md#decisiones-del-3b)).

## Probar en tu computadora

```powershell
cd C:\dev\oficio
npx supabase db reset
npm run db:types
cd apps\api
npm run demo
npm run busqueda
```

## Lista para el iPhone

Entra como `mariana@demo.mx` / `Oficio2026!`.

**Inicio y búsqueda**

- [ ] **Inicio**: arriba dice "Col. La Paz, Puebla", con "Hola, Mariana" y los 8 oficios. Abajo, "Mejor calificados cerca"
- [ ] Toca el buscador y escribe **"se me bota la pastilla de la luz"** → "Parece algo de electricidad…", los servicios relacionados y "Electricistas cerca · 4"
- [ ] Prueba **"tengo una fuga en el lavabo"** (plomería) y algo sin sentido ("asdf"): te deja elegir el oficio
- [ ] **Ver todos** → 4 electricistas ordenados por distancia. Toca los filtros y quítalos
- [ ] Desde Inicio, toca **Limpieza**: aparece Patricia con precio por hora

**Perfil y solicitud**

- [ ] Abre a **Rogelio** → INE verificada, 2 certificaciones, su calificación, servicios y formas de pago. Toca el ♥
- [ ] **Solicitar servicio**. Toca **Enviar solicitud** vacío → te dice qué falta
- [ ] Escribe qué pasa. En **+**, prueba **Tomar foto**, **Grabar video** (máximo 30 s) y **Elegir de mis fotos**. Quita una con la ✕
- [ ] Toca **Dirección** → la de casa. Cambia la urgencia y mira que cambia el texto. Con "Urgente, hoy" se marca hoy
- [ ] Los domingos salen en gris (Rogelio no trabaja). Elige dos días y "Tarde 14–18" → la nota dice qué verá Rogelio
- [ ] Marca Efectivo y Transferencia → **Enviar solicitud** → "Enviamos tu solicitud a Rogelio…" y la tarjeta en "Esperando respuesta"
- [ ] **Inicio**: "1 solicitud esperando respuesta" y Rogelio en "Tus favoritos"

**Direcciones**

- [ ] **Perfil → Direcciones guardadas → Agregar dirección**. El mapa se centra donde estás; toca **Usar mi ubicación**: el iPhone llena calle, colonia y C.P.
- [ ] Guárdala como **Trabajo**. En **Inicio**, toca la ubicación de arriba y elige "Trabajo": los resultados cambian según la distancia

**En Studio** (http://127.0.0.1:54323)

- [ ] **service_requests**: tu solicitud, `status = pending`, con días, `time_windows` y formas de pago
- [ ] **Storage → request-media**: una carpeta con el id de la solicitud y tus fotos o video

## Pendiente

- [x] **Sprint 3B**: bandeja del prestador, cotizar, rechazar, Confirmar y reseñas. Ver [10](10-respuestas-y-resenas.md).
- [ ] **Expirar a las 2 h**: la app ya muestra como expiradas las solicitudes sin respuesta. Falta programar en producción el trabajo `/jobs/expire-requests` de la API.
- [ ] **Avisos**: hoy nadie recibe notificación de la solicitud nueva. Llegan con las notificaciones push (Sprint 4).
