export const CONFIG = {
  // === MODO DE PRODUCTO (línea Solo-Cursos, B7) ===
  // 'tradicional' → secundaria/preparatoria con materias, meses y evaluaciones.
  //                 Cursos y Diplomados sigue disponible como COMPLEMENTO,
  //                 exactamente igual que hoy.
  // 'solo_cursos' → el instituto solo vende diplomados: la superficie principal
  //                 son los cursos y desaparece el programa académico.
  //
  // ⚠️ DEFAULT 'tradicional' A PROPÓSITO: 144 clientes comparten esta plantilla
  // y con este valor la app es IDÉNTICA a la de antes de B7.
  //
  // ⚠️ EL `as ModoPlataforma` NO SOBRA. El objeto entero lleva `as const` (línea
  // final), que estrecharía el tipo de esta clave al literal 'tradicional'. Con
  // ese tipo, `CONFIG.modo === 'solo_cursos'` no compila: TypeScript lo marca
  // como comparación imposible (TS2367) porque los dos literales no se solapan.
  // Es el mismo escape que ya usa `landing.testimonios` con `as Array<…>`.
  modo:            'tradicional' as ModoPlataforma,

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
  // Bug 31 fix (5-may-2026): estos colores se inyectan en globals.css via
  // CSS variables (--color-primario, --color-acento, etc.) desde layout.tsx.
  // Las páginas auth + dashboard alumno + admin leen var(--color-*) en lugar
  // de hex hardcoded para que el cliente solo configure aquí y la plataforma
  // tome su paleta automáticamente.
  colores: {
    primario:          '#0F172A',  // slate-900 — sidebar, headings, fondos oscuros
    secundario:        '#1E293B',  // slate-800
    acento:            '#3B82F6',  // blue-500 — botones primarios, links, highlights
    acentoClaro:       '#DBEAFE',  // blue-100
    acentoHover:       '#2563EB',  // blue-600 — hover de botones primarios
    textoSobreAcento:  '#FFFFFF',  // texto contrastante sobre el acento. Override a '#0A0A0A' si acento es claro (ej: amarillo)
    texto:             '#0F172A',  // texto sobre fondos claros
    textoSecundario:   '#525252',  // labels, placeholders, captions
    fondo:             '#F8FAFC',  // slate-50 — fondo de página
    superficie:        '#FFFFFF',  // cards, modales, inputs
    borde:             '#E5E7EB',  // gray-200 — bordes sutiles
    // Color de la barra del navegador en móvil (<meta name="theme-color">).
    // Debe coincidir con el fondo REAL que ve el alumno; si no, la barra queda
    // de un color que no aparece en ninguna pantalla. Por defecto sigue a
    // `fondo` (tema claro). Cliente con landing/app oscura: poner aquí su
    // fondo oscuro (ej. '#0B0D11').
    themeColor:        '#F8FAFC',
  },

  // === NIVELES ACADÉMICOS ===
  niveles: ['secundaria', 'preparatoria', 'licenciatura'] as const,

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
    // Ciudad que se muestra en el badge del hero. VACÍO = se omite el segmento
    // por completo (correcto para un instituto 100% en línea sin domicilio).
    // Antes esto era el literal '[Ciudad, México]' escrito en el JSX y llegaba
    // así, entre corchetes, a producción: no rompía el build ni el smoke test
    // por HTTP, solo se veía abriendo la página.
    ciudad:                     '',
    convenios:                  [],
    respaldo_titulo:            'Respaldados por instituciones educativas de confianza',
    respaldo_badges:            [],
    testimonios: [] as Array<{ name: string; age: string; nivel: string; initials: string; quote: string }>,
    certificacion_secundaria:   4900,
    certificacion_preparatoria: 5900,
    cct:                        '',

    // === CATÁLOGO DE DIPLOMADOS (línea Solo-Cursos, B5) ===
    // ⚠️ DEFAULT false A PROPÓSITO. Esta plantilla sirve a 144 clientes de
    // secundaria/preparatoria cuya landing no debe cambiar ni un pixel. B7 lo
    // enciende solo para los clientes Solo-Cursos.
    mostrarCatalogoCursos:      false,
    catalogoTitulo:             'Nuestros diplomados',
    // Texto NEUTRO: igual que en el diploma (B4), el default NO dice "validez
    // oficial", "SEP" ni "RVOE". Eso solo lo agrega quien acredite su registro.
    catalogoSubtitulo:          'Programas especializados, con acompañamiento y material descargable.',
  },

  cct: '',

  // === DIPLOMAS DE LA LINEA SOLO-CURSOS (B4) ===
  // El folio de la constancia es CONSECUTIVO y sale de una secuencia de Postgres
  // (curso_folio_seq). El prefijo es de NIVEL CLIENTE, no por curso: la secuencia
  // es global, asi que prefijos distintos por curso darian numeraciones salteadas
  // dentro de cada prefijo — y un libro de folios con huecos no sirve para
  // verificar nada. B7 lo fija al provisionar.
  diploma: {
    /** Prefijo del folio. Resultado: `${folioPrefijo}-00001`, `-00002`, ... */
    folioPrefijo: 'CONST',
    /**
     * Etiqueta del documento. NEUTRA a proposito: 'Constancia' / 'Diploma' /
     * 'Certificado'. NO poner aqui "con validez oficial", "SEP" ni "RVOE" —
     * eso solo lo agrega un cliente que acredite su propio registro, y ponerlo
     * por default seria afirmar algo legalmente falso en nombre de todos.
     */
    etiqueta: 'Constancia',
    /** Ruta de la firma escaneada (PNG con alfa). Vacio = sin firma. */
    firma: '',
    /** Cargo bajo la firma. */
    firmaCargo: 'Dirección Académica',
  },

  redes: {
    facebook:  '',
    instagram: '',
  },

  // === ADD-ON CURSOS DE INGRESO (opcional) =================================
  // Cursos de preparación a examen de admisión, vendidos como producto de PAGO
  // ÚNICO aparte del plan de Sec/Prepa/Lic. No es el modo 'solo_cursos': aquí
  // la plataforma sigue siendo la de siempre y el curso es un extra que el
  // alumno puede llevar solo o encima de su plan.
  //
  // Con `activa: false` el bloque del registro y la columna de /admin/alumnos
  // no se dibujan. Para encenderlo en un cliente: poner `activa: true` y una
  // entrada por curso vendido.
  //
  //   cursoIds → UUID del curso en la tabla `cursos`. Los seeds del banco usan
  //              UUID v5 deterministas, así que el mismo curso tiene el mismo
  //              UUID en todos los clientes. Van en arreglo porque una oferta
  //              puede ser un paquete de varios cursos.
  //   precio   → pago único en MXN. El módulo no tiene checkout: el alumno paga
  //              por fuera y el admin le activa el curso desde /admin/alumnos.
  //
  // Para vender varios cursos como PAQUETE ÚNICO en vez de sueltos, usar
  // `precioPaquete: <monto>` en lugar de `precio` por curso: src/lib/cursos/
  // oferta.ts los colapsa en una sola oferta que inscribe a todos.
  // === ADD-ON LICENCIATURAS =================================================
  // Tercer programa, junto a Secundaria y Preparatoria.
  //
  // ⚠️ DEFAULT `activas: false` A PROPÓSITO, igual que `cursosIngreso` y
  // `landing.mostrarCatalogoCursos`: los clientes que solo venden Sec/Prepa
  // comparten esta plantilla y con este valor la app es IDÉNTICA a antes del
  // add-on — no se dibuja la opción en el registro, ni la tarjeta del panel,
  // ni la sección de la landing, y ninguna consulta extra se ejecuta.
  //
  // Para encenderlo en un cliente: `activas: true` + una entrada por carrera
  // vendida + los planes de duración. Requiere además la migración
  // `20260812120000_licenciaturas.sql` (columnas `carrera` / `modalidad`).
  //
  // ⚠️ `modalidades` es una tabla APARTE de `CONFIG.modalidades`. Los planes de
  // licenciatura no son los del programa: pueden durar 9 o 12 meses, que no
  // existen en Sec/Prepa. `src/lib/modalidades.ts` resuelve las dos.
  //
  // ⚠️ `materiasPorMes` es lo ÚNICO que cambia entre planes de una misma
  // carrera. El catálogo de materias es el mismo y se filtra SOLO por carrera
  // (ver `cargarContextoAcceso` en src/lib/acceso-materias.ts): filtrar además
  // por modalidad deja sin materias a todo alumno cuyo plan no sea aquel con
  // el que se sembró el catálogo.
  licenciaturas: {
    activas: false,
    /** Pago único al inscribirse. */
    inscripcion: 0,
    /** Título y cédula profesional, con gestión administrativa. */
    certificacion: 0,
    carreras: [] as ReadonlyArray<{
      /** Slug estable. Es el valor que se guarda en `alumnos.carrera`. */
      slug: string
      nombre: string
      cuatrimestres: number
      totalMaterias: number
      /** Nombre de un icono de lucide-react (ej. 'Scale', 'Briefcase'). */
      icono: string
      desc: string
      incluye: readonly string[]
    }>,
    modalidades: [] as ReadonlyArray<{
      id: string
      label: string
      /** Etiqueta corta para las tarjetas de precio (ej. '9 meses'). */
      sublabel: string
      meses: number
      mensualidad: number
      activa: boolean
      /** Ritmo de desbloqueo: materias nuevas por mes. */
      materiasPorMes: number
    }>,
  },

  cursosIngreso: {
    activa: false,
    pagoUnico: true,
    cursos: [] as ReadonlyArray<{
      /** Id estable de la oferta. Se guarda en alumnos.curso_solicitado. */
      id: string
      nombre: string
      /** Examen al que prepara, para el subtítulo del registro. */
      examen?: string
      precio: number
      cursoIds: readonly string[]
    }>,
  },
} as const

// === COMPATIBILIDAD ===
export const ESCUELA_CONFIG = CONFIG
export const config = CONFIG
export default CONFIG

export type Nivel = typeof CONFIG.niveles[number]
export type Modalidad = typeof CONFIG.modalidades[number]

/**
 * Modo de producto del cliente (B7).
 *
 * Se declara aquí abajo y se usa arriba en `CONFIG.modo`: los tipos de
 * TypeScript se elevan, así que el orden del archivo no importa.
 *
 * Los helpers para preguntar por el modo NO viven aquí — están en
 * `src/lib/modo.ts`, junto con lo que cada modo oculta.
 */
export type ModoPlataforma = 'tradicional' | 'solo_cursos'
