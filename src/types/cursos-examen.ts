// Tipos del Examen Final de Curso (vertical "Cursos de Ingreso").
//
// La distinción entre PreguntaExamen y PreguntaSanitizada es de SEGURIDAD, no
// de estilo: lo que viaja al navegador del alumno antes de enviar el examen es
// SIEMPRE PreguntaSanitizada. La respuesta correcta y la explicación solo
// aparecen en la revisión de un envío ya calificado en el servidor.

/** Fila completa de curso_examen_preguntas. Solo admin y servidor. */
export interface PreguntaExamen {
  id: string
  curso_id: string
  orden: number
  tema: string | null
  enunciado: string
  opcion_a: string
  opcion_b: string
  opcion_c: string
  opcion_d: string
  respuesta_correcta: 'a' | 'b' | 'c' | 'd'
  explicacion: string | null
}

/** Lo único que puede ver el alumno mientras contesta. Sin clave ni explicación. */
export type PreguntaSanitizada = Pick<
  PreguntaExamen,
  'id' | 'orden' | 'tema' | 'enunciado' | 'opcion_a' | 'opcion_b' | 'opcion_c' | 'opcion_d'
>

export type Letra = 'a' | 'b' | 'c' | 'd'

/** Lo que manda el alumno al enviar. Puede venir incompleto: lo no contestado cuenta mal. */
export interface RespuestaEnviada {
  pregunta_id: string
  respuesta: Letra | null
}

/** Una fila del arreglo que se guarda en curso_examen_resultados.respuestas. */
export interface RespuestaGuardada {
  pregunta_id: string
  respuesta: Letra | null
  es_correcta: boolean
}

export interface DesgloseTema {
  tema: string
  aciertos: number
  total: number
}

/** Revisión que se devuelve DESPUÉS de calificar: aquí sí van clave y explicación. */
export interface RevisionPregunta {
  pregunta_id: string
  orden: number
  tema: string | null
  enunciado: string
  opciones: { a: string; b: string; c: string; d: string }
  tu_respuesta: Letra | null
  respuesta_correcta: Letra
  es_correcta: boolean
  explicacion: string | null
}

export interface ResultadoExamen {
  id: string
  aciertos: number
  total: number
  porcentaje: number
  desglose_temas: DesgloseTema[]
  created_at: string
}

export interface ResultadoConRevision extends ResultadoExamen {
  revision: RevisionPregunta[]
}

/** Entrada del historial del alumno. */
export interface ResultadoHistorial {
  id: string
  aciertos: number
  total: number
  porcentaje: number
  created_at: string
}
