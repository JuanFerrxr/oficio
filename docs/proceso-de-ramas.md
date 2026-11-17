# Proceso de ramas y liberaciones · Oficio

> Regla de oro: **nada llega a `main` sin haber pasado antes por `develop`**.
> `main` es lo que tienen (o tendrán) los usuarios reales; `develop` es donde se prueba.

## 1. Las ramas

| Rama | Para qué | Quién la crea | Se une a | Cómo se une |
|---|---|---|---|---|
| `main` | Producción. Lo que tienen los usuarios | — (permanente) | — | — |
| `develop` | Pruebas (staging). Todo lo terminado, antes de liberarlo | — (permanente) | `main` | Pull request **Create a merge commit** |
| `feature/<nombre>` | Una funcionalidad: `feature/registro-4-pasos` | Tú, desde `develop` | `develop` | Pull request **Squash and merge** |
| `fix/<nombre>` | Una corrección que no es urgente | Tú, desde `develop` | `develop` | **Squash and merge** |
| `hotfix/<nombre>` | Algo roto en producción que no puede esperar | Tú, desde `main` | `main` y luego `develop` | **Create a merge commit** |

**Por qué dos formas de unir:**

- Feature → develop con *squash*: los 15 commits de "intento", "ya quedó" y "ahora sí" se convierten en uno solo con un buen mensaje. El historial de `develop` se lee como una lista de funcionalidades.
- Develop → main con *merge commit* (sin squash): `main` y `develop` comparten exactamente los mismos commits. Si aquí usaras squash, GitHub creería que `develop` tiene cambios "pendientes" que ya están en `main`, y cada liberación se volvería un enredo.

## 2. Los entornos

Cada rama permanente tiene su propio entorno, con su propia base de datos y sus propias llaves. **Nunca comparten datos.**

| | Local | Pruebas (staging) | Producción |
|---|---|---|---|
| Rama | `feature/*`, `fix/*` | `develop` | `main` |
| Base de datos | Supabase local (Docker) | Proyecto Supabase `oficio-staging` (plan gratuito) | Proyecto Supabase `oficio-prod` (Pro, con respaldos) |
| API | `npm run dev` | Cloud Run `oficio-api-staging` | Cloud Run `oficio-api` |
| App | Expo Go | EAS canal `preview` (TestFlight interno / APK de prueba) | EAS canal `production` (tiendas) |
| Datos | Mariana y Rogelio de `npm run demo` | Ficticios, creados para probar | Reales |
| Despliegue | Manual | Automático al unir a `develop` | Automático al unir a `main` |

> **Estado actual:** solo existe el entorno local. Las ramas y las reglas se usan desde hoy; staging y producción se crean cerca de la semana 10–11, antes de la beta. Hasta entonces, "liberar a `main`" significa marcar una versión estable.

**Datos personales:** nunca copies datos de producción a staging ni a tu computadora, ni "para probar un error". Son datos de usuarios reales (LFPDPPP); para reproducir un problema, se recrea con datos ficticios.

## 3. El día a día (una funcionalidad)

```powershell
# 1. Parte de develop actualizado
git checkout develop
git pull

# 2. Crea tu rama
git checkout -b feature/registro-4-pasos

# 3. Trabaja y guarda tantas veces como quieras
git add .
git commit -m "Pantalla A1.2: crear contraseña"

# 4. Súbela
git push -u origin feature/registro-4-pasos
```

5. En GitHub aparece el botón **Compare & pull request**. Destino: `develop`.
6. Llena la plantilla (se carga sola) y espera la revisión automática.
7. Si todo está **verde** → **Squash and merge** → **Delete branch**.
8. En tu computadora:

```powershell
git checkout develop
git pull
git branch -d feature/registro-4-pasos
```

## 4. Liberar a producción (develop → main)

Cuando lo que hay en `develop` está probado y quieres que llegue a los usuarios:

