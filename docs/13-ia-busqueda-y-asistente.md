# 13 · IA: búsqueda y asistente de solicitud

Primera parte del Sprint 5 (5A). El cliente busca con sus palabras ("la coladera no traga") y la app entiende qué oficio necesita; al pedir un servicio, un asistente revisa la descripción y las fotos y sugiere qué falta. La segunda parte (5B) trae la moderación y la ayuda para cotizar.

[← Chat y notificaciones](12-chat-y-notificaciones.md) · [Inicio](README.md)

---

## En corto

| Para | Usa |
|---|---|
| Ver el asistente sin pagar nada | `IA_DEMO=true` en `apps\api\.env` y la API corriendo (`npm run dev`). Responde **ejemplos**, con la etiqueta "Modo demo" |
| Búsqueda por significado de verdad | Tu llave de Voyage en `VOYAGE_API_KEY` ([abajo](#las-llaves)) |
| Asistente de verdad | Tu llave de Claude en `ANTHROPIC_API_KEY`. Al ponerla, el demo se apaga solo |
| Comprobar todo de un jalón | `npm run ia` en `apps\api` (42 comprobaciones, con un Claude y un Voyage de mentira: no gasta nada) |

**Sin llaves y sin `IA_DEMO`, la app funciona exactamente igual que antes**: la búsqueda usa el diccionario y el asistente no aparece.

## Qué ve la gente

| Pantalla | Qué cambia |
|---|---|
| **A3.0** Buscar | Escribe el problema con sus palabras. Si el diccionario reconoce una palabra exacta ("pastilla"), gana. Si no, la IA busca por significado: "mi coladera del patio no traga agua" → *Por lo que describes, parece algo de plomería*. Si duda entre oficios, ofrece **¿O es de…?** con las otras opciones. En **Servicios relacionados** salen primero los que coincidieron con lo que escribió ("Destapar coladera") |
| **A6** Nueva solicitud | Debajo de las fotos, **Revisa tu solicitud con IA → Revisar mi solicitud**. Con la descripción y las fotos sugiere: el servicio del prestador que encaja (**Usar este**), si parece urgente (**Cambiar a "Urgente, hoy"**), lo que se ve en las fotos, hasta 3 datos que faltan (tocar uno lo agrega a la descripción para contestarlo) y, si hay riesgo, un aviso de seguridad (por ejemplo, olor a gas) |

**Nada cambia solo.** Cada sugerencia se aplica con un toque y el cliente puede ignorarlas todas. La IA nunca da precios: eso lo decide el prestador.

## Cómo funciona por dentro

```
Búsqueda    App ──► API /ia/buscar ──► diccionario (match_categories)
                                  └──► Voyage: texto → vector ──► Postgres (pgvector): los más parecidos

Asistente   App (fotos reducidas a 1024 px) ──► API /ia/asistente-solicitud ──► Claude ──► API valida ──► App
```

- **La app solo habla con la API para la IA.** Todo lo demás sigue yendo directo a Supabase. Las llaves de Claude y Voyage viven solo en `apps\api\.env`; nunca en la app ni en Git.
- **Búsqueda por significado.** Cada oficio (con su lista de palabras) y cada servicio de un prestador verificado se convierte en un vector de 1024 números con Voyage y se guarda en la tabla `ia_embeddings`. La API los calcula sola cada minuto (solo los nuevos o editados) o con `POST /jobs/ia-indexar`. Lo que escribe el cliente también se convierte en vector (y se guarda en `ia_consultas`, para no pagar dos veces la misma búsqueda) y la base devuelve los oficios más parecidos.
- **Orden de los resultados:** 1) palabra exacta del diccionario; 2) lo que encontró la IA; 3) parecidos del diccionario. Así "coladera" no termina en Albañilería por parecerse a "colado".
- **Asistente.** A Claude se le piden las sugerencias a través de una herramienta con esquema JSON fijo: responde datos, no texto libre. La API revisa todo antes de mandarlo a la app: si el modelo inventa un servicio que el prestador no ofrece, se descarta; las preguntas se recortan a 3; los textos, a un largo máximo. Las fotos no se guardan: solo se le muestran al modelo.
- **El texto del cliente es información, no instrucciones.** Va separado en el mensaje al modelo y las reglas le piden ignorar órdenes que vengan ahí.
- **Si la IA falla, nada se rompe.** Si Voyage no responde, la búsqueda usa el diccionario. Si Claude no responde, el asistente muestra el error y la solicitud se envía igual.
- **Límite por persona** (lo cuenta la base, tabla `ia_uso`): 200 búsquedas y 30 revisiones del asistente cada 24 horas. Se cambian con `IA_LIMITE_BUSQUEDA` e `IA_LIMITE_ASISTENTE`.

## Las llaves

Las dos van **solo** en `apps\api\.env`. Nunca en el chat, en la app ni en Git.

**Voyage AI** (búsqueda):

