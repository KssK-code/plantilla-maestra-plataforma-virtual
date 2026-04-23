'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { CONFIG } from '@/lib/config'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const C = {
  hero: '#080F1E',
  navy: '#0D1B3E',
  royal: '#1565C0',
  bright: '#1E88E5',
  azure: '#42A5F5',
  ice: '#E3F2FD',
  white: '#FFFFFF',
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

/* ── Floating Particles ───────────────────────────────────────────────── */
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

    type Particle = { x: number; y: number; r: number; vx: number; vy: number; op: number }
    const particles: Particle[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.4 + 0.1),
        op: Math.random() * 0.55 + 0.08,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(66,165,245,${p.op})`
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 w-full h-full" />
}

/* ── Animated Counter ─────────────────────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const [triggered, setTriggered] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || triggered) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      setTriggered(true)
      obs.disconnect()
      const t0 = Date.now()
      const dur = 1800
      const tick = () => {
        const prog = Math.min((Date.now() - t0) / dur, 1)
        const eased = 1 - Math.pow(1 - prog, 3)
        setVal(Math.round(eased * to))
        if (prog < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to, triggered])

  return <span ref={ref}>{val}{suffix}</span>
}

/* ── Scroll Reveal ────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('sr-visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ── 3D Hover Card ────────────────────────────────────────────────────── */
function Card3D({ children, className, style }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const rx = ((y - r.height / 2) / (r.height / 2)) * -9
    const ry = ((x - r.width / 2) / (r.width / 2)) * 9
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.025,1.025,1.025)`
  }

  const onLeave = () => {
    const el = ref.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)', transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}

/* ── Inline SVG check icon ────────────────────────────────────────────── */
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M2.5 7L5.5 10L11.5 4" stroke={C.azure} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ── WhatsApp icon ────────────────────────────────────────────────────── */
const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 2.44.65 4.73 1.79 6.72L2 30l7.5-1.77A13.94 13.94 0 0016 30c7.73 0 14-6.27 14-14S23.73 2 16 2zm0 25.5c-2.22 0-4.3-.6-6.08-1.65l-.43-.26-4.46 1.05 1.08-4.33-.28-.45A11.5 11.5 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5zm6.4-8.6c-.35-.18-2.07-1.02-2.39-1.14-.32-.12-.55-.18-.78.18-.23.35-.9 1.14-1.1 1.37-.2.23-.4.26-.76.09-.36-.18-1.52-.56-2.9-1.8-1.07-.97-1.8-2.16-2.01-2.52-.21-.36-.02-.55.16-.73.16-.16.36-.41.53-.62.18-.2.24-.35.36-.59.12-.23.06-.44-.03-.62-.09-.18-.78-1.87-1.07-2.56-.28-.67-.56-.58-.77-.59h-.65c-.23 0-.6.09-.91.44-.32.35-1.2 1.17-1.2 2.85s1.23 3.31 1.4 3.54c.18.23 2.43 3.71 5.88 5.21.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.03-.83 2.32-1.63.28-.8.28-1.49.2-1.63-.09-.15-.32-.23-.67-.41z" />
  </svg>
)

