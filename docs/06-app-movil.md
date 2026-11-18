# 6 · App móvil

La app de Oficio (Expo + React Native) en tu iPhone, conectada a tu Supabase local. Al terminar esta página verás la app en tu teléfono, recorrerás las pestañas del cliente y del prestador, y la pantalla de **Diagnóstico** confirmará que el iPhone habla con tu base.

[← Revisión automática](05-revision-automatica.md) · [Inicio](README.md)

> **Estado: Sprint 3 (búsqueda, solicitudes, respuestas y reseñas).** Funcionan el acceso ([7](07-acceso.md)), el alta del prestador ([8](08-alta-prestador.md)), buscar y pedir un servicio ([9](09-busqueda-y-solicitudes.md)) y la respuesta del prestador con las reseñas ([10](10-respuestas-y-resenas.md)). Sigue: Sprint 4 · Seguimiento (A7), chat y notificaciones.

---

## Antes de empezar

- Haber completado la página [1 · Instalar y correr en local](01-instalar-y-correr-local.md): Supabase encendido y `npm run demo` ya corrido.
- Un **iPhone** con iOS reciente y la app **Expo Go** (gratis, App Store). Las instrucciones de Android están al final.
- El iPhone y la computadora **en la misma red Wi-Fi**. Las redes de invitados o de oficinas suelen aislar a los dispositivos entre sí; usa la de tu casa.

## Paso 1 · Permitir que el iPhone se conecte a tu computadora

El iPhone necesita llegar a dos puertos de tu computadora:

| Puerto | Qué es |
|---|---|
| `8081` | El servidor de Expo, que le manda el código de la app al teléfono |
| `54321` | Tu Supabase local |

Abre **PowerShell como administrador** (clic derecho → Ejecutar como administrador) y corre **una sola vez**:

```powershell
New-NetFirewallRule -DisplayName 'Oficio dev (Supabase + Expo)' -Direction Inbound -Protocol TCP -LocalPort 54321,8081 -Action Allow -Profile Private -RemoteAddress LocalSubnet
```

La regla solo acepta conexiones de tu red local (`LocalSubnet`) y solo en redes marcadas como **Privadas**. Revisa cómo está marcada la tuya:

```powershell
Get-NetConnectionProfile
```

Si en `NetworkCategory` dice `Public` y es la red de tu casa, cámbiala (como administrador):

```powershell
Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private
```

Usa el nombre que aparece en `InterfaceAlias`. La primera vez que corras Expo, Windows puede preguntar si Node.js puede usar la red: elige **Redes privadas** → Permitir.

## Paso 2 · Instalar dependencias

```powershell
cd C:\dev\oficio\apps\mobile
npm install
```

## Paso 3 · Crear el `.env` de la app

El iPhone **no puede usar `127.0.0.1`**: para el teléfono, esa dirección es el propio teléfono. La app tiene que apuntar a la IP de tu computadora en el Wi-Fi.

Con Supabase encendido, desde la raíz del proyecto:

```powershell
cd C:\dev\oficio
powershell -ExecutionPolicy Bypass -File scripts\crear-env-mobile.ps1
```

El script:

1. Detecta la IP de tu computadora en la red local e ignora los adaptadores virtuales de Docker y WSL.
2. Lee la llave pública de tu Supabase local.
3. Escribe `apps\mobile\.env`.
4. Comprueba que Supabase responde en esa IP.
5. Te avisa si falta la regla del firewall o si tu red está marcada como Pública.

Debe terminar con algo como:

```
IP detectada: 192.168.1.73  (adaptador: Wi-Fi)
Listo: apps\mobile\.env creado con http://192.168.1.73:54321
Supabase responde en http://192.168.1.73:54321.
```

> **Solo la llave pública va en la app.** Todo lo que empieza con `EXPO_PUBLIC_` se copia dentro de la app y cualquiera podría leerlo. La llave pública está hecha para eso: la seguridad la ponen las reglas RLS de la base. La `service role` **nunca** va aquí.

**Si cambias de red o tu IP cambia** (los routers la reasignan a veces), vuelve a correr el script con `-Force` y reinicia Expo con `npx expo start --clear`. Si el script no encuentra la IP, búscala con `ipconfig` (Dirección IPv4 del adaptador Wi-Fi) y pásala a mano: `... crear-env-mobile.ps1 -Ip 192.168.1.73`.

## Paso 4 · Arrancar Expo y abrir la app en el iPhone

**La primera vez: cuenta de Expo.** Las versiones recientes de Expo Go piden haber iniciado sesión con la misma cuenta en la computadora y en el teléfono. La cuenta es gratuita.