1. Crea tu cuenta en https://www.voyageai.com (ahora es parte de MongoDB; puede pedirte crear la llave desde MongoDB Atlas). Trae una cuota gratuita.
2. Crea una API key y pégala en `apps\api\.env`:
   ```
   VOYAGE_API_KEY=pa-...
   ```
3. Reinicia la API. Al arrancar dice `IA · búsqueda por significado: activa` y luego `IA · vectores calculados: 26`.

Si la llave la creaste en MongoDB Atlas y Voyage la rechaza, agrega también `VOYAGE_URL=https://ai.mongodb.com/v1/embeddings`.

**Claude** (asistente), cuando decidas activarlo:

1. En https://console.anthropic.com: cuenta, **Billing** (con 5 USD sobra para desarrollo), **Limits** (pon un límite de gasto mensual bajo) y **API Keys → Create Key**.
2. En `apps\api\.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Reinicia la API: dice `asistente: real` y la etiqueta "Modo demo" desaparece de la app.

El modelo es `claude-haiku-5-5` (rápido y barato, y ve imágenes). Se cambia con `CLAUDE_MODELO`.

**Ajustar la búsqueda:** `IA_UMBRAL_BUSQUEDA` (de 0 a 1, por defecto 0.35) es qué tan parecido tiene que ser un oficio para sugerirlo. Si con tu llave real sugiere oficios que no tienen que ver, súbelo (0.45); si no encuentra cosas obvias, bájalo (0.3). Este valor hay que calibrarlo con búsquedas reales en la beta.

## Qué se guarda en la base

La migración `20261230000000_ia_busqueda_asistente.sql`:

| Cambio | Para qué |
|---|---|
| Extensión `vector` (pgvector) | Guardar y comparar vectores dentro de Postgres |
| Vista `ia_documentos` | El texto de cada oficio y de cada servicio activo de un prestador verificado |
| Tabla `ia_embeddings` | Un vector por texto, con su huella (`hash`) para saber si cambió. Solo la lee la API |
| `ia_documentos_pendientes` · `ia_limpiar_embeddings` | Qué falta calcular y qué borrar (servicios desactivados o prestadores sin verificar). Solo la API |
| Tabla `ia_consultas` | Caché de búsquedas ya convertidas en vector |
| `categorias_por_significado(vector, umbral, límite)` | Los oficios más parecidos, con los servicios que coincidieron |
| Tabla `ia_uso` · `ia_registrar_uso(tipo, límite)` | Cuántas veces usa la IA cada persona. Nadie la lee desde la app |

## Probar en tu computadora

```powershell
cd C:\dev\oficio
npx supabase db reset
npm run db:types
cd apps\mobile
npm install                    # paquete nuevo: expo-image-manipulator (reduce las fotos)
cd ..\api
npm run demo
npm run ia                     # 42 comprobaciones (no gasta nada)
npm run dev
```

`npm run ia` borra los vectores de prueba al terminar; la API vuelve a calcular los reales en el siguiente minuto.

**Para el iPhone**, la app necesita la dirección de la API. Vuelve a crear el `.env` de la app (agrega `EXPO_PUBLIC_API_URL`) y abre el puerto 8080 una vez:

```powershell
cd C:\dev\oficio
powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1 -Force
```

Si el script lo indica, en PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName 'Oficio dev (API)' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private -RemoteAddress LocalSubnet
```

## Lista para el iPhone

Con la API corriendo e `IA_DEMO=true`. Arranca Expo con `npx expo start --clear`.

**Cliente** (`mariana@demo.mx`)

- [ ] **Inicio → buscador** → escribe "se me bota la pastilla" → *Parece algo de electricidad* (diccionario, como antes)
- [ ] Con tu llave de Voyage: escribe "mi coladera del patio no traga agua" → *Por lo que describes, parece algo de plomería* y "Destapar coladera" en Servicios relacionados
- [ ] Abre a Rogelio → **Solicitar servicio** → aparece **Revisa tu solicitud con IA** con "Modo demo"
- [ ] Escribe "Necesito una visita de diagnóstico, se bota la pastilla cuando prendo el microondas" y agrega una foto → **Revisar mi solicitud**
- [ ] Sugiere "Visita de diagnóstico" → **Usar este** (cambia el servicio arriba)
- [ ] **Cambiar a "Urgente, hoy"** → la urgencia cambia
- [ ] Toca una pregunta → se agrega al final de tu descripción
- [ ] Apaga la API (Ctrl+C) y abre otra solicitud: el recuadro de IA ya no aparece y todo funciona igual

En modo demo las respuestas son de ejemplo: buscan palabras sueltas y no "entienden" la foto. Con la llave de Claude, las sugerencias salen de verdad de tu descripción y tus fotos.

## Pendiente

- [ ] **5B**: moderación (texto, fotos y datos de contacto en el chat) y ayuda para cotizar del prestador.
- [ ] **Calibrar `IA_UMBRAL_BUSQUEDA`** con búsquedas reales.
- [ ] Usar las búsquedas que no encontraron nada para hacer crecer el diccionario.
- [ ] Aviso de privacidad: mencionar que las fotos y descripciones se procesan con IA (Sprint 6).
