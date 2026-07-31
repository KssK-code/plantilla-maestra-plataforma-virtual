/**
 * Serialización CSV para los reportes de administración.
 *
 * ⚠️ POR QUÉ CSV Y NO .xlsx. El módulo de Reportes de esta plantilla NUNCA ha
 * tenido exportación a Excel — no existe la dependencia `xlsx`, ni un botón de
 * descarga, ni hojas. (Ver el reporte de B6.) Generar .xlsx de verdad obliga a
 * meter una dependencia nueva en una plantilla que comparten 144 clientes, y la
 * candidata obvia, `xlsx` de SheetJS, está en npm congelada en 0.18.5 con CVEs
 * conocidos (prototype pollution y ReDoS); las versiones corregidas se
 * distribuyen fuera de npm. Esa es una decisión de cadena de suministro que le
 * toca tomar a Kevin, no algo que deba entrar de contrabando en un commit de
 * reportes. CSV cubre el caso real —contabilidad abre estos archivos en Excel
 * igual— con cero dependencias nuevas.
 *
 * ⚠️ INYECCIÓN DE FÓRMULAS. Excel y Google Sheets interpretan como FÓRMULA toda
 * celda que empiece con `=`, `+`, `-`, `@`, tab o retorno de carro. Varias
 * columnas de estos reportes son texto que escribió una persona (nombre del
 * alumno, referencia del pago, nombre del diplomado): un alumno registrado como
 * `=HYPERLINK(...)` se ejecutaría al abrir el archivo en la máquina de
 * administración. Por eso `celda()` neutraliza ese primer carácter. No es
 * teórico: es el vector estándar contra los exportadores de CSV.
 */

/** Caracteres que convierten una celda en fórmula al abrirla en Excel/Sheets. */
const PELIGROSOS = ['=', '+', '-', '@', '\t', '\r']

export function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return ''

  let s = String(valor)

  // Neutraliza la fórmula anteponiendo una comilla simple: Excel la trata como
  // marca de "esto es texto" y no la muestra en la celda. Se hace ANTES de
  // escapar comillas para que la comilla añadida también quede escapada.
  if (s.length > 0 && PELIGROSOS.includes(s[0])) s = `'${s}`

  // Comillas dobles se duplican; se encierra siempre para no depender de si el
  // valor trae comas, saltos de línea o punto y coma.
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * Arma un CSV a partir de encabezados y filas.
 *
 * BOM UTF-8 al inicio: sin él, Excel en Windows abre el archivo en la
 * codificación local y los acentos salen rotos ("Dactiloscopía" → "DactiloscopÃ­a").
 * CRLF como fin de línea por la misma razón de compatibilidad.
 */
export function armarCSV(encabezados: string[], filas: unknown[][]): string {
  const lineas = [
    encabezados.map(celda).join(','),
    ...filas.map(f => f.map(celda).join(',')),
  ]
  return `﻿${lineas.join('\r\n')}\r\n`
}

/**
 * Nombre de archivo seguro para la cabecera Content-Disposition.
 * Se limita a caracteres inertes: un nombre con comillas o saltos de línea
 * permitiría inyectar cabeceras.
 */
export function nombreArchivoSeguro(base: string, fecha: string): string {
  const limpio = base.replace(/[^a-zA-Z0-9_-]/g, '')
  return `${limpio}-${fecha.replace(/[^0-9-]/g, '')}.csv`
}
