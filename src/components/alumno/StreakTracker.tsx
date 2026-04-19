'use client'

interface StreakTrackerProps {
  diasRacha: number
  lang: string
}

export default function StreakTracker({ diasRacha, lang }: StreakTrackerProps) {
  if (diasRacha === 0) return null

  const caliente = diasRacha >= 3

  const texto = diasRacha === 1
    ? (lang === 'en' ? '1 day studying' : '1 día estudiando')
    : (lang === 'en' ? `${diasRacha} days in a row` : `${diasRacha} días seguidos`)

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base leading-none">🔥</span>
      <span
        className="text-sm font-semibold"
        style={{ color: caliente ? '#F59E0B' : '#94A3B8' }}
      >
        {texto}
      </span>
    </div>
  )
}
