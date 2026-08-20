/**
 * Envoltorio de upload-comun.ts atado al bucket 'cursos'.
 */
import { subirArchivo, type ResultadoSubida } from '@/lib/upload-comun'
import { BUCKET_CURSOS } from './archivos'

export type { ResultadoSubida }

export function subirArchivoCursos(endpoint: string, file: File): Promise<ResultadoSubida> {
  return subirArchivo(endpoint, BUCKET_CURSOS, file)
}
