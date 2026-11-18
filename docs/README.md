# Wiki de Oficio

Plataforma móvil que conecta a prestadores de servicios del hogar (plomeros, electricistas, niñeras…) con clientes de su zona. Piloto en Puebla.

Esta carpeta es la documentación del proyecto. Vive junto al código para que cada cambio importante actualice también su página, en el mismo pull request.

## Páginas

| # | Página | Para qué |
|---|---|---|
| 1 | [Instalar y correr en local](01-instalar-y-correr-local.md) | Primera vez: dejar la base de datos y la API funcionando en tu computadora |
| 2 | [El día a día](02-dia-a-dia.md) | Cómo hacer un cambio: rama, commit, pull request, revisión, unir |
| 3 | [Liberar a producción](03-liberar-a-produccion.md) | Pasar `develop` a `main`, versiones y correcciones urgentes |
| 4 | [Producción: entornos y reglas](04-produccion.md) | Pruebas vs. producción, migraciones seguras, datos personales, cómo regresar |
| 5 | [Revisión automática (CI)](05-revision-automatica.md) | Qué revisa GitHub en cada cambio y qué hacer si sale en rojo |
| 6 | [App móvil](06-app-movil.md) | Correr la app en tu iPhone con Expo Go, cómo está organizada y cómo agregar pantallas |
| 7 | [Acceso](07-acceso.md) | Registro, entrar y recuperar la contraseña: cómo funciona, números de prueba y cómo probarlo |
| 8 | [Alta de prestador](08-alta-prestador.md) | B0.1–B3: servicios, zona y horario, documentos, quién ve qué y cómo probarlo |

## Las reglas en una línea

- Nada llega a `main` sin pasar antes por `develop`.
- Nunca unir un pull request con la revisión en rojo.
- Nunca editar una migración que ya existe: se crea una nueva.
- Nunca subir llaves ni el archivo `.env`.

## El proyecto

```
oficio/
├── .github/
│   ├── workflows/ci.yml          # revisión automática
│   ├── workflows/reglas.yml      # guardias del proceso de ramas
│   └── pull_request_template.md  # lista de revisión de cada PR
├── apps/api/                     # API Node.js + Hono (irá a Cloud Run)
├── apps/mobile/                  # App Expo + React Native (iPhone y Android)
├── packages/shared/              # tipos TypeScript generados de la base
├── supabase/
│   ├── config.toml               # configuración local (Auth: SMS, correo, contraseñas, números de prueba)
│   ├── migrations/               # el esquema, en orden. Única fuente de verdad
│   ├── templates/                # correos con código (verificar correo, recuperar contraseña)
│   └── seed.sql                  # 8 oficios + diccionario de búsqueda (solo local)
├── scripts/crear-env.ps1         # arma apps/api/.env con las llaves locales
├── scripts/crear-env-mobile.ps1  # arma apps/mobile/.env con la IP de tu computadora
└── docs/                         # esta wiki
```

## Referencias de diseño

- Prototipo interactivo: https://www.figma.com/design/0MlqQqhAWVo13XUES3fDrK — los códigos de pantalla (A3, B6.2…) son los mismos que usan las rutas y los pull requests.
- Documento de arquitectura v0.2 (stack, modelo de datos, plan): compartido por la dueña del proyecto.
