/**
 * Reglas de archivos del módulo Cursos — compartidas entre cliente (validación
 * previa a subir) y servidor (validación autoritativa en las API routes).
 * Bucket privado 'cursos' (límite duro del bucket: 10MB).
 */
import { extensionDe, sanitizeFilename, type ValidacionArchivo } from '@/lib/archivos-comunes'

// Las reglas de material (PDF) y los helpers de nombre de archivo se fueron a
// lib/archivos-comunes.ts al aparecer el segundo consumidor (los materiales de
// semana de Contenido). Se reexportan para que ningún consumidor de Cursos
// tenga que cambiar sus imports.
export {
  MATERIAL_MAX_BYTES, MATERIAL_MIMES, MATERIAL_EXTS,
  sanitizeFilename, extensionDe, validarMaterial,
} from '@/lib/archivos-comunes'
export type { ValidacionArchivo } from '@/lib/archivos-comunes'

export const BUCKET_CURSOS = 'cursos'

export const PORTADA_MAX_BYTES = 5 * 1024 * 1024 // 5MB
export const PORTADA_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PORTADA_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const

export function validarPortada(file: { name: string; size: number; type: string }): ValidacionArchivo {
  if (!PORTADA_MIMES.includes(file.type as (typeof PORTADA_MIMES)[number]) ||
      !PORTADA_EXTS.includes(extensionDe(file.name) as (typeof PORTADA_EXTS)[number])) {
    return { ok: false, error: 'La portada debe ser una imagen JPG, PNG o WebP.' }
  }
  if (file.size > PORTADA_MAX_BYTES) {
    return { ok: false, error: 'La portada no puede pesar más de 5MB.' }
  }
  return { ok: true }
}

/** Ruta de portada dentro del bucket: portadas/{cursoId}/{filename} */
export function portadaPath(cursoId: string, filename: string): string {
  return `portadas/${cursoId}/${sanitizeFilename(filename)}`
}

/** Ruta de material dentro del bucket: {cursoId}/{leccionId}/{filename} */
export function materialPath(cursoId: string, leccionId: string, filename: string): string {
  return `${cursoId}/${leccionId}/${sanitizeFilename(filename)}`
}