1. En la computadora: `npx expo login`. Puedes entrar con GitHub.
2. Si el navegador muestra la bienvenida de Expo ("Get your project started"), elige **Build with Expo Go** y termina la bienvenida con el botón del final. **No corras los comandos que muestra:** `create-expo-app` crearía otro proyecto vacío, y `eas init` conecta el proyecto con la nube de Expo y modifica `app.json` (se hará más adelante, para TestFlight, en su propia rama).
3. Confirma con `npx expo whoami`.
4. En el iPhone: Expo Go → **Profile** → inicia sesión con la misma cuenta.

```powershell
cd C:\dev\oficio\apps\mobile
npx expo start
```

Aparece un **código QR** en la terminal.

1. Abre la **cámara** del iPhone y apunta al QR. Toca el aviso que dice "Abrir en Expo Go".
2. La primera vez, iOS pregunta: *"Expo Go quiere buscar y conectarse a dispositivos en tu red local"* → **Permitir**. Sin este permiso, la app no llega a tu computadora.
3. Espera a que termine de cargar. La primera vez tarda un poco más.

Verás la pantalla de bienvenida (A1).

## Paso 5 · Recorrer la app

| Desde la bienvenida | Llegas a |
|---|---|
| **Necesito un servicio** | Registro en 4 pasos (A1.1 → A2.1) y después las pestañas del cliente |
| **Ofrezco mis servicios** | Alta del prestador en 5 pasos (B0.1 → B3) y después sus pestañas |
| **¿Ya tienes cuenta? Entra** | Entrar (A0.1) con contraseña o con código (A0.6) |
| **¿Olvidaste tu contraseña?** | Recuperar la contraseña (A0.2 → A0.5) |
| **Herramientas de desarrollo** | Diagnóstico y catálogo de componentes (solo en desarrollo) |

Para registrarte usa un **número de prueba**: 55 5000 0001 a 55 5000 0005, código **123456** (no se manda ningún SMS). Los detalles están en [7 · Acceso](07-acceso.md).

Cada pantalla provisional muestra su código de Figma (A3, B4…), qué hará y en qué sprint se construye.

## Paso 6 · Diagnóstico: comprobar la conexión

Bienvenida → **Herramientas de desarrollo** → **Diagnóstico de conexión**. Revisa tres cosas:

| Comprobación | Qué demuestra | Esperado |
|---|---|---|
| 1 · Conexión con la base | El iPhone llega a tu Supabase y las reglas RLS dejan leer las categorías sin sesión | ✓ 8 oficios: Plomería, Electricidad… |
| 2 · Función de búsqueda (A3.0) | Las funciones de la base responden desde la app | ✓ "se me bota la pastilla de la luz" → Electricidad |
| 3 · Sesión guardada | La sesión se guarda en el teléfono | Toca **Entrar como Mariana (demo)** → ✓ Dentro como mariana@demo.mx |

Para la 3: después de entrar, **cierra Expo Go por completo** (desliza hacia arriba desde la barra de apps) y vuelve a abrirlo. Al regresar a Diagnóstico debe seguir "Dentro como mariana@demo.mx". Si no corriste `npm run demo` en `apps\api`, el botón falla con un aviso.

