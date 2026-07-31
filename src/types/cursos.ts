/** Tipos del módulo Cursos y Diplomados (tablas nuevas de la migración F1). */

export type CursoTipo = 'curso' | 'diplomado'
export type CursoEstado = 'borrador' | 'publicado'

export interface Curso {
  id: string
  nombre: string
  descripcion: string | null
  tipo: CursoTipo
  portada_path: string | null
  estado: CursoEstado
  orden: number
  created_at: string
  updated_at: string
  // ── Parámetros comerciales y de ritmo (columnas de B1, editables desde B7) ──
  /** Cuota única de inscripción al diplomado. 0 = sin inscripción. */
  precio_inscripcion: number
  /** Mensualidad del diplomado. La usa B3 como monto por defecto al cobrar. */
  precio_mensualidad: number
  /** Horas que declara el diplomado; sale en la constancia y en el catálogo. */
  horas: number | null
  /** Tope de meses que se pueden abrir. NULL = sin tope fijo (lo deduce B3). */
  duracion_meses: number | null
  /** Módulos que libera cada mes pagado. Es el ritmo del gate de B2. */
  modulos_por_mes: number
  /** Intentos del examen final del curso. */
  intentos_permitidos: number
}

export interface CursoListItem extends Curso {
  portadaUrl: string | null
  numModulos: number
  numLecciones: number
  numAlumnos: number
}

export interface CursoLeccion {
  id: string
  modulo_id: string
  titulo: string
  video_url: string | null
  contenido_texto: string | null
  material_path: string | null
  materialUrl: string | null
  orden: number
}

export interface CursoModulo {
  id: string
  curso_id: string
  nombre: string
  orden: number
  lecciones: CursoLeccion[]
}

export interface CursoInscrito {
  /** Id de la fila de curso_inscripciones: es lo que consumen las acciones de B3. */
  inscripcion_id: string
  alumno_id: string
  created_at: string
  nombre: string
  email: string
  matricula: string | null
  activo: boolean
  // ── Ventana de pago (B1/B3) ──
  meses_desbloqueados: number
  estado: string
  fecha_inscripcion: string | null
  fecha_vencimiento: string | null
}

export interface CursoDetalle {
  curso: Curso & { portadaUrl: string | null }
  modulos: CursoModulo[]
  inscritos: CursoInscrito[]
}

/** Fila del endpoint existente GET /api/admin/alumnos que consume la pestaña Alumnos. */
export interface AlumnoAdminRow {
  id: string
  matricula: string
  nivel: string | null
  activo: boolean
  nombre_completo: string
  email: string
}
