export const CONFIG = {
  nombre: 'CJVB',
  nombreCompleto: 'CJVB Académico',
  logo: '/logo-cjvb.png',
  logoOscuro: '/logo-cliente-dark.png',

  whatsapp: '2212312340',
  whatsappUrl: 'https://wa.me/522212312340',
  email: 'cjbvacademico@outlook.com',

  dominio: 'cjvbacademico.online',
  urlBase: 'https://cjvbacademico.online',

  colores: {
    primario: '#1565C0',
    secundario: '#0D47A1',
    acento: '#1E88E5',
    acentoClaro: '#BBDEFB',
    texto: '#1A1A2E',
    fondo: '#F8F9FF',
  },

  niveles: ['secundaria', 'preparatoria'] as const,

  precios: {
    inscripcion: 599,
    plan6mMensualidad: 1000,
    plan3mMensualidad: 2000,
    certificacionSecundaria: 4900,
    certificacionPreparatoria: 5900,
    preparatoria_6meses_normal: 1000,
    preparatoria_6meses_sindicalizado: 1000,
    preparatoria_3meses_normal: 2000,
    preparatoria_3meses_sindicalizado: 2000,
    secundaria_6meses_normal: 1000,
    secundaria_6meses_sindicalizado: 1000,
    secundaria_3meses_normal: 2000,
    secundaria_3meses_sindicalizado: 2000,
    certificacion_preparatoria: 5900,
    certificacion_secundaria: 4900,
  },

  documentosRequeridos: {
    secundaria: [
      'Certificado de Primaria',
      'CURP',
      'Acta de Nacimiento',
      'Identificación Oficial',
      'Foto de Perfil (fondo blanco)',
    ],
    preparatoria: [
      'Certificado de Secundaria',
      'CURP',
      'Acta de Nacimiento',
      'Identificación Oficial',
      'Foto de Perfil (fondo blanco)',
    ],
  },

  landing: {
    hero_titulo: 'Obtén tu certificado oficial',
    hero_highlight: 'desde casa',
    hero_subtitulo: 'Estudia Secundaria o Preparatoria en línea con validez oficial SEP. Avanza a tu ritmo desde Puebla.',
    hero_badges: ['SEP Oficial', 'Sin salir de casa', 'Puebla, México'],
    años_experiencia: 5,
    convenios: [],
    respaldo_titulo: 'Respaldados por instituciones educativas de confianza',
    respaldo_badges: [],
    certificacion_secundaria: 4900,
    certificacion_preparatoria: 5900,
    cct: '',
  },

  cct: '',

  redes: {
    facebook: '',
    instagram: '',
  },
} as const

export const ESCUELA_CONFIG = CONFIG
export const config = CONFIG
export default CONFIG

export type Nivel = typeof CONFIG.niveles[number]
