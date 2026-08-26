# Entrega final — PDF y mensaje de WhatsApp

**Es el ÚLTIMO paso del proceso de desarrollo MEV.** Cuando la plataforma ya está
en producción con su dominio definitivo, esto produce los dos entregables que
recibe el cliente:

```
entrega/<NOMBRE>_Entrega_Oficial.pdf
entrega/ENTREGA-WHATSAPP.txt
```

## Uso

```bash
cp scripts/entrega/entrega.local.ejemplo.json entrega.local.json   # una vez
# …editar con los datos del cliente…
pnpm entrega
```

El mensaje también se imprime en la terminal entre marcas de corte, listo para
copiar y pegar en WhatsApp.

| Flag | Efecto |
|---|---|
| `--solo-pdf` | No genera el mensaje |
| `--datos otro.json` | Usa otro archivo de datos |

## De dónde sale cada dato

Casi todo se lee solo. **No hay que capturar dos veces lo que ya está en el
config**, porque un documento de entrega que contradice a la plataforma es peor
que no tenerlo.

| Dato | Origen |
|---|---|
| Nombre, dominio, colores, logo | `src/lib/config.ts` |
| Niveles, modalidades, precios | `src/lib/config.ts` |
| Licenciaturas, cursos de ingreso | `src/lib/config.ts` |
| Materias, semanas, preguntas, matrícula | consulta real a Supabase vía `.env.local` |
| Nombre del admin y contraseñas | `entrega.local.json` (ignorado por git) |

Si no hay `.env.local` o le faltan credenciales, el inventario se omite y el
resto del documento se genera igual.

## Se adapta a lo contratado

El documento **no es una plantilla fija**: cambia según lo que el cliente compró.

- **Una modalidad** → "plan único de N meses", y el registro no ofrece selector.
- **Varias modalidades** → una fila de precio y una de costo total por plan.
- **Inscripción por nivel** (`inscripcion: {secundaria, preparatoria}`) → una
  columna por nivel. También acepta el número plano de siempre.
- **Licenciaturas activas** → se añade una página con carreras y planes.
- **Cursos y Diplomados** → siempre presente; dice si va vacío o con contenido.

## La regla del dominio

El script **aborta** si `CONFIG.dominio` está vacío o apunta a `vercel.app`,
`netlify.app`, `localhost` y similares.

Un documento de entrega oficial con una URL provisional envejece mal: el cliente
lo guarda, lo reenvía a su equipo, y meses después el enlace ya no existe. Si el
dominio todavía no está listo, **el paso es conectar el dominio**, no generar el
documento con una dirección temporal.

## Qué NO va en el documento

Por política de entrega, nunca se incluye:

- Datos del repositorio, de Supabase o de Vercel
- Llaves de servicio, `service_role` o contraseñas de base de datos
- Recomendaciones de cambiar contraseñas

## Referencia visual

Toma el logo y la paleta de `CONFIG` del cliente, así que cada documento sale con
su propia marca. La superficie del papel es **siempre clara** aunque el sitio sea
dark mode: las bandas usan el color primario y los acentos el de acento, con el
contraste del texto calculado sobre cada fondo.
