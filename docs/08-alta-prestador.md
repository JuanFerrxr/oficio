# 8 · Alta de prestador

Cómo se da de alta un prestador (Sprint 2): las pantallas B0.1 a B3, qué guarda la base, quién puede ver qué y cómo probarlo.

[← Acceso](07-acceso.md) · [Inicio](README.md)

---

## En corto

| Para | Usa |
|---|---|
| Darte de alta como prestador nuevo | Bienvenida → **Ofrezco mis servicios**, con un número de prueba (**55 5000 0001–0005**, código **123456**) |
| Volver prestador a un cliente | Entra como cliente → **Perfil → Ofrecer mis servicios** (misma cuenta, sin repetir códigos) |
| Ver los archivos subidos | Studio → **Storage**: `avatars` (fotos de perfil, público) y `verification` (INE, selfie, comprobante y certificados, privado) |
| Comprobar todo de un jalón | `npm run alta` en `apps\api` (34 comprobaciones) |

**Decisiones del Sprint 2**
- **Nadie revisa todavía los documentos.** Al enviar, el alta queda "En revisión" y ahí se queda.
- **Un prestador sin verificar no aparece en ninguna parte:** ni en las búsquedas, ni su perfil, ni sus servicios. Solo lo ve él mismo.
- Para que un prestador aparezca en las búsquedas del Sprint 3, hay que aprobarlo a mano (ver [Aprobar a mano en local](#aprobar-a-mano-en-local)).

## Las pantallas

| Paso | Pantalla | Qué pasa |
|---|---|---|
| 1 de 5 | **B0.1** Crea tu perfil de prestador | Foto, nombre, teléfono, correo, años de experiencia y aceptar el Aviso de privacidad y los Términos para prestadores |
| 1 de 5 | **B0.1b** Contraseña | Igual que A1.2: aquí se crea la cuenta |
| 2 de 5 | **B0.2** Verifica tu teléfono | Al poner el código se abre la sesión, **se crea el perfil de prestador** (años y Términos) y se sube la foto |
| 2 de 5 | **B0.3** Verifica tu correo | Igual que A2.1 ("Lo haré después" también funciona) |
| 3 de 5 | **B1** Servicios y precios | Oficios con chips; cada servicio con precio fijo, por hora o "Cotizo". Certificados opcionales |
| 4 de 5 | **B2** Zona, horario y pagos | Mapa con tu punto y el círculo de tu distancia máxima (1–25 km), días, horario y **formas de pago** (efectivo, transferencia, tarjeta con terminal propia; al menos una) |
| 5 de 5 | **B3** Verifica tu identidad | INE (frente y reverso), selfie y comprobante de domicilio. Con **Niñeras** se pide también la constancia de antecedentes no penales |
| — | **B4** Solicitudes | Mientras no esté aprobado: tarjeta "Termina tu alta" (qué pasos faltan) o "Recibimos tu alta · En revisión". La bandeja real llega en el Sprint 3 |
| — | **B8** Mi perfil | Resumen del alta. Cada fila abre el paso para editarlo. "Usar Oficio como cliente" cambia de modo sin cerrar sesión |

**Si alguien ya tiene cuenta de cliente**, en B0.1 solo pone foto, años y los Términos para prestadores, y sigue en B1. Es la misma cuenta y no repite contraseña ni códigos.

**Si alguien deja el alta a la mitad**, cada paso queda guardado. La próxima vez que abra la app entra a su bandeja, donde "Termina tu alta" lo lleva al primer paso pendiente.

### Una cuenta, dos modos

La misma persona puede contratar y ofrecer servicios.

- El teléfono recuerda el último modo que eligió: "Usar Oficio como cliente" en B8, u "Ofrecer mis servicios" / "Ir a mi cuenta de prestador" en A9.
- En un teléfono nuevo, quien tiene perfil de prestador entra a su bandeja.

## Qué se guarda en la base

La migración `20261125000000_alta_prestador.sql`:

| Cambio | Para qué |
|---|---|
| `provider_profiles.base_location` puede estar vacío | El perfil se crea en B0.1 y la ubicación llega en B2 |
| `terms_accepted_at` y `terms_version` en `provider_profiles` | Constancia de los Términos para prestadores. La fecha la pone el servidor y solo cambia si acepta una versión nueva |
| `submitted_at` | Cuándo envió el alta a revisión |
| Al menos una forma de pago | `payment_methods` no puede quedar vacío (efectivo por omisión) |
| `iniciar_alta_prestador(años, versión)` | Crea (o actualiza) el perfil de prestador |
| `mis_faltantes_alta()` | Qué le falta: `servicios`, `zona`, `horario`, `ine_front`, `ine_back`, `selfie`, `proof_of_address`, `criminal_record` |
| `enviar_a_revision()` | Si no falta nada, cambia el estado a `pending`. Si falta algo, responde con la lista |
| Reglas de lectura nuevas | Perfil, servicios, horario y portafolio solo se ven si el prestador está `verified` (o si eres tú) |
| Reglas para reemplazar | Puedes cambiar tus documentos y certificados mientras no estén revisados |

La app **no puede** cambiar `verification_status`. Solo pueden hacerlo `enviar_a_revision()` (y únicamente a `pending`) o alguien con la llave de servicio.

### Dónde quedan los archivos

| Bucket | Ruta | Quién lo ve |
|---|---|---|
| `avatars` | `<id>/foto-<fecha>.jpg` | Cualquiera (es la foto del perfil) |
| `verification` | `<id>/ine_front.jpg`, `ine_back`, `selfie`, `proof_of_address`, `criminal_record` | Solo el prestador y Oficio (llave de servicio) |
| `verification` | `<id>/certificados/<fecha>.jpg` | Igual |

Cada documento tiene un registro en `verification_documents` con su ruta. Si el prestador toma otra foto, se reemplaza el archivo y el registro.

## Probar en tu computadora

Con Docker Desktop abierto:

```powershell
cd C:\dev\oficio
npx supabase db reset          # aplica la migración nueva
npm run db:types
cd apps\mobile
npm install                    # paquetes nuevos: mapa, ubicación, cámara/fotos y control deslizante
cd ..\api
npm run demo
npm run alta                   # 34 comprobaciones
```

## Lista para el iPhone

Arranca Expo con `npx expo start --clear`. La primera vez, iOS pide permisos de **ubicación**, **cámara** y **fotos** para Expo Go: acéptalos.

**Prestador nuevo**

- [ ] Si tienes sesión, ciérrala (Perfil → Cerrar sesión). Bienvenida → **Ofrezco mis servicios** → "Paso 1 de 5"
- [ ] Toca **Agregar foto** → **Tomar foto** (cámara frontal) o **Elegir de mis fotos**
- [ ] Llena tus datos con **55 5000 0001** y un correo inventado. Años: 12. Marca la casilla. **Continuar**
- [ ] Contraseña (Paso 1 de 5) → código **123456** (Paso 2 de 5) → código del correo en Mailpit
- [ ] **B1**: toca **Electricidad**, precio 350. **Agregar otro servicio**: "Instalar contacto", 250. Toca **Plomería** y elige **Cotizo**: ya no pide precio
- [ ] **Agregar certificado o título**: nombre, institución, año y una foto → aparece "En revisión"
- [ ] **B2**: el mapa se centra en donde estás, con el círculo. Toca otro punto del mapa y el pin se mueve. Mueve la distancia y el círculo cambia de tamaño. Quita el sábado y cambia "Hasta" a 18:00. En **Formas de pago**, quita Efectivo y toca Continuar: pide al menos una. Elige Efectivo y Transferencia
- [ ] **B3**: toca **Enviar a revisión** sin documentos → dice qué falta
- [ ] Sube la INE (frente y reverso), la selfie (solo con cámara) y el comprobante → las tres filas en verde → **Enviar a revisión**
- [ ] Llegas a **Solicitudes** con "Recibimos tu alta · En revisión"
- [ ] **Perfil**: tu foto, "Electricidad y Plomería · 12 años", "En revisión", 3 servicios, zona, horario y "Efectivo y transferencia". Toca **Horario base**, cambia algo, **Guardar**, y se ve el cambio
- [ ] **Usar Oficio como cliente** → pestañas del cliente. **Perfil → Ir a mi cuenta de prestador** → de regreso a la bandeja

**Cliente que se vuelve prestador**

- [ ] Cierra sesión y entra como `mariana@demo.mx` / `Oficio2026!`
- [ ] Perfil → **Ofrecer mis servicios** → dice "Usarás tu cuenta de Mariana García…", sin pedir teléfono ni contraseña
- [ ] Años, casilla de Términos para prestadores → **Continuar** → B1
- [ ] Cierra Expo Go por completo y vuelve a abrir → bandeja con **"Termina tu alta · 1 de 4 pasos"** → **Continuar** te regresa a B1

**En Studio** (http://127.0.0.1:54323)

- [ ] **Table Editor → provider_profiles**: tu prestador con `verification_status = pending`, `terms_version = 2026-11`, `submitted_at`
- [ ] **Storage → verification**: una carpeta con tu id y los 4 documentos (y `certificados/`)

## Aprobar a mano en local

Mientras no exista la revisión, puedes aprobar un prestador de prueba desde Studio:

1. Abre **SQL Editor** y escribe:

   ```sql
   update provider_profiles set verification_status = 'verified', verified_at = now()
   where user_id = (select id from profiles where phone = '525550000001');
   ```

2. En la app, la bandeja deja de mostrar la tarjeta y B8 dice "Perfil verificado".

Solo en tu computadora. En producción esto lo hará la revisión (pendiente).

## Pendiente

- [ ] **Revisión de documentos.** Hoy nadie aprueba. Antes de la beta hay que decidir: revisión manual con una pantalla o script de administración, o Truora/MetaMap. B3 promete "Te avisaremos por correo": ese aviso todavía no existe.
- [ ] **Portafolio** en B8 (Sprint 3).
- [ ] **Términos para prestadores**: falta redactarlos. El enlace abre una pantalla provisional. Al publicarlos, cambiar `src/features/auth/legal.ts`.
- [ ] **Producción**: el mapa de Apple funciona sin llave en iPhone. Para Android (Google Maps) hará falta una llave de Google cuando se haga la versión de tiendas.
- [ ] **Datos personales delicados**: la selfie que se compara con la INE es un dato biométrico, y los antecedentes no penales pueden dar lugar a discriminación. Revisar si deben tratarse como datos sensibles conforme a la LFPDPPP (consentimiento expreso). El aviso de privacidad debe decir quién los revisa y cuánto tiempo se guardan.
