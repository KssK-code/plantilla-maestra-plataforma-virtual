/**
 * Normaliza filas de `documentos_alumno` entre schema IVS (legacy) y el modelo del panel admin.
 */

export type DocEstadoAdmin = 'pendiente' | 'aprobado' | 'rechazado'

export type AdminDocumentoListItem = {
  id: string
  alumno_id: string
  tipo: string
  nombre_archivo: string
  estado: DocEstadoAdmin
  comentario_admin: string | null
  subido_en: string
  url: string | null
}

export function mapDocumentoAlumnoRow(row: Record<string, unknown>): AdminDocumentoListItem {
  const id = String(row.id ?? '')
  const alumno_id = String(row.alumno_id ?? '')
  const tipo = String(row.tipo ?? row.tipo_documento ?? 'curp')
  const nombre_archivo = String(row.nombre_archivo ?? 'archivo.pdf')
  const url =
    row.url != null && String(row.url).trim() !== ''
      ? String(row.url)
      : row.url_archivo != null && String(row.url_archivo).trim() !== ''
        ? String(row.url_archivo)
        : null

  let estado: DocEstadoAdmin = 'pendiente'
  if (typeof row.estado === 'string' && ['pendiente', 'aprobado', 'rechazado'].includes(row.estado)) {
    estado = row.estado as DocEstadoAdmin
  } else if (row.verificado === true) {
    estado = 'aprobado'
  }

  const comentario_admin =
    (row.comentario_admin as string | null | undefined) ??
    (row.notas as string | null | undefined) ??
    null

  const subido_en =
    row.subido_en != null
      ? String(row.subido_en)
      : row.fecha_subida != null
        ? String(row.fecha_subida)
        : new Date().toISOString()

  return { id, alumno_id, tipo, nombre_archivo, estado, comentario_admin, subido_en, url }
}

/** Ruta en bucket `documentos`: {alumnoId}/{tipo}.{ext} */
export function documentoStoragePath(alumnoId: string, tipo: string, nombreArchivo: string): string {
  const raw = nombreArchivo?.trim() || 'file.pdf'
  const ext = raw.includes('.') ? (raw.split('.').pop() ?? 'pdf').toLowerCase() : 'pdf'
  return `${alumnoId}/${tipo}.${ext}`
}

export function buildDocEstadoUpdates(estado: DocEstadoAdmin, comentario: string | null) {
  const ts = new Date().toISOString()
  return {
    nuevo: {
      estado,
      comentario_admin: comentario,
      revisado_en: ts,
    } as Record<string, unknown>,
    legacy: {
      verificado: estado === 'aprobado',
      notas: comentario,
      fecha_verificacion: ts,
    } as Record<string, unknown>,
  }
}
