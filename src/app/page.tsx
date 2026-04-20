import Image from 'next/image'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { CONFIG } from '@/lib/config'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const C = {
  navy: '#0D1B3E',
  royal: '#1565C0',
  light: '#1E88E5',
  bright: '#42A5F5',
  ice: '#E3F2FD',
  white: '#FFFFFF',
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export default function LandingPage() {
  const p = CONFIG.precios
  const wa = CONFIG.whatsappUrl

  return (
    <div
      className={dmSans.className}
      style={{ background: C.white, color: C.navy, minHeight: '100vh' }}
    >
      {/* ── 1. NAV fijo ───────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 h-[72px] border-b"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: `${C.ice}`,
        }}
      >
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <Image
            src="/logo-cjvb.png"
            alt={CONFIG.nombreCompleto}
            width={48}
            height={48}
            className="h-10 w-auto sm:h-12 object-contain flex-shrink-0"
            priority
          />
          <span
            className={`hidden sm:inline font-semibold text-sm sm:text-base truncate ${playfair.className}`}
            style={{ color: C.navy, letterSpacing: '0.02em' }}
          >
            {CONFIG.nombreCompleto}
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link
            href="/login"
            className="px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-colors border"
            style={{
              borderColor: C.royal,
              color: C.royal,
              background: 'transparent',
            }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: C.royal }}
          >
            Crear cuenta →
          </Link>
        </nav>
      </header>

      <main style={{ paddingTop: 72 }}>
        {/* ── 2. HERO fullscreen ───────────────────────────────────────────── */}
        <section
          className="relative min-h-[calc(100vh-72px)] flex flex-col justify-center px-4 sm:px-8 py-16 sm:py-24 overflow-hidden"
          style={{
            backgroundColor: C.navy,
            backgroundImage: `
              radial-gradient(ellipse 80% 50% at 50% -20%, ${C.royal}33, transparent 55%),
              radial-gradient(circle at 85% 60%, ${C.light}18 0%, transparent 45%),
              linear-gradient(165deg, ${C.navy} 0%, #0a1428 100%)
            `,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <p
              className="inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide mb-6"
              style={{
                background: `${C.ice}22`,
                color: C.ice,
                border: `1px solid ${C.bright}44`,
              }}
            >
              Incorporado a la SEP · Puebla, México
            </p>
            <h1
              className={`${playfair.className} text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] font-semibold mb-6`}
              style={{ color: C.white }}
            >
              Excelencia académica
              <br />
              <span style={{ color: C.bright }}>en línea</span>, con validez oficial
            </h1>
            <p
              className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: `${C.ice}cc` }}
            >
              {CONFIG.nombreCompleto}: Secundaria y Preparatoria con acompañamiento cercano,
              plataforma moderna y certificación alineada a estándares nacionales.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 sm:mb-20">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-center transition-colors shadow-lg"
                style={{ background: C.white, color: C.navy }}
              >
                Crear cuenta
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-center border-2 transition-colors"
                style={{
                  borderColor: C.bright,
                  color: C.ice,
                  background: 'transparent',
                }}
              >
                WhatsApp
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-3xl mx-auto border-t pt-10 sm:pt-12"
              style={{ borderColor: `${C.light}33` }}
            >
              {[
                { n: '2', l: 'Niveles', s: 'Sec. · Prepa' },
                { n: '100%', l: 'En línea', s: 'A tu ritmo' },
                { n: 'SEP', l: 'Respaldo', s: 'Oficial' },
                { n: '24h', l: 'Acceso', s: 'Plataforma' },
              ].map((s) => (
                <div key={s.l}>
                  <div className={`text-2xl sm:text-3xl font-bold ${playfair.className}`} style={{ color: C.bright }}>
                    {s.n}
                  </div>
                  <div className="text-sm font-semibold mt-1" style={{ color: C.white }}>
                    {s.l}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: `${C.ice}99` }}>
                    {s.s}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. NIVELES + precios ─────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-8" style={{ background: C.ice }}>
          <div className="max-w-5xl mx-auto">
            <p className={`text-center text-sm font-semibold tracking-widest mb-3 ${playfair.className}`} style={{ color: C.royal }}>
              PROGRAMAS
            </p>
            <h2
              className={`text-center text-3xl sm:text-4xl font-semibold mb-4 ${playfair.className}`}
              style={{ color: C.navy }}
            >
              Secundaria y Preparatoria
            </h2>
            <p className="text-center max-w-xl mx-auto mb-12 sm:mb-16 text-sm sm:text-base" style={{ color: `${C.navy}aa` }}>
              Inscripción: {fmt(p.inscripcion)} · Mensualidades y certificación según plan.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Preparatoria',
                  lines: [
                    `Prepa 6 meses: ${fmt(p.plan6mMensualidad)}/mes`,
                    `Prepa 3 meses: ${fmt(p.plan3mMensualidad)}/mes`,
                    `Certificación prepa: ${fmt(p.certificacionPreparatoria)}`,
                  ],
                },
                {
                  title: 'Secundaria',
                  lines: [
                    `Sec 6 meses: ${fmt(p.plan6mMensualidad)}/mes`,
                    `Sec 3 meses: ${fmt(p.plan3mMensualidad)}/mes`,
                    `Certificación sec: ${fmt(p.certificacionSecundaria)}`,
                  ],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl p-8 sm:p-10 shadow-xl border"
                  style={{
                    background: C.white,
                    borderColor: `${C.light}33`,
                    boxShadow: `0 24px 60px ${C.navy}14`,
                  }}
                >
                  <h3 className={`text-2xl font-semibold mb-6 ${playfair.className}`} style={{ color: C.navy }}>
                    {card.title}
                  </h3>
                  <ul className="space-y-4 text-sm sm:text-base">
                    <li className="font-semibold pb-2 border-b" style={{ borderColor: C.ice, color: C.royal }}>
                      Inscripción: {fmt(p.inscripcion)}
                    </li>
                    {card.lines.map((line) => (
                      <li key={line} style={{ color: `${C.navy}cc` }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="mt-8 inline-block w-full text-center py-3 rounded-xl font-semibold text-white transition-colors"
                    style={{ background: C.royal }}
                  >
                    Comenzar →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. CÓMO FUNCIONA ─────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <p className={`text-center text-sm font-semibold tracking-widest mb-3 ${playfair.className}`} style={{ color: C.royal }}>
              PROCESO
            </p>
            <h2 className={`text-center text-3xl sm:text-4xl font-semibold mb-14 ${playfair.className}`} style={{ color: C.navy }}>
              Cómo funciona
            </h2>
            <ol className="space-y-10 sm:space-y-12">
              {[
                { step: '1', t: 'Registro', d: 'Crea tu cuenta y elige nivel (Secundaria o Preparatoria).' },
                { step: '2', t: 'Inscripción', d: 'Completa tu pago de inscripción y sube la documentación requerida.' },
                { step: '3', t: 'Acceso', d: 'Recibes acceso a meses y materias según tu plan contratado.' },
                { step: '4', t: 'Certificación', d: 'Avanza en la plataforma y concluye con la certificación correspondiente.' },
              ].map((item) => (
                <li key={item.step} className="flex gap-5 sm:gap-8">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${playfair.className}`}
                    style={{ background: C.navy, color: C.white }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: C.navy }}>
                      {item.t}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed" style={{ color: `${C.navy}99` }}>
                      {item.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 5. BENEFICIOS (fondo marino) ─────────────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-8" style={{ background: C.navy }}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-center text-3xl sm:text-4xl font-semibold mb-4 ${playfair.className}`} style={{ color: C.white }}>
              Beneficios
            </h2>
            <p className="text-center mb-12 sm:mb-16 text-sm max-w-lg mx-auto" style={{ color: `${C.ice}aa` }}>
              Una experiencia pensada para quienes buscan rigor académico y flexibilidad real.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                'Validez oficial SEP e incorporación institucional.',
                'Estudia desde Puebla u otro punto del país, 100% en línea.',
                'Contenidos estructurados por meses y materias claras.',
                'Seguimiento y canal directo por WhatsApp.',
                'Planes de 6 y 3 meses según tu disponibilidad.',
                'Constancia y trazabilidad de tu avance en la plataforma.',
              ].map((txt) => (
                <div
                  key={txt}
                  className="rounded-xl p-6 border"
                  style={{
                    background: `${C.royal}18`,
                    borderColor: `${C.light}33`,
                  }}
                >
                  <p className="text-sm sm:text-[15px] leading-relaxed" style={{ color: C.ice }}>
                    {txt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CTA FINAL (gradiente + WA verde) ─────────────────────────── */}
        <section
          className="py-20 sm:py-28 px-4 sm:px-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${C.navy} 0%, ${C.royal} 45%, ${C.light} 100%)`,
          }}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className={`text-3xl sm:text-[2.75rem] font-semibold mb-6 leading-tight ${playfair.className}`} style={{ color: C.white }}>
              Da el siguiente paso con {CONFIG.nombreCompleto}
            </h2>
            <p className="mb-10 text-sm sm:text-base" style={{ color: `${C.ice}dd` }}>
              Registro en minutos. Equipo listo para orientarte.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-semibold shadow-lg"
                style={{ background: C.white, color: C.navy }}
              >
                Crear cuenta
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-semibold text-white"
                style={{ background: '#25D366' }}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ── 7. FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="py-12 px-4 sm:px-8 text-center" style={{ background: '#070f1f', color: `${C.ice}88` }}>
          <div className="flex justify-center mb-4">
            <Image src="/logo-cjvb.png" alt={CONFIG.nombreCompleto} width={40} height={40} className="opacity-95 object-contain" />
          </div>
          <p className="text-sm font-medium" style={{ color: C.ice }}>
            {CONFIG.nombreCompleto}
          </p>
          <p className="text-xs mt-2">
            Puebla, México · {CONFIG.dominio}
          </p>
          <p className="text-xs mt-6 opacity-60">
            © {new Date().getFullYear()} {CONFIG.nombreCompleto}. Todos los derechos reservados.
          </p>
        </footer>
      </main>
    </div>
  )
}
