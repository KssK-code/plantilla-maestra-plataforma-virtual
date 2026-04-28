export const CONFIG = {
  // === IDENTIDAD DEL CLIENTE ===
  nombre:          'MEV',                    // nombre corto: 'IVS', 'CJVB', 'ADE'
  nombreCompleto:  'Mi Escuela Virtual',     // nombre completo legal
  prefijoMatricula:'MEV',                    // prefijo de matrícula: 'IVS-0001', 'CJVB-0001'
  tagline:         'Tu certificación con apoyo desde casa',  // subtítulo hero

  // === ASSETS ===
  // REEMPLAZAR /public/logo.png con el logo del cliente. Ver public/README.md
  logo:            '/logo.png',              // logo principal (público)
  logoOscuro:      '/logo.png',              // logo para fondo oscuro

  // === CONTACTO ===
  whatsapp:        '5212345678901',
  whatsappUrl:     'https://wa.me/5212345678901',
  whatsappDisplay: '521 234-567-8901',         // formato legible para UI
  email:           'contacto@mev.com',
  contactoEmail:   'contacto@mev.com',         // alias para footer y perfil
  contactoTelefono:'5212345678901',            // número completo para wa.me

  // === DOMINIO ===
  dominio:         'mev-edu.online',
  urlBase:         'https://mev-edu.online',

  // === BRANDING (cliente personaliza con sus colores) ===
  colores: {
    primario:    '#0F172A',  // slate-900 — neutro, cliente cambia
    secundario:  '#1E293B',  // slate-800
    acento:      '#3B82F6',  // blue-500 — neutro, cliente cambia
    acentoClaro: '#DBEAFE',  // blue-100
    texto:       '#0F172A',
    fondo:       '#F8FAFC',  // slate-50
  },

  // === NIVELES ACADÉMICOS ===
  niveles: ['secundaria', 'preparatoria'] as const,

  // === MODALIDADES (cliente activa/desactiva) ===
  // Si solo 3 meses: poner activa:false en 6meses
  // Si solo 6 meses: poner activa:false en 3meses
  // Si ambas: ambas activa:true
  modalidades: [
    { id: '3_meses', label: '3 meses — Express',  meses: 3, mensualidad: 2000, materiasPorMes: 4, activa: true  },
    { id: '6_meses', label: '6 meses — Estándar', meses: 6, mensualidad: 1000, materiasPorMes: 2, activa: true  },
  ] as const,

  // === PRECIOS ===
  precios: {
    inscripcion:                       599,
    plan6mMensualidad:                 1000, // @deprecated — usar modalidad.mensualidad via getModalidadesActivas()
    plan3mMensualidad:                 2000, // @deprecated — usar modalidad.mensualidad via getModalidadesActivas()
    certificacionSecundaria:           4900,
    certificacionPreparatoria:         5900,
    preparatoria_6meses_normal:        1000,
    preparatoria_6meses_sindicalizado: 1000,
    preparatoria_3meses_normal:        2000,
    preparatoria_3meses_sindicalizado: 2000,
    secundaria_6meses_normal:          1000,
    secundaria_6meses_sindicalizado:   1000,
    secundaria_3meses_normal:          2000,
    secundaria_3meses_sindicalizado:   2000,
    certificacion_preparatoria:        5900,
    certificacion_secundaria:          4900,
  },

  // === DOCUMENTOS REQUERIDOS POR NIVEL ===
  documentosRequeridos: {
    secundaria:   ['Certificado de Primaria', 'CURP', 'Acta de Nacimiento', 'Identificación Oficial', 'Foto de Perfil (fondo blanco)'],
    preparatoria: ['Certificado de Secundaria', 'CURP', 'Acta de Nacimiento', 'Identificación Oficial', 'Foto de Perfil (fondo blanco)'],
  },

  // === LANDING ===
  landing: {
    hero_titulo:                'Obtén tu certificación con apoyo',
    hero_highlight:             'desde casa',
    hero_subtitulo:             'Estudia Secundaria o Preparatoria en línea con acompañamiento certificado. Avanza a tu ritmo.',
    hero_badges:                ['Acompañamiento Certificado', 'Sin salir de casa', '100% en línea'],
    convenios:                  [],
    respaldo_titulo:            'Respaldados por instituciones educativas de confianza',
    respaldo_badges:            [],
    testimonios: [] as Array<{ name: string; age: string; nivel: string; initials: string; quote: string }>,
    certificacion_secundaria:   4900,
    certificacion_preparatoria: 5900,
    cct:                        '',
  },

  cct: '',

  redes: {
    facebook:  '',
    instagram: '',
  },
} as const

// === COMPATIBILIDAD ===
export const ESCUELA_CONFIG = CONFIG
export const config = CONFIG
export default CONFIG

export type Nivel = typeof CONFIG.niveles[number]
export type Modalidad = typeof CONFIG.modalidades[number]