Si la 1 tarda unos 10 segundos y termina en ✗ diciendo *"No llego a …"*, ve a [Problemas comunes](#problemas-comunes).

## Paso 7 · Catálogo de componentes

**Herramientas de desarrollo** → **Catálogo de componentes** muestra todos los componentes base con sus variantes. Ábrelo junto a la página *Fundamentos y componentes* de Figma y compara. Si algo no coincide (un color, un radio, un tamaño), se corrige en `src/components/ui/` y el arreglo llega a todas las pantallas a la vez.

## Antes de abrir el pull request

Lo que revisa la revisión automática, más lo que solo se ve en el teléfono:

```powershell
cd C:\dev\oficio\apps\mobile
npm run typecheck      # errores de TypeScript
npm run export:ios     # que la app se empaquete como para el iPhone (crea dist-check/, ignorado por Git)
```

En el iPhone:

- [ ] Abre en la bienvenida (A1) con las letras y colores de Figma (o en Inicio, si ya tenías sesión)
- [ ] La lista de [7 · Acceso](07-acceso.md#lista-para-el-iphone): registro, entrar, recuperar y Perfil
- [ ] Catálogo: los componentes coinciden con Figma
- [ ] Diagnóstico: las 3 comprobaciones en verde, y la sesión sigue después de cerrar y abrir Expo Go

## Trabajar con la app abierta

- Guarda un archivo y la app se actualiza sola en el iPhone en uno o dos segundos.
- **Agita el iPhone** para abrir el menú de desarrollo: *Reload* recarga la app.
- En la terminal de Expo: `r` recarga y `j` abre las herramientas de depuración.
- Si algo se ve raro después de cambiar `.env`, `tailwind.config.js` o `global.css`: Ctrl+C y luego `npx expo start --clear`.

---

## Cómo está organizada

```
apps/mobile/
├── app/                        # Cada archivo es una pantalla (Expo Router)
│   ├── _layout.tsx             # Raíz: fuentes, sesión y quién puede ver qué (Stack.Protected)
│   ├── index.tsx               # "/" decide a dónde va cada quien, según la sesión
│   ├── (auth)/                 # Sin sesión (o a mitad del registro/recuperación)
│   │   ├── welcome.tsx         # A1
│   │   ├── register.tsx        # A1.1 · Tus datos
│   │   ├── register-password.tsx  # A1.2 · Crea una contraseña (aquí se crea la cuenta)
│   │   ├── verify-phone.tsx    # A2 · Código por SMS
│   │   ├── login.tsx           # A0.1 · Entrar
│   │   ├── login-code.tsx      # A0.6 · Entrar con código
│   │   ├── forgot.tsx          # A0.2 · ¿Olvidaste tu contraseña?
│   │   ├── forgot-code.tsx     # A0.3 · Escribe el código
│   │   ├── new-password.tsx    # A0.4 · Nueva contraseña
│   │   ├── password-updated.tsx   # A0.5 · Listo
│   │   └── provider-signup.tsx # B0.1 · Alta de prestador nuevo (sigue con contraseña y códigos)
│   ├── (cuenta)/               # Con sesión: se usan en el registro y desde Perfil
│   │   ├── verify-email.tsx    # A2.1 · Verifica tu correo
│   │   └── edit-profile.tsx    # Editar mis datos (nombre)
│   ├── cliente/                # Fuera de las pestañas: buscar (A3.0), resultados (A4), prestador/[id] (A5),
│   │                           #   solicitar/[id] (A6), ubicacion, direcciones, direccion
│   ├── alta/                   # Alta del prestador con sesión: datos (B0.1), servicios (B1),
│   │                           #   certificado, zona (B2), verificacion (B3), documento
│   ├── proximamente.tsx        # Provisional genérica para filas que llegan en otro sprint
│   ├── (client)/               # Pestañas del cliente → /home, /requests, /messages, /profile
│   │   ├── _layout.tsx
│   │   ├── home.tsx            # A3
│   │   ├── requests.tsx        # A3.1
│   │   ├── messages.tsx        # A3.2
│   │   └── profile.tsx         # A9
│   ├── prestador/              # Pestañas del prestador → /prestador, /prestador/calendar…
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # B4
│   │   ├── calendar.tsx        # B6.1
│   │   ├── messages.tsx        # B9
│   │   ├── reviews.tsx         # B7
│   │   └── profile.tsx         # B8
│   └── dev/                    # Diagnóstico y catálogo (solo desarrollo)
├── src/
│   ├── components/ui/          # Componentes base = componentes de Figma
│   ├── components/Proximamente.tsx  # Pantalla provisional
│   ├── components/auth/        # Campos de contraseña con medidor, "¿No llegó? Reenviar"
│   ├── components/cliente/     # Buscador, oficios, tarjetas de prestador, favorito y solicitud, días, formas de pago
│   ├── components/prestador/   # Mapa (y su versión web para pruebas), foto de perfil, hora, estado del alta
│   ├── features/auth/          # Sesión y modo (cliente/prestador), flujo pendiente, teléfonos, errores
│   ├── features/cliente/       # Desde dónde busca, textos y fechas, mis solicitudes
│   ├── features/prestador/     # Datos del alta, subir fotos, ubicación, horario, documentos
│   ├── lib/supabase.ts         # Cliente de Supabase (tipado con la base)
│   ├── navigation/tabs.tsx     # Estilo de la barra de pestañas
│   └── theme/colors.ts         # Colores en hex para íconos y lo que no acepta className
├── global.css                  # Tokens de color (mismos nombres que en Figma)
└── tailwind.config.js          # Fuentes, tamaños y espaciados de Figma
```

### Dos ajustes respecto al documento de arquitectura

- **Prestador en `prestador/`, no en `(provider)/`.** Las carpetas entre paréntesis no aparecen en la dirección de la pantalla, así que `(client)/messages` y `(provider)/messages` serían ambas `/messages` y chocarían. Con una carpeta normal, las del prestador quedan como `/prestador/messages`.
- **Inicio del cliente en `home.tsx`, no en `index.tsx`.** `app/index.tsx` es la puerta de entrada que decide a dónde va cada persona; si el Inicio también fuera `index`, las dos serían `/`.

### Tokens y componentes: Figma = código

| Figma | Código | Ejemplo |
|---|---|---|
| Variable `Color/primary` | `bg-primary`, `text-primary` (definido en `global.css`) | `className="bg-primary"` |
| Estilo `heading/2xl` | `font-display text-2xl` | títulos de pantalla |
| Estilo `body/base` | `font-sans text-base` | texto corrido |
| `Espaciado/spacing/4` | escala de Tailwind (1 = 4 px) | `p-4`, `gap-3` |
| Componente `Button` | `<Button variant size icon>` | `src/components/ui/Button.tsx` |
| Ícono `Icon/map-pin` | `<MapPin />` de `lucide-react-native` | mismos SVG |

Si cambias un color, cámbialo en **tres** lugares: Figma, `global.css` y `src/theme/colors.ts`. El último existe para los íconos y las propiedades que no aceptan `className`.

**Clases completas, siempre.** NativeWind solo reconoce clases escritas tal cual en el código. `bg-${tono}` no funciona; usa un mapa con las clases completas (ver `Badge.tsx`).

### Componentes base

`AppBar` · `Avatar` · `Badge` · `BottomBar` · `Button` · `Checkbox` · `Chip` · `ListGroup` / `ListRow` · `Logo` · `Note` · `OTPInput` · `ProgressBar` · `Screen` · `SegmentedControl` · `TextField` · `Title`. Se importan todos desde `@/components/ui`.

---

## Agregar una pantalla

1. Crea el archivo en la carpeta que le toca: `app/(client)/search.tsx` → ruta `/search`.
2. Arma la pantalla con `Screen` y componentes de `@/components/ui`; evita estilos sueltos.
3. Para leer datos usa el cliente de `@/lib/supabase`: está tipado con la base, así que el editor te avisa si escribes mal una tabla o una columna.
4. Navega con `router.push('/search')` o `<Link href="/search">` de `expo-router`.
5. Si una pestaña crece y necesita subpantallas (por ejemplo `requests/[id]`), conviértela en carpeta (`requests/index.tsx` + `requests/[id].tsx` + `requests/_layout.tsx`). La pestaña conserva su nombre.
6. Antes del pull request: `npm run typecheck` y prueba en el iPhone.

**Agregar una librería:** usa `npx expo install nombre`, no `npm install`. Elige la versión compatible con el SDK de Expo. Si la librería trae código nativo que no está en Expo Go, la app necesitará un *development build*; pregunta antes de agregarla.

---

## Problemas comunes

### Expo Go se queda cargando o dice "Could not connect to development server"

El iPhone no llega al puerto 8081 de tu computadora.

1. ¿Misma red Wi-Fi en los dos?
2. ¿Existe la regla del firewall? `Get-NetFirewallRule -DisplayName 'Oficio dev (Supabase + Expo)'`
3. ¿Tu red está como Privada? `Get-NetConnectionProfile`
4. iPhone → **Ajustes → Expo Go → Red local** activado.
5. Si nada funciona, prueba `npx expo start --tunnel`. Esto solo resuelve el código de la app: Supabase sigue necesitando la red local.

### Diagnóstico: "No llego a http://192.168.x.x:54321"

La app abrió, pero no llega a Supabase.

1. ¿Supabase encendido? `npx supabase status` en la raíz.
2. ¿La IP del `.env` es la actual? Compara con `ipconfig`; si cambió, corre `crear-env-mobile.ps1 -Force` y `npx expo start --clear`.
3. Firewall y red Privada: mismos puntos que arriba.
4. Prueba desde Safari en el iPhone: abre `http://192.168.x.x:54321/rest/v1/`. Si responde con un mensaje sobre la llave (`apikey`), la red está bien y el problema es el `.env`.

### Diagnóstico: "Falta apps/mobile/.env"

Corre el paso 3 y reinicia con `npx expo start --clear`. Las variables `EXPO_PUBLIC_` se leen al arrancar Expo.

### "Entrar como Mariana" falla con "Invalid login credentials"

No existen los usuarios de prueba (pasa después de `npx supabase db reset`): en `apps\api`, `npm run demo`.

### "You need to be signed in to Expo Go and Expo CLI to open your project"

Falta la cuenta de Expo en uno de los dos lados: ve a la parte "La primera vez: cuenta de Expo" del paso 4.

### "Project is incompatible with this version of Expo Go"

Expo Go del App Store solo abre proyectos del SDK más reciente. Actualiza Expo Go. Si el proyecto quedó en un SDK anterior, se actualiza con `npx expo install expo@latest --fix` en una rama aparte.

### Se ven letras del sistema en lugar de las de Figma

Las fuentes no cargaron. Reinicia con `npx expo start --clear`. Si persiste, revisa en la terminal de Expo errores de `expo-font`.

---

## Android (si alguien del equipo lo usa)

Mismo proceso: instala **Expo Go** desde Google Play, y en Expo Go toca **Scan QR code**. La regla del firewall y el `.env` son los mismos. Android no tiene el permiso de "Red local".
