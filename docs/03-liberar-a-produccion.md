# 3 · Liberar a producción

Cómo pasar lo que está probado en `develop` a `main`, y qué hacer cuando algo urgente se rompe en producción.

[← El día a día](02-dia-a-dia.md) · [Siguiente: Producción: entornos y reglas →](04-produccion.md)

> **Estado actual:** todavía no existen los entornos de pruebas ni de producción en la nube. Hasta crearlos (cerca de la semana 10), "liberar a `main`" significa marcar una versión estable. El proceso es el mismo; los despliegues automáticos se agregarán a esta página cuando existan.

---

## Antes de liberar

- [ ] La revisión automática de `develop` está en verde.
- [ ] Lo que entra se probó en el entorno de pruebas (cuando exista).
- [ ] Si algún cambio toca la base: es compatible con la app instalada ([Migraciones seguras](04-produccion.md#migraciones-seguras)).
- [ ] Respaldo de producción del día verificado (cuando exista): Supabase → Database → Backups.
- [ ] Sabes qué número de versión le toca (ver abajo).

## Paso a paso

### 1. Abre el pull request de liberación

1. En GitHub: pestaña **Pull requests → New pull request**.
2. **base:** `main` · **compare:** `develop`.
3. Título: `Liberación v0.3.0`.
4. En la descripción, la lista de lo que entra. Puedes copiar los títulos de los pull requests unidos a `develop` desde la última liberación.
5. En la plantilla, marca **Liberación a producción** y revisa la sección *Solo para liberaciones*.
6. **Create pull request**.

La guardia **"A main solo entra develop o hotfix/\*"** comprueba que el origen sea correcto.

### 2. Une con merge commit

Revisión en verde → en el botón de unir elige **Create a merge commit** (no *Squash*) → **Confirm merge**.

> No borres la rama `develop` aunque GitHub lo ofrezca. Es permanente.

### 3. Marca la versión

```powershell
cd C:\dev\oficio
git checkout main
git pull
git tag v0.3.0
git push origin v0.3.0
git checkout develop
```

### 4. (Opcional) Publica las notas

En GitHub: **Releases → Draft a new release** → elige la etiqueta `v0.3.0` → **Generate release notes** → **Publish**. Queda un historial legible de qué entró en cada versión.

---

## Números de versión

Formato `vMAYOR.MENOR.PARCHE`:

| Cambia | Cuándo | Ejemplo |
|---|---|---|
| `PARCHE` | Solo correcciones | `v0.3.0` → `v0.3.1` |
| `MENOR` | Funcionalidades nuevas | `v0.3.1` → `v0.4.0` |
| `MAYOR` | Lanzamiento público | `v0.9.0` → `v1.0.0` |

Mientras sea `0.x`, el producto está en construcción y se vale cambiar cosas grandes.

---

## Corrección urgente (hotfix)

Úsalo cuando algo está roto para los usuarios **y** `develop` tiene cambios que todavía no deben salir.

### 1. Rama desde `main`

```powershell
git checkout main
git pull
git checkout -b hotfix/cancelar-sin-motivo
# corrige, prueba en local, commit
git push -u origin hotfix/cancelar-sin-motivo
```

### 2. Pull request a `main`

base `main` · compare `hotfix/…` → revisión en verde → **Create a merge commit** → etiqueta con el siguiente parche:

```powershell
git checkout main
git pull
git tag v0.3.1
git push origin v0.3.1
```

### 3. Lleva la corrección a `develop`

**No te saltes este paso:** si no, la siguiente liberación deshace la corrección.

```powershell
git checkout develop
git pull
git merge main
git push
```

Este es el único caso en que se sube directo a `develop`, porque solo trae lo que ya está en `main`.
