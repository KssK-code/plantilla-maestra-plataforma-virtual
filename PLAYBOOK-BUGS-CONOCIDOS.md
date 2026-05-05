# PLAYBOOK — BUGS CONOCIDOS
## Plantilla Maestra Plataforma Virtual

---

### Bug 19 — Precios hardcodeados post-deploy
**Síntoma:** Precios en landing no coinciden con los del cliente
(ej: $599 en lugar de $500, $4900 en lugar de $4500).
**Causa:** mev-deploy.sh o mev-onboarding.py no actualiza los valores
de CONFIG.precios en config.ts al personalizar para el cliente.
**Estado:** page.tsx YA lee desde CONFIG.precios (fix en plantilla).
El problema ocurre en la personalización, no en el template.
**Fix:** Después de cada deploy, verificar con:
grep -n "599\|4900\|5900" src/lib/config.ts
Si hay hits → actualizar manualmente CONFIG.precios con valores del cliente.
**Afecta:** Todos los clientes donde mev-onboarding.py no actualice precios.
**Fix permanente pendiente:** mev-onboarding.py debe escribir CONFIG.precios
en config.ts durante la personalización automática.

---
