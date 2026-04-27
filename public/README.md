# Assets del cliente

Esta carpeta contiene archivos genéricos. Algunos deben reemplazarse para cada cliente.

## Reemplazar SIEMPRE para cada cliente nuevo

| Archivo | Descripción | Si NO se reemplaza |
|---|---|---|
| `logo.png` | Logo del cliente (PNG con transparencia, mín. 200x80px) | Plataforma muestra placeholder transparente |

## Genéricos (mantener)

| Archivo | Descripción |
|---|---|
| `favicon.svg` | Favicon genérico MEV — opcional reemplazar |
| `firma-direccion.png` | Firma genérica de dirección — sirve para todos los clientes hasta que pidan personalizarla |

## Reemplazo de logo

Desde la raíz del repo del cliente:

```bash
cp /ruta/al/logo-cliente.png public/logo.png
git add public/logo.png && git commit -m "feat(assets): logo del cliente"
git push
```