/* ══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const p = CONFIG.precios
  const wa = CONFIG.whatsappUrl
  useScrollReveal()

  return (
    <>
      {/* Global styles */}
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity .65s cubic-bezier(.4,0,.2,1), transform .65s cubic-bezier(.4,0,.2,1);
        }
        [data-reveal].sr-visible { opacity: 1; transform: none; }
        [data-d="1"] { transition-delay: .1s; }
        [data-d="2"] { transition-delay: .2s; }
        [data-d="3"] { transition-delay: .3s; }
        [data-d="4"] { transition-delay: .4s; }
        [data-d="5"] { transition-delay: .5s; }

        .cjvb-btn-white {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 32px; border-radius: 12px;
          background: ${C.white}; color: ${C.navy};
          font-weight: 700; font-size: 15px;
          box-shadow: 0 4px 24px rgba(0,0,0,.25);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .cjvb-btn-white:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,.3); }

        .cjvb-btn-outline {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 32px; border-radius: 12px;
          background: transparent; color: ${C.ice};
          font-weight: 600; font-size: 15px;
          border: 1.5px solid rgba(66,165,245,.45);
          transition: background .18s ease, border-color .18s ease;
        }
        .cjvb-btn-outline:hover { background: rgba(66,165,245,.1); border-color: ${C.azure}; }

        .cjvb-btn-wa {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 32px; border-radius: 12px;
          background: #25D366; color: #fff;
          font-weight: 700; font-size: 15px;
          box-shadow: 0 6px 20px rgba(37,211,102,.35);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .cjvb-btn-wa:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(37,211,102,.45); }

        .cjvb-step-num {
          flex-shrink: 0; width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px;
          background: linear-gradient(135deg, ${C.navy}, ${C.royal});
          color: ${C.white};
          box-shadow: 0 8px 24px rgba(13,27,62,.35);
        }

        .benefit-card {
          border-radius: 16px; padding: 24px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(66,165,245,.1);
          transition: background .2s ease, border-color .2s ease, transform .2s ease;
        }
        .benefit-card:hover {
          background: rgba(255,255,255,.07);
          border-color: rgba(66,165,245,.22);
          transform: translateY(-3px);
        }

        @media (max-width: 640px) {
          .hero-title { font-size: clamp(1.55rem, 7vw, 2.25rem) !important; }
        }
      `}</style>

      <div className={dmSans.className} style={{ background: C.white, color: C.navy, minHeight: '100vh' }}>

        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-10 h-[68px]"
          style={{
            background: 'rgba(8,15,30,0.82)',
            backdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(66,165,245,0.1)',
          }}
        >
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image
              src={CONFIG.logo}
              alt={CONFIG.nombreCompleto}
              width={44}
              height={44}
              className="h-10 w-auto object-contain flex-shrink-0"
              priority
            />
            <span
              className={`hidden sm:inline font-semibold text-[15px] ${playfair.className}`}
              style={{ color: C.white, letterSpacing: '.02em' }}
            >
              {CONFIG.nombreCompleto}
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ color: C.azure, border: '1px solid rgba(66,165,245,.25)', background: 'transparent' }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${C.royal}, ${C.bright})`, boxShadow: `0 4px 14px ${C.royal}55` }}
            >
              Crear cuenta →
            </Link>
          </nav>
        </header>

        <main style={{ paddingTop: 68 }}>

          {/* ── HERO ────────────────────────────────────────────────────────── */}
          <section
            className="relative min-h-[calc(100dvh-68px)] flex flex-col justify-center items-center px-4 sm:px-8 py-20 overflow-hidden text-center"
            style={{ background: C.hero }}
          >
            {/* Particles */}
            <FloatingParticles />

            {/* Gradient glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 75% 55% at 50% -5%, ${C.royal}28, transparent 58%),
                  radial-gradient(circle at 10% 75%, ${C.bright}14, transparent 42%),
                  radial-gradient(circle at 88% 28%, ${C.royal}1c, transparent 38%)
                `,
              }}
            />

            {/* Watermark CJVB */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 flex items-center justify-center select-none ${playfair.className}`}
              style={{
                fontSize: 'clamp(140px, 32vw, 420px)',
                fontWeight: 900,
                color: `rgba(21,101,192,0.042)`,
                letterSpacing: '-0.06em',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              CJVB
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto w-full">

              {/* Badge */}
              <div className="flex justify-center mb-7">
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
                  style={{
                    background: 'rgba(21,101,192,0.22)',
                    color: C.azure,
                    border: '1px solid rgba(66,165,245,0.22)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                  Incorporado a la SEP · Puebla, México
                </span>
              </div>

              {/* Title — hero_titulo + hero_highlight */}
              <h1
                className={`${playfair.className} hero-title font-bold mb-2`}
                style={{
                  fontSize: 'clamp(1.7rem, 4.5vw, 3.75rem)',
                  lineHeight: 1.08,
                  color: C.white,
                  whiteSpace: 'nowrap',
                }}
              >
                Tu Secundaria o Preparatoria
              </h1>
              <p
                className={`${playfair.className} font-bold mb-7`}
                style={{
                  fontSize: 'clamp(1.7rem, 4.5vw, 3.75rem)',
                  lineHeight: 1.08,
                  background: `linear-gradient(135deg, ${C.azure} 0%, #90caf9 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  whiteSpace: 'nowrap',
                }}
              >
                desde donde estés
              </p>

              {/* Subtitle — hero_subtitulo */}
              <p
                className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
                style={{ color: 'rgba(227,242,253,0.75)' }}
              >
                Sin ir a la escuela. Sin perder tu trabajo.
                <br className="hidden sm:block" />
                {' '}Con certificado oficial SEP.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Link href="/register" className="cjvb-btn-white w-full sm:w-auto">
                  Comenzar ahora →
                </Link>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="cjvb-btn-outline w-full sm:w-auto">
                  <WaIcon />
                  WhatsApp
                </a>
              </div>

              {/* Stats with animated counters */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t pt-10"
                style={{ borderColor: 'rgba(66,165,245,0.14)' }}
              >
                {[
                  { to: 2, suffix: '', label: 'Niveles', sub: 'Sec · Prepa' },
                  { to: 100, suffix: '%', label: 'En línea', sub: 'A tu ritmo' },
                  { to: 5, suffix: '+', label: 'Años', sub: 'De experiencia' },
                  { to: 24, suffix: 'h', label: 'Acceso', sub: 'Plataforma' },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className={`text-3xl sm:text-4xl font-bold ${playfair.className}`}
                      style={{ color: C.azure }}
                    >
                      <Counter to={s.to} suffix={s.suffix} />
                    </div>
                    <div className="text-sm font-semibold mt-1" style={{ color: C.white }}>{s.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(227,242,253,0.45)' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRECIOS ─────────────────────────────────────────────────────── */}
          <section className="py-24 sm:py-32 px-4 sm:px-8" style={{ background: '#EEF2FF' }}>
            <div className="max-w-5xl mx-auto">

              <div data-reveal className="text-center mb-14">
                <span
                  className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                  style={{ background: `${C.royal}15`, color: C.royal }}
                >
                  Programas
                </span>
                <h2 className={`text-3xl sm:text-4xl font-bold ${playfair.className}`} style={{ color: C.navy }}>
                  Secundaria y Preparatoria
                </h2>
                <p className="mt-3 text-sm sm:text-base max-w-md mx-auto" style={{ color: `${C.navy}88` }}>
                  Inscripción única {fmt(p.inscripcion)} · Elige tu nivel y plan
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">

                {/* Preparatoria — dark card (featured) */}
                <div data-reveal data-d="1">
                  <Card3D
                    className="rounded-2xl p-8 sm:p-10 h-full flex flex-col"
                    style={{
                      background: `linear-gradient(150deg, ${C.navy} 0%, #091830 100%)`,
                      boxShadow: `0 32px 80px ${C.navy}50`,
                      border: '1px solid rgba(66,165,245,0.18)',
                    }}
                  >
                    <div className="flex justify-between items-start mb-5">
                      <h3 className={`text-2xl font-bold ${playfair.className}`} style={{ color: C.white }}>
                        Preparatoria
                      </h3>
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: `${C.bright}22`, color: C.azure, border: `1px solid ${C.azure}30` }}
                      >
                        ★ Popular
                      </span>
                    </div>
                    <p className="text-xs font-semibold mb-6" style={{ color: C.azure }}>
                      Inscripción: {fmt(p.inscripcion)}
                    </p>
                    <div className="space-y-3 flex-1">
                      {[
                        { label: 'Plan 6 meses', price: p.plan6mMensualidad, unit: '/mes' },
                        { label: 'Plan 3 meses', price: p.plan3mMensualidad, unit: '/mes' },
                        { label: 'Certificación', price: p.certificacionPreparatoria, unit: ' único' },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-xl px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-sm" style={{ color: 'rgba(227,242,253,0.7)' }}>{row.label}</span>
                          <span className={`text-base font-bold ${playfair.className}`} style={{ color: C.azure }}>
                            {fmt(row.price)}<span className="text-xs font-normal opacity-70">{row.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/register"
                      className="mt-8 block w-full text-center py-3.5 rounded-xl font-bold text-white transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${C.royal}, ${C.bright})`,
                        boxShadow: `0 8px 28px ${C.royal}55`,
                      }}
                    >
                      Inscribirme →
                    </Link>
                  </Card3D>
                </div>

                {/* Secundaria — light card */}
                <div data-reveal data-d="2">
                  <Card3D
                    className="rounded-2xl p-8 sm:p-10 h-full flex flex-col"
                    style={{
                      background: C.white,
                      boxShadow: `0 24px 60px ${C.navy}12`,
                      border: `1px solid rgba(21,101,192,0.12)`,
                    }}
                  >
                    <div className="mb-5">
                      <h3 className={`text-2xl font-bold ${playfair.className}`} style={{ color: C.navy }}>
                        Secundaria
                      </h3>
                    </div>
                    <p className="text-xs font-semibold mb-6" style={{ color: C.royal }}>
                      Inscripción: {fmt(p.inscripcion)}
                    </p>
                    <div className="space-y-3 flex-1">
                      {[
                        { label: 'Plan 6 meses', price: p.plan6mMensualidad, unit: '/mes' },
                        { label: 'Plan 3 meses', price: p.plan3mMensualidad, unit: '/mes' },
                        { label: 'Certificación', price: p.certificacionSecundaria, unit: ' único' },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-xl px-4 py-3"
                          style={{ background: `${C.royal}08`, border: `1px solid ${C.royal}14` }}
                        >
                          <span className="text-sm" style={{ color: `${C.navy}88` }}>{row.label}</span>
                          <span className={`text-base font-bold ${playfair.className}`} style={{ color: C.royal }}>
                            {fmt(row.price)}<span className="text-xs font-normal opacity-60">{row.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/register"
                      className="mt-8 block w-full text-center py-3.5 rounded-xl font-bold text-white transition-all"
                      style={{ background: C.navy, boxShadow: `0 8px 24px ${C.navy}30` }}
                    >
                      Inscribirme →
                    </Link>
                  </Card3D>
                </div>

              </div>
            </div>
          </section>

          {/* ── CÓMO FUNCIONA ───────────────────────────────────────────────── */}
          <section className="py-24 sm:py-32 px-4 sm:px-8 bg-white">
            <div className="max-w-4xl mx-auto">

              <div data-reveal className="text-center mb-16">
                <span
                  className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                  style={{ background: `${C.royal}10`, color: C.royal }}
                >
                  Proceso
                </span>
                <h2 className={`text-3xl sm:text-4xl font-bold ${playfair.className}`} style={{ color: C.navy }}>
                  Cómo funciona
                </h2>
              </div>

              <ol className="space-y-9 sm:space-y-11">
                {[
                  { n: '01', t: 'Registro', d: 'Crea tu cuenta y elige tu nivel: Secundaria o Preparatoria.' },
                  { n: '02', t: 'Inscripción', d: 'Realiza el pago de inscripción y sube los documentos requeridos.' },
                  { n: '03', t: 'Acceso a la plataforma', d: 'Obtén acceso inmediato a tus materias según el plan contratado.' },
                  { n: '04', t: 'Certificación oficial SEP', d: 'Concluye tu nivel y recibe el certificado con validez nacional.' },
                ].map((item, i) => (
                  <li
                    key={item.n}
                    className="flex gap-5 sm:gap-7 items-start"
                    data-reveal
                    data-d={String(i + 1)}
                  >
                    <div className={`cjvb-step-num ${playfair.className}`}>{item.n}</div>
                    <div className="pt-1">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1.5" style={{ color: C.navy }}>
                        {item.t}
                      </h3>
                      <p className="text-sm sm:text-base leading-relaxed" style={{ color: `${C.navy}75` }}>
                        {item.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── BENEFICIOS ──────────────────────────────────────────────────── */}
          <section
            className="py-24 sm:py-32 px-4 sm:px-8 relative overflow-hidden"
            style={{ background: C.navy }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse 65% 55% at 50% 105%, ${C.royal}38, transparent 65%)` }}
            />
            <div className="max-w-6xl mx-auto relative z-10">

              <div data-reveal className="text-center mb-14">
                <h2 className={`text-3xl sm:text-4xl font-bold ${playfair.className}`} style={{ color: C.white }}>
                  Todo lo que necesitas
                </h2>
                <p className="mt-3 text-sm sm:text-base max-w-md mx-auto" style={{ color: 'rgba(227,242,253,0.55)' }}>
                  Diseñado para quien trabaja, tiene familia y quiere superarse.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { title: 'Certificado oficial SEP', desc: 'Validez nacional reconocida por el sistema educativo mexicano.' },
                  { title: '100% en línea', desc: 'Estudia desde Puebla u otro punto del país sin trasladarte.' },
                  { title: 'Materias estructuradas', desc: 'Contenidos organizados por meses con progresión clara y alcanzable.' },
                  { title: 'Acompañamiento directo', desc: 'Seguimiento personalizado y canal de atención por WhatsApp.' },
                  { title: 'Planes flexibles', desc: 'Elige entre plan de 6 meses o de 3 meses según tu disponibilidad.' },
                  { title: 'Plataforma moderna', desc: 'Accede a tu constancia y avance desde cualquier dispositivo, 24 h.' },
                ].map((b, i) => (
                  <div
                    key={b.title}
                    className="benefit-card"
                    data-reveal
                    data-d={String((i % 3) + 1)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: `rgba(21,101,192,0.3)` }}
                    >
                      <CheckIcon />
                    </div>
                    <h3 className="font-semibold text-[15px] mb-2" style={{ color: C.white }}>
                      {b.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(227,242,253,0.52)' }}>
                      {b.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA FINAL ───────────────────────────────────────────────────── */}
          <section
            className="py-24 sm:py-32 px-4 sm:px-8 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(140deg, ${C.hero} 0%, ${C.navy} 45%, #0d3080 100%)` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse 55% 65% at 50% 50%, ${C.bright}1a, transparent 70%)` }}
            />
            {/* Watermark sutil */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 flex items-center justify-center select-none ${playfair.className}`}
              style={{
                fontSize: 'clamp(100px, 22vw, 300px)',
                fontWeight: 900,
                color: 'rgba(21,101,192,0.04)',
                letterSpacing: '-0.06em',
                userSelect: 'none',
              }}
            >
              CJVB
            </div>

            <div className="max-w-2xl mx-auto relative z-10">
              <div data-reveal>
                <h2
                  className={`text-3xl sm:text-5xl font-bold mb-6 leading-tight ${playfair.className}`}
                  style={{ color: C.white }}
                >
                  Tu futuro empieza
                  <br />
                  <span style={{
                    background: `linear-gradient(135deg, ${C.azure}, #90caf9)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    hoy mismo
                  </span>
                </h2>
                <p className="mb-10 text-base sm:text-lg" style={{ color: 'rgba(227,242,253,0.7)' }}>
                  Registro en minutos. Equipo listo para orientarte.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="cjvb-btn-white w-full sm:w-auto">
                    Crear cuenta gratis →
                  </Link>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cjvb-btn-wa w-full sm:w-auto"
                  >
                    <WaIcon />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── FOOTER ──────────────────────────────────────────────────────── */}
          <footer
            className="py-12 px-4 sm:px-8 text-center"
            style={{ background: '#050a14', color: 'rgba(227,242,253,0.45)' }}
          >
            <div className="flex justify-center mb-4">
              <Image
                src={CONFIG.logo}
                alt={CONFIG.nombreCompleto}
                width={40}
                height={40}
                className="opacity-90 object-contain"
              />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.ice }}>
              {CONFIG.nombreCompleto}
            </p>
            <p className="text-xs mt-1.5">
              Puebla, México · {CONFIG.dominio}
            </p>
            <p className="text-xs mt-6 opacity-40">
              © {new Date().getFullYear()} {CONFIG.nombreCompleto}. Todos los derechos reservados.
            </p>
          </footer>

        </main>
      </div>
    </>
  )
}
