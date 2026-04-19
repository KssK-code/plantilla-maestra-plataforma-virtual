export type UserRole = 'ADMIN' | 'ALUMNO'

export interface ConfigEscuela {
  nombre: string
  slug: string
  logoUrl: string | null
  colorPrimario: string
  colorSecundario: string
  contactoEmail: string
  contactoTelefono: string | null
  whatsappDisplay?: string
}

export interface Usuario {
  id: string
  email: string
  nombre_completo: string
  rol: UserRole
  activo: boolean
  created_at: string
}

export interface Alumno {
  id: string
  usuario_id: string
  matricula: string
  plan_estudio_id: string
  meses_desbloqueados: number
  calificacion_promedio: number | null
  created_at: string
}

export interface PlanEstudio {
  id: string
  nombre: string
  duracion_meses: number
  precio_mensual: number
  activo: boolean
}

export interface Materia {
  id: string
  mes_contenido_id: string
  codigo: string
  nombre: string
  color_hex: string
  descripcion: string
  objetivo: string
  temario: string[]
  bibliografia: Record<string, string>[]
}

export interface Semana {
  id: string
  materia_id: string
  numero: number
  titulo: string
  contenido: string
  videos: { titulo: string; url: string; duracion: string }[]
}

export interface Evaluacion {
  id: string
  materia_id: string
  titulo: string
  tipo: 'FINAL'
  porcentaje: number
  intentos_max: number
  activa: boolean
}

export interface Pregunta {
  id: string
  evaluacion_id: string
  numero: number
  texto: string
  tipo: 'OPCION_MULTIPLE' | 'VERDADERO_FALSO'
  opciones: string[]
  respuesta_correcta: number
  retroalimentacion: string
  puntos: number
}

export interface IntentoEvaluacion {
  id: string
  alumno_id: string
  evaluacion_id: string
  respuestas: Record<string, number>
  calificacion: number
  aprobado: boolean
  tiempo_segundos: number
  intento_numero: number
  created_at: string
}

export interface Calificacion {
  id: string
  alumno_id: string
  materia_id: string
  calificacion_final: number
  aprobada: boolean
}

export interface Pago {
  id: string
  alumno_id: string
  monto: number
  mes_desbloqueado: number
  metodo_pago: string
  referencia: string | null
  registrado_por: string
  created_at: string
}