1. En GitHub: **Pull requests → New pull request**, base `main`, compare `develop`.
2. Título: `Liberación v0.3.0`. En la descripción, la lista de lo que entra (puedes copiar los títulos de los PR unidos a develop desde la última liberación).
3. Revisa la sección **"Solo para liberaciones"** de la plantilla.
4. Revisión automática en verde → **Create a merge commit**.
5. Marca la versión:

```powershell
git checkout main
git pull
git tag v0.3.0
git push origin v0.3.0
git checkout develop
```

**Versiones (`vMAYOR.MENOR.PARCHE`):**
- `PARCHE` (0.3.**1**): solo correcciones.
- `MENOR` (0.**4**.0): funcionalidades nuevas.
- `MAYOR` (**1**.0.0): el lanzamiento público. Mientras sea 0.x, el producto está en construcción.

## 5. Corrección urgente en producción (hotfix)

Algo está roto para los usuarios y `develop` tiene cosas que todavía no están listas:

```powershell
git checkout main
git pull
git checkout -b hotfix/cancelar-sin-motivo
# corrige, commit
git push -u origin hotfix/cancelar-sin-motivo
```

1. PR `hotfix/…` → `main` → verde → **Create a merge commit** → tag `v0.3.1`.
2. **No olvides** llevar la corrección a develop, o la próxima liberación la deshará:

```powershell
git checkout develop
git pull
git merge main
git push
```

## 6. Migraciones seguras (lo más importante con producción)

La app móvil complica todo: cuando liberas, **la versión anterior de la app sigue instalada** en celulares que no han actualizado. La base nueva tiene que seguir funcionando con la app vieja.

**Reglas:**

1. **Nunca edites una migración que ya existe.** Ya se aplicó en staging o producción y no se vuelve a correr; tu cambio nunca llegaría ahí. Crea una nueva: `npx supabase migration new nombre`. (La revisión automática lo vigila.)
2. **Solo cambios compatibles en un paso.** Agregar una tabla, agregar una columna con valor por defecto o que acepte vacío, agregar una función: seguro.
3. **Los cambios destructivos van en tres liberaciones** (patrón *expandir → migrar → contraer*). Ejemplo, renombrar `cancel_note` a `cancel_comment`:
   - Liberación A: agrega `cancel_comment`; la app nueva escribe en ambas.
   - Liberación B: copia los datos viejos; la app lee de `cancel_comment`.
   - Liberación C (semanas después, cuando casi nadie tenga la app vieja): borra `cancel_note`.
4. **No hay "deshacer" en la base.** Si una migración sale mal en producción, se corrige con otra migración hacia adelante, no regresando el código.
5. **Antes de liberar algo que toca la base:** confirma que el respaldo de producción del día existe (Supabase Pro → Database → Backups).

## 7. Si algo sale mal después de liberar

| Qué se rompió | Cómo se regresa |
|---|---|
| API | Cloud Run → servicio `oficio-api` → Revisiones → enviar el 100% del tráfico a la revisión anterior. Un minuto. |
| App (JavaScript) | `eas update:rollback` o publicar el update anterior en el canal `production`. Llega a los celulares al reabrir la app. |
| App (nativo, versión de tienda) | No se puede retirar; se publica una versión nueva. Por eso los cambios nativos se prueban más en staging. |
| Base de datos | Migración correctiva hacia adelante (regla 4). En un caso grave, restaurar el respaldo, sabiendo que se pierde lo escrito después. |

## 8. Limitaciones del plan gratuito de GitHub (repositorio privado)

- **No se puede bloquear** que alguien una un PR con la revisión en rojo, ni que suba directo a `main`. La revisión avisa con una ✗ roja, pero no impide. Hasta tener GitHub Pro o Team, la regla es de disciplina: **nunca unir en rojo, nunca push directo a `main`**.
- Los **Environments** de GitHub (secretos por entorno con aprobación manual) tampoco están disponibles en privados gratuitos. Cuando existan staging y producción, los secretos se nombran con sufijo: `SUPABASE_SERVICE_ROLE_KEY_STAGING`, `…_PROD`.
- Si en algún momento pagas GitHub Pro, activa en *Settings → Rules*: `main` y `develop` requieren pull request y revisión automática en verde.
