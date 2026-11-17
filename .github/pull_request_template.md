## Qué cambia

<!-- Una o dos frases. Si viene del prototipo, menciona la pantalla (A6, B4…). -->

## Tipo

- [ ] Funcionalidad nueva (`feature/…` → develop)
- [ ] Documentación (`docs/…` → develop)
- [ ] Corrección (`fix/…` → develop)
- [ ] Liberación a producción (develop → main)
- [ ] Corrección urgente de producción (`hotfix/…` → main)

## Revisión antes de unir

- [ ] La revisión automática (CI) está en verde
- [ ] Si toqué la base: migración **nueva** (no edité una existente) y corrí `npm run db:types`
- [ ] El cambio en la base es compatible con la versión de la app que ya está instalada (ver docs/04-produccion.md, sección "Migraciones seguras")
- [ ] Ningún secreto en el código (llaves, contraseñas, `.env`)
- [ ] Probé el cambio en mi computadora (`npm run flujo` o la pantalla afectada)

## Solo para liberaciones (develop → main)

- [ ] Lo probé en el entorno de pruebas (staging) — cuando exista
- [ ] Respaldo de la base de producción verificado — cuando exista
- [ ] Versión de esta liberación: `v0.__.__`
