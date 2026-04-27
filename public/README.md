# Assets del cliente — REEMPLAZAR antes de producción

Esta carpeta contiene placeholders genéricos. Cada cliente debe reemplazarlos
con sus archivos propios ANTES de habilitar funciones en producción.

## Archivos obligatorios por cliente

| Archivo | Descripción | Si NO se reemplaza |
|---|---|---|
| `logo.png` | Logo del cliente (PNG con transparencia, mín. 200x80px) | Plataforma muestra placeholder vacío |
| `firma-direccion.png` | Firma del director del cliente (PNG, recomendado fondo blanco o transparente) | ⚠️ Constancias se generan SIN firma — NO emitir certificaciones |
| `favicon.svg` | Favicon del cliente (opcional — placeholder genérico MEV funciona) | — |

## Reemplazo para cada cliente nuevo

```bash
# Desde la raíz del repo del cliente:
cp /ruta/a/logos-cliente/logo.png public/logo.png
cp /ruta/a/firmas/director.png public/firma-direccion.png
git add public/ && git commit -m "feat(assets): logos y firma del cliente"
git push
```

## Por qué placeholders y no archivos hardcoded

Antes esta plantilla traía logos y firmas de IVS hardcoded. Eso causaba que
clientes nuevos arrancaran con identidad de IVS visible y, peor aún, que sus
constancias se firmaran con la firma del director de IVS (problema legal).

Los placeholders transparentes hacen visible la falta de assets del cliente
sin contaminar la identidad cruzada.
