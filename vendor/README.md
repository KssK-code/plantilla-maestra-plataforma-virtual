# `vendor/` — dependencias versionadas en el repo

Aquí vive lo que **no** se instala desde npm. Hoy hay una sola cosa.

---

## `xlsx-0.20.3.tgz` — SheetJS, distribución oficial

| | |
|---|---|
| Archivo | `vendor/xlsx-0.20.3.tgz` |
| Versión | **0.20.3** |
| Tamaño | 2 409 319 bytes (2.41 MB) |
| **SHA-256** | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |
| Origen | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| Licencia | Apache-2.0 |
| Dependencias | **ninguna** |
| Declarado en | `package.json` → `"xlsx": "file:vendor/xlsx-0.20.3.tgz"` |
| Vigilado por | `tests/unit/reportes-b6.spec.ts` |

### Por qué no viene de npm

En npm, `xlsx` está **congelada en 0.18.5** con dos avisos de severidad alta:

| CVE | Qué es |
|---|---|
| `CVE-2023-30533` | Prototype pollution al **leer** un libro manipulado |
| `CVE-2024-22363` | ReDoS al **parsear** |

SheetJS dejó de publicar en npm a partir de 0.19 y distribuye desde su propio
CDN. La línea 0.20.x corrige ambos.

> **La decisión es de CADENA DE SUMINISTRO, no de explotabilidad.**
> En esta plantilla `xlsx` se usa **solo para escribir**: la única ruta que lo
> importa es `src/app/api/admin/reportes/excel/route.ts`, y su superficie
> completa es `book_new`, `json_to_sheet`, `aoa_to_sheet`, `book_append_sheet` y
> `write`. **No hay un solo `XLSX.read` en todo `src/`**, y ningún dato del
> endpoint viene de un archivo que suba nadie. Los dos CVEs son de la ruta de
> lectura, así que la exposición práctica era ~nula.
>
> Aun así no se deja 0.18.5, porque una plantilla que se despliega a 144
> clientes no debería llevar una dependencia archivada con avisos abiertos
> "porque en nuestro caso no aplica". Si alguien reabre esto, que discuta **ese**
> argumento, no el de los CVEs.

### Por qué versionado y no apuntando al CDN

`"xlsx": "https://cdn.sheetjs.com/..."` también funciona y `pnpm` guarda el hash
de integridad en el lockfile. Pero ata cada `pnpm install` —y por lo tanto cada
deploy de cada cliente— a que `cdn.sheetjs.com` esté arriba. Con el tarball en el
repo, la instalación es hermética. Cuesta 2.41 MB.

### Por qué no `exceljs`

Se evaluó y compila igual, pero pesa **21.8 MB** contra 8.1 MB desempaquetados, no
publica desde diciembre de 2024, obliga a reescribir la ruta, y arrastra **9
dependencias** — entre ellas `jszip`, `unzipper` y `saxes`. O sea: cambiar una
librería de solo escritura por una que trae dos descompresores de ZIP y un parser
de XML, que es justo la clase de código del que se está saliendo.

---

## Cómo actualizar a una versión nueva

**Los tres pasos van en el MISMO commit.** Si se separan, la guarda truena o —peor—
pasa validando un archivo que ya no es el que dice.

**1. Bajar el tarball.** El CDN responde **403 sin `User-Agent`**:

```bash
curl -fL -A "Mozilla/5.0" \
  -o vendor/xlsx-0.20.4.tgz \
  https://cdn.sheetjs.com/xlsx-0.20.4/xlsx-0.20.4.tgz
```

**2. Calcular y anotar el SHA-256:**

```bash
sha256sum vendor/xlsx-0.20.4.tgz
```

**3. Actualizar los tres lugares a la vez:**

| Lugar | Qué cambia |
|---|---|
| `package.json` | la ruta `file:vendor/xlsx-<nueva>.tgz` |
| `tests/unit/reportes-b6.spec.ts` | `TARBALL` y `SHA256` |
| este README | la tabla de arriba |

Y borrar el `.tgz` viejo. Después:

```bash
pnpm install --no-frozen-lockfile
pnpm test:unit     # la guarda comprueba archivo + checksum + cadena
pnpm build
```

Si el checksum no coincide, **detenerse**. Un blob binario en el repo sin
checksum verificado solo cambia un riesgo de cadena de suministro por otro.
