# Assets del cliente

Esta carpeta contiene archivos genéricos. Algunos deben reemplazarse para cada cliente.

## Reemplazar SIEMPRE para cada cliente nuevo

| Archivo | Descripción | Si NO se reemplaza |
|---|---|---|
| `logo.png` | Logo del cliente (PNG con transparencia, mín. 200x80px) | Plataforma muestra placeholder transparente |
| `favicon.svg` | Isotipo del cliente. **Pedir SVG o PNG con transparencia** | La pestaña muestra el hexágono genérico MEV, que no es del cliente |

> **Canal alfa, siempre.** Un logo o isotipo en PNG con fondo blanco plano se
> degrada al pasar por `/_next/image` y aparece como un recuadro blanco sobre
> los fondos oscuros de la plataforma. Al pedir assets al cliente, exigir SVG o
> PNG con transparencia — no aceptar JPG ni PNG con fondo sólido.

## Genéricos (mantener)

| Archivo | Descripción |
|---|---|
| `firma-direccion.png` | Firma genérica de dirección — sirve para todos los clientes hasta que pidan personalizarla |

## Reemplazo de logo

Desde la raíz del repo del cliente:

```bash
cp /ruta/al/logo-cliente.png public/logo.png
git add public/logo.png && git commit -m "feat(assets): logo del cliente"
git push
```
