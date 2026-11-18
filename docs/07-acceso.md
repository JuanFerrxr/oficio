# 7 · Acceso

Registro, entrar y recuperar la contraseña (Sprint 1). Cómo funciona, qué guarda la base y cómo probarlo en tu computadora y en tu iPhone.

[← App móvil](06-app-movil.md) · [Inicio](README.md)

---

## En corto

| Para | Usa |
|---|---|
| Registrarte en la app | Un número de prueba: **55 5000 0001** a **55 5000 0005** · código **123456** |
| Entrar con un usuario que ya existe | `mariana@demo.mx` o `222 418 0937` · contraseña `Oficio2026!` (crea los usuarios con `npm run demo`) |
| Ver los correos con código | Mailpit: **http://127.0.0.1:54324** en el navegador de tu computadora |
| Comprobar todo de un jalón | `npm run acceso` en `apps\api` (25 comprobaciones) |

En local **no se manda ningún SMS ni correo real**. Los SMS solo funcionan con los números de prueba y los correos llegan a Mailpit.

## Las pantallas

| Flujo | Pantallas | Qué pasa en Supabase |
|---|---|---|
| **Registro** | A1.1 Tus datos → A1.2 Contraseña → A2 Código SMS → A2.1 Código del correo | En A1.2 se crea la cuenta con teléfono y contraseña. En A2 el código confirma el teléfono y abre la sesión. En A2.1 se agrega el correo y se confirma con su propio código |
| **Entrar** | A0.1 | Teléfono **o** correo (si tiene "@" es correo) y contraseña |
| **Entrar con código** | A0.1 → A0.6 | Código por SMS (o WhatsApp) al teléfono. Solo para cuentas que ya existen |
| **Recuperar contraseña** | A0.2 → A0.3 → A0.4 → A0.5 | Código por SMS, correo o WhatsApp. El código abre la sesión, se guarda la nueva contraseña y se cierran las sesiones de otros dispositivos |
| **Perfil** | A9 | Nombre, teléfono verificado, correo, editar nombre, cerrar sesión |

"Lo haré después" en A2.1 deja la cuenta sin correo; se puede agregar después en **Perfil → Correo electrónico**.

### Quién ve qué

`app/_layout.tsx` decide con la sesión:

| Situación | Puede ver |
|---|---|
| Sin sesión | Bienvenida, registro, entrar y recuperar |
| Con sesión | Las pestañas del cliente, Perfil, verificar correo |
| Con sesión, **a mitad de un flujo** | El paso que falta: A2.1 en el registro, A0.4 en la recuperación |

El tercer caso existe porque el código del paso 3 (o de la recuperación) ya abre la sesión, pero falta un paso. Ese "pendiente" vive en memoria (`src/features/auth/flujo.ts`): si la app se cierra a la mitad, al volver a abrirla entra directo a Inicio con la sesión que ya tenía. En el registro solo faltaría el correo (se agrega desde Perfil); en la recuperación, la contraseña vieja sigue funcionando.

## Qué se guarda en la base

La migración `20261118000000_acceso_perfil.sql` hace dos cosas:

1. **El perfil solo guarda datos verificados.** `profiles.phone` y `profiles.email` se llenan cuando Supabase confirma el código, no antes. Así nadie puede "apartar" un teléfono o correo ajeno sin el código.
2. **Constancia del consentimiento.** `profiles.terms_accepted_at` (hora del servidor) y `profiles.terms_version` (hoy `2026-11`). La app no puede escribir esas columnas; las llena el trigger con lo que se manda al registrarse.

Cuando cambien el aviso de privacidad o los términos, sube `VERSION_TERMINOS` en `apps/mobile/src/features/auth/flujo.ts`.

## La configuración de Auth (`supabase/config.toml`)

| Ajuste | Valor | Por qué |
|---|---|---|
| `minimum_password_length` · `password_requirements` | 8 · minúsculas, mayúsculas y números | Igual a los requisitos de A1.2. Si cambian, cámbialos también en `src/features/auth/contrasena.ts` |
| `[auth.sms] enable_signup` · `enable_confirmations` | true · true | Registro con teléfono, confirmado con código |
| `[auth.email] enable_confirmations` | true | Sin esto, agregar un correo lo guardaría **sin** pedir código |
| `[auth.email] double_confirm_changes` | false | El código se pide solo al correo nuevo (muchas cuentas no tienen correo anterior) |
| `[auth.email] otp_expiry` | 600 | El código vence en 10 minutos, como dice la pantalla |
| `[auth.email.template.*]` | `supabase/templates/` | Correos en español con el código de 6 dígitos |
| `[auth.sms.test_otp]` | 55 5000 0001–0005, Mariana y Rogelio → 123456 | Probar sin mandar SMS |
| `[auth.sms.twilio]` | Encendido con datos **falsos** | Solo para que en local funcionen los números de prueba también por WhatsApp. Un número real falla con "No pudimos mandar el SMS" |
| `[auth.rate_limit]` | Altos | Solo en local, para probar sin esperar |

