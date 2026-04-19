'use client'

import { useState } from 'react'

interface BadgesGridProps {
  logros: Array<{ tipo_logro: string; fecha_obtenido: string }>
  lang: string
}

/** Acento por tipo: borde claro, fondo del ícono y check (badges obtenidos). */
const ACCENT_BY_TIPO: Record<
  string,
  { border: string; iconBg: string; iconTint: string; check: string }
> = {
  primera_semana: {
    border: 'border-teal-200',
    iconBg: 'bg-teal-50',
    iconTint: 'text-teal-600',
    check: 'text-teal-600',
  },
  materia_completada: {
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-50',
    iconTint: 'text-indigo-600',
    check: 'text-indigo-600',
  },
  racha_3_dias: {
    border: 'border-orange-200',
    iconBg: 'bg-orange-50',
    iconTint: 'text-orange-600',
    check: 'text-orange-600',
  },
  racha_7_dias: {
    border: 'border-amber-200',
    iconBg: 'bg-amber-50',
    iconTint: 'text-amber-600',
    check: 'text-amber-600',
  },
  mes_completado: {
    border: 'border-amber-200',
    iconBg: 'bg-amber-50',
    iconTint: 'text-amber-600',
    check: 'text-amber-600',
  },
  primer_examen: {
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconTint: 'text-slate-600',
    check: 'text-slate-600',
  },
  examen_perfecto: {
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-50',
    iconTint: 'text-yellow-600',
    check: 'text-yellow-600',
  },
  mitad_carrera: {
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-50',
    iconTint: 'text-cyan-600',
    check: 'text-cyan-600',
  },
}

const BADGES = [
  {
    tipo: 'primera_semana',
    emoji: '🌱',
    nombre_es: 'Primer paso',
    nombre_en: 'First step',
    desc_es: 'Completaste tu primera semana',
    desc_en: 'You completed your first week',
  },
  {
    tipo: 'materia_completada',
    emoji: '📚',
    nombre_es: 'Materia dominada',
    nombre_en: 'Subject mastered',
    desc_es: 'Completaste todas las semanas de una materia',
    desc_en: 'You completed all weeks of a subject',
  },
  {
    tipo: 'racha_3_dias',
    emoji: '🔥',
    nombre_es: 'Racha de fuego',
    nombre_en: 'On fire',
    desc_es: '3 días seguidos estudiando',
    desc_en: '3 days in a row studying',
  },
  {
    tipo: 'racha_7_dias',
    emoji: '⚡',
    nombre_es: 'Imparable',
    nombre_en: 'Unstoppable',
    desc_es: '7 días seguidos estudiando',
    desc_en: '7 days in a row studying',
  },
  {
    tipo: 'mes_completado',
    emoji: '🏆',
    nombre_es: 'Mes completado',
    nombre_en: 'Month completed',
    desc_es: 'Completaste todas las materias de un mes',
    desc_en: 'You completed all subjects in a month',
  },
  {
    tipo: 'primer_examen',
    emoji: '✏️',
    nombre_es: 'Primer examen',
    nombre_en: 'First exam',
    desc_es: 'Presentaste tu primer examen',
    desc_en: 'You took your first exam',
  },
  {
    tipo: 'examen_perfecto',
    emoji: '⭐',
    nombre_es: 'Examen perfecto',
    nombre_en: 'Perfect score',
    desc_es: 'Obtuviste 100 en un examen',
    desc_en: 'You scored 100 on an exam',
  },
  {
    tipo: 'mitad_carrera',
    emoji: '🎯',
    nombre_es: 'Mitad del camino',
    nombre_en: 'Halfway there',
    desc_es: 'Completaste el 50% de tu plan',
    desc_en: 'You completed 50% of your plan',
  },
]

function formatFecha(iso: string, lang: string) {
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function BadgesGrid({ logros, lang }: BadgesGridProps) {
  const [hoveredTipo, setHoveredTipo] = useState<string | null>(null)

  const logroMap = new Map(logros.map(l => [l.tipo_logro, l.fecha_obtenido]))
  const obtenidos = logros.length

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {lang === 'en' ? 'My achievements' : 'Mis logros'}
        </h3>
        <span className="text-xs text-gray-600">
          {lang === 'en'
            ? `${obtenidos} of 8 earned`
            : `${obtenidos} de 8 obtenidos`}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BADGES.map(badge => {
          const obtenido = logroMap.has(badge.tipo)
          const fecha = logroMap.get(badge.tipo)
          const nombre = lang === 'en' ? badge.nombre_en : badge.nombre_es
          const desc = lang === 'en' ? badge.desc_en : badge.desc_es
          const isHovered = hoveredTipo === badge.tipo
          const accent = ACCENT_BY_TIPO[badge.tipo] ?? ACCENT_BY_TIPO.primera_semana

          return (
            <div
              key={badge.tipo}
              className={[
                'relative flex flex-col items-center text-center gap-2 rounded-xl p-4 transition-all duration-200 cursor-default select-none overflow-hidden',
                obtenido
                  ? `border bg-white shadow-md ${accent.border}`
                  : 'bg-gray-800 border border-gray-700',
              ].join(' ')}
              onMouseEnter={() => setHoveredTipo(badge.tipo)}
              onMouseLeave={() => setHoveredTipo(null)}
            >
              {/* Checkmark si obtenido */}
              {obtenido && (
                <span
                  className={`absolute top-2 right-2 text-xs font-bold leading-none ${accent.check}`}
                >
                  ✓
                </span>
              )}

              {/* Emoji en cápsula con color de acento (obtenido) o apagado */}
              <span
                className={[
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl leading-none',
                  obtenido ? `${accent.iconBg} ${accent.iconTint}` : 'text-gray-600 opacity-50',
                ].join(' ')}
                style={obtenido ? undefined : { filter: 'grayscale(1)' }}
              >
                {badge.emoji}
              </span>

              {/* Nombre */}
              <p
                className={[
                  'text-xs leading-tight',
                  obtenido ? 'font-bold text-gray-900' : 'font-medium text-gray-400',
                ].join(' ')}
              >
                {nombre}
              </p>

              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-lg pointer-events-none"
                >
                  <p
                    className={obtenido ? 'text-xs leading-snug text-gray-700' : 'text-xs leading-snug text-gray-600'}
                  >
                    {desc}
                  </p>
                  {obtenido && fecha && (
                    <p className={`text-xs mt-1 font-medium ${accent.check}`}>
                      {formatFecha(fecha, lang)}
                    </p>
                  )}
                  {!obtenido && (
                    <p className="mt-1 text-xs text-gray-500">
                      {lang === 'en' ? 'Not yet earned' : 'Aún no obtenido'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
