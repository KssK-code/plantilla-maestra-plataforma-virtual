/** Tipos del visor del alumno (respuestas de las API /api/alumno/cursos). */
import type { CursoTipo } from './cursos'

export interface CursoCatalogoItem {
  id: string
  nombre: string
  descripcion: string | null
  tipo: CursoTipo
  portadaUrl: string | null
  totalLecciones: number
  completadas: number
  porcentaje: number
}

export interface LeccionAlumno {
  id: string
  titulo: string
  video_url: string | null
  contenido_texto: string | null
  materialUrl: string | null
  tieneMaterial: boolean
  orden: number
  completada: boolean
}

export interface ModuloAlumno {
  id: string
  nombre: string
  orden: number
  lecciones: LeccionAlumno[]
}

/**
 * Resumen de la ventana de pago.
 *
 * ⚠️ SOLO NÚMEROS, a propósito. Sirve para que la UI diga "quedan 4 módulos,
 * disponibles al abrir el mes 2" sin filtrar NADA del contenido bloqueado: ni
 * nombres de módulo, ni títulos de lección, ni URLs. Una respuesta de "sin
 * acceso" que igual manda los títulos no es una respuesta de sin acceso.
 */
export interface VentanaCurso {
  meses_desbloqueados: number
  modulos_por_mes: number
  /** Techo: cuántos módulos, desde `orden` 0, están liberados. */
  limite: number
  modulos_totales: number
  modulos_bloqueados: number
  /** Mes (1-based) que hay que abrir para liberar el siguiente. null si no queda ninguno. */
  proximo_mes: number | null
  estado_inscripcion: string | null
}

export interface CursoDetalleAlumno {
  curso: {
    id: string
    nombre: string
    descripcion: string | null
    tipo: CursoTipo
    estado: string
    portadaUrl: string | null
  }
  modoPreview: boolean
  modulos: ModuloAlumno[]
  totalLecciones: number
  completadas: number
  porcentaje: number
  completado: boolean
  primeraLeccionPendienteId: string | null
  ventana: VentanaCurso | null
}