Estos valores son **solo para tu computadora y la revisión automática**. En producción se configuran en el panel de Supabase (ver [Pendiente para producción](#pendiente-para-producción)).

Después de cambiar `config.toml`: `npx supabase stop` y `npx supabase start` (un `db reset` no recarga la configuración de Auth).

## Probar en tu computadora

Con Docker Desktop abierto:

```powershell
cd C:\dev\oficio
npx supabase stop
npx supabase start             # recarga config.toml (Auth y plantillas)
npx supabase db reset          # aplica la migración nueva
npm run db:types               # tipos al día (columnas terms_*)
cd apps\api
npm run demo                   # Mariana y Rogelio, ahora con el aviso aceptado
npm run acceso                 # 25 comprobaciones de registro, entrar y recuperar
```

`npm run acceso` usa el número 55 5000 0005 y el correo `acceso@prueba.mx`, y los borra al empezar y al terminar. Si ese número lo estabas usando a mano en la app, se borra.

## Lista para el iPhone

Arranca Expo como siempre ([6 · App móvil, paso 4](06-app-movil.md#paso-4--arrancar-expo-y-abrir-la-app-en-el-iphone)). Si ya tenías sesión de antes, ve a **Perfil → Cerrar sesión**.

**Registro**

- [ ] Bienvenida → **Necesito un servicio**. Toca **Continuar** sin llenar nada: marca los campos que faltan
- [ ] Llena tus datos con el teléfono **55 5000 0001** y un correo inventado (p. ej. `yo@prueba.mx`). Sin la casilla del aviso, no deja continuar
- [ ] A1.2: escribe una contraseña poco a poco. El medidor pasa de Débil a Buena o Excelente y los requisitos se van marcando. "Continuar" se activa cuando cumple y coincide la confirmación
- [ ] A2: escribe **000000** → "El código no es correcto o ya venció". Luego **123456** → pasa solo a A2.1
- [ ] A2.1: abre **http://127.0.0.1:54324** en tu computadora, abre el correo "Tu código para verificar tu correo" y escribe el código → llegas a Inicio
- [ ] Perfil: tu nombre completo, +52 555 000 0001, "Teléfono verificado" y tu correo
- [ ] **Editar mis datos**: cambia el nombre, guarda, y se ve el cambio
- [ ] Cierra Expo Go por completo y ábrelo: sigues dentro

**Entrar**

- [ ] Perfil → **Cerrar sesión** → regresa a la bienvenida
- [ ] **Entra** con el correo y una contraseña equivocada → "Teléfono, correo o contraseña incorrectos"
- [ ] Entra con el teléfono (`555 000 0001`) y la contraseña buena
- [ ] Cierra sesión. **Entra** → escribe el teléfono → **Entrar con código por SMS** → 123456 → Inicio

**Recuperar**

- [ ] Cierra sesión. **¿Olvidaste tu contraseña?** → **Por correo** → tu correo → el código de Mailpit
- [ ] A0.4: escribe la misma contraseña → "Tiene que ser distinta a tu contraseña anterior". Escribe otra → A0.5 → **Ir al inicio**
- [ ] Cierra sesión y entra con la contraseña nueva
- [ ] Repite la recuperación **Por SMS** (código 123456)

**Casos raros**

- [ ] Regístrate otra vez con 55 5000 0001 → al crear la contraseña: "Ese teléfono ya tiene una cuenta"
- [ ] Regístrate con **55 5000 0002** y el correo `mariana@demo.mx` → en A2.1: "Ese correo ya está registrado en otra cuenta". Toca **Lo haré después** → Perfil muestra Correo "Agregar"

## Cómo está hecho

| Archivo | Qué tiene |
|---|---|
| `app/_layout.tsx` | Quién puede ver qué grupo de pantallas (`Stack.Protected`) |
| `src/features/auth/flujo.ts` | Datos del registro en curso y el "pendiente" |
| `src/features/auth/errores.ts` | Errores de Supabase → mensajes en español, por código de error |
| `src/features/auth/telefono.ts` | Validar y dar formato a celulares de México (+52, 10 dígitos) |
| `src/features/auth/contrasena.ts` | Requisitos y medidor de la contraseña |
| `src/components/auth/` | Campos de contraseña con medidor y "¿No llegó? Reenviar en 0:59" |
| `apps/api/scripts/acceso.ts` | Las 25 comprobaciones de `npm run acceso` (también corren en GitHub) |

Decisiones:

- **Supabase no dice si un teléfono ya tiene cuenta al registrarse** (responde "ok" sin crear nada, para no revelar qué números existen). La app lo detecta porque esa respuesta viene sin identidades y lo explica en A1.2.
- **En recuperar por teléfono sí se dice** "No encontramos una cuenta con ese número": Supabase lo responde así y es mejor para la persona que esperar un código que nunca llega. El riesgo (saber si un número usa Oficio) es bajo y lo frenan los límites de intentos.
- **El nombre se guarda completo** en `full_name` (nombre y apellidos juntos). Si más adelante se necesitan separados (p. ej. para facturar), se agrega en una migración nueva.

## Pendiente para producción

Antes de abrir la beta, en el panel de Supabase del proyecto de producción:

- [ ] **Proveedor de SMS**: Twilio (o Twilio Verify) con un número o remitente para México. WhatsApp necesita además una plantilla aprobada por Meta
- [ ] **Correo**: un SMTP propio (Resend, SendGrid, Amazon SES…) con el dominio de Oficio. El de Supabase solo manda unos pocos correos por hora
- [ ] Las dos plantillas de `supabase/templates/` y sus asuntos, y la plantilla del SMS
- [ ] Mismos ajustes de contraseña, confirmaciones y vencimiento que en `config.toml`; **sin** números de prueba
- [ ] Límites: 60 segundos entre SMS al mismo número y límites por hora razonables
- [ ] Aviso de privacidad y Términos publicados; cambiar `src/features/auth/legal.ts` para que los abra
- [ ] **Eliminar mi cuenta** desde la app: Apple lo exige a toda app que permite crear cuentas. Hoy muestra un aviso
