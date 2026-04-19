export const CONFIG = {
  nombre: 'NOMBRE_CLIENTE',
  nombreCompleto: 'NOMBRE COMPLETO DEL CLIENTE',
  logo: '/logo-ceeva.png',
  logoOscuro: '/logo-cliente-dark.png',

  whatsapp: '0000000000',
  whatsappUrl: 'https://wa.me/520000000000',
  email: 'correo@cliente.com',

  dominio: 'cliente.online',
  urlBase: 'https://cliente.online',

  colores: {
    primario: '#1B2F6E',
    secundario: '#2E4BA3',
    acento: '#C9A84C',
    acentoClaro: '#E8C97A',
    texto: '#1A1A2E',
    fondo: '#F8F9FF',
  },

  niveles: ['secundaria', 'preparatoria'] as const,

  precios: {
    inscripcion: 399,
    preparatoria_6meses_normal: 1000,
    preparatoria_6meses_sindicalizado: 1000,
    preparatoria_3meses_normal: 2000,
    preparatoria_3meses_sindicalizado: 2000,
    secundaria_6meses_normal: 1000,
    secundaria_6meses_sindicalizado: 1000,
    secundaria_3meses_normal: 2000,
    secundaria_3meses_sindicalizado: 2000,
    certificacion_preparatoria: 4750,
    certificacion_secundaria: 4250,
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
    hero_titulo: 'Estudia desde casa, certifícate con la SEP',
    hero_highlight: 'certifícate',
    hero_subtitulo: 'Sin ir a la escuela. Sin perder tu trabajo. Con certificación oficial.',
    hero_badges: [
      '🏛️ Incorporado a la SEP',
      '💻 100% en línea',
      '📜 Certificación oficial',
    ],
    años_experiencia: '5',
    convenios: [],
    respaldo_titulo: 'Respaldados por instituciones educativas de confianza',
    respaldo_badges: [],
    certificacion_secundaria: 4250,
    certificacion_preparatoria: 4750,
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
