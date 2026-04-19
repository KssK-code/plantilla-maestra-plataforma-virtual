'use client'

interface CelebrationBannerProps {
  materiaNombre: string
  materiaNombre_en?: string
  lang: string
  onClose: () => void
}

const CONFETTI = [
  { left: '8%',  color: '#6366F1', delay: '0s',    dur: '1.4s' },
  { left: '18%', color: '#10B981', delay: '0.15s',  dur: '1.7s' },
  { left: '27%', color: '#F59E0B', delay: '0.05s',  dur: '1.2s' },
  { left: '35%', color: '#EC4899', delay: '0.3s',   dur: '1.9s' },
  { left: '44%', color: '#6366F1', delay: '0.1s',   dur: '1.5s' },
  { left: '52%', color: '#34D399', delay: '0.4s',   dur: '1.3s' },
  { left: '60%', color: '#FBBF24', delay: '0.2s',   dur: '1.8s' },
  { left: '68%', color: '#818CF8', delay: '0.35s',  dur: '1.1s' },
  { left: '75%', color: '#F472B6', delay: '0.05s',  dur: '1.6s' },
  { left: '82%', color: '#10B981', delay: '0.25s',  dur: '2.0s' },
  { left: '89%', color: '#6366F1', delay: '0.45s',  dur: '1.4s' },
  { left: '94%', color: '#F59E0B', delay: '0.1s',   dur: '1.7s' },
]

export default function CelebrationBanner({
  materiaNombre,
  materiaNombre_en,
  lang,
  onClose,
}: CelebrationBannerProps) {
  const nombre = lang === 'en' && materiaNombre_en ? materiaNombre_en : materiaNombre

  return (
    <>
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .celebration-card {
          animation: cardIn 400ms ease-out forwards;
        }
        .confetti-piece {
          animation: confettiFall var(--dur) var(--delay) ease-in forwards;
        }
      `}</style>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      >
        {/* Confetti */}
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            className="confetti-piece fixed top-0 w-2.5 h-2.5 rounded-sm pointer-events-none"
            style={{
              left: c.left,
              background: c.color,
              '--delay': c.delay,
              '--dur': c.dur,
            } as React.CSSProperties}
          />
        ))}

        {/* Card */}
        <div
          className="celebration-card relative flex flex-col items-center text-center gap-4 rounded-2xl px-8 py-10 mx-4 max-w-sm w-full"
          style={{ background: '#181C26', border: '1px solid rgba(99,102,241,0.4)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-6xl select-none">🎓</div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>
              {lang === 'en' ? 'Subject passed!' : '¡Materia acreditada!'}
            </h2>
            <p className="text-sm" style={{ color: '#94A3B8' }}>{nombre}</p>
          </div>

          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#6366F1', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#818CF8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#6366F1' }}
          >
            {lang === 'en' ? 'Continue →' : 'Continuar →'}
          </button>
        </div>
      </div>
    </>
  )
}
