'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CONFIG } from '@/lib/config'

const WA_URL = `https://wa.me/${CONFIG.whatsapp}`

const WaButton = ({ className = '', label = 'Informes por WhatsApp' }: { className?: string, label?: string }) => (
  <a
    href={WA_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors ${className}`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
    </svg>
    {label}
  </a>
)

const faqs = [
  { q: '¿El certificado es válido en México?', a: 'Sí. Emitimos un certificado oficial reconocido por la SEP México. Puedes verificarlo en el portal SIGED de la SEP con el folio de tu documento.' },
  { q: '¿Cuánto tiempo al día necesito dedicarle?', a: 'Con 1 a 2 horas diarias es suficiente. El plan de 6 meses es ideal si trabajas o tienes familia. El plan de 3 meses es más intensivo pero manejable.' },
  { q: '¿Qué documentos necesito para inscribirme?', a: 'Para Secundaria necesitas tu Certificado de Primaria. Para Preparatoria necesitas tu Certificado de Secundaria. Además: CURP, Acta de Nacimiento e Identificación Oficial.' },
  { q: '¿Puedo estudiar desde mi celular?', a: 'Sí, la plataforma está optimizada para celular, tablet y computadora. Estudia cuando y donde quieras, sin horarios fijos.' },
  { q: '¿Hay examen final?', a: 'No hay examen CENEVAL. Tu certificado se obtiene completando las actividades del programa. Sin estrés de examen único.' },
  { q: '¿Puedo ver la plataforma antes de pagar?', a: 'Sí. Crea tu cuenta gratis, entra a la plataforma y explora el contenido demo. Solo necesitas pagar la inscripción ($399 MXN) para desbloquear acceso completo.' },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a2e', background: '#fff' }}>

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e8e8f0',
        padding: '0 1.5rem', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={44} height={44} style={{ objectFit: 'contain', borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1B2F6E', lineHeight: 1 }}>{CONFIG.nombre}</div>
            <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 600, letterSpacing: '0.05em' }}>INSTITUTO</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3" style={{ display: 'flex', alignItems: 'center' }}>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hidden sm:flex" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#25D366', color: '#fff',
            padding: '8px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            textDecoration: 'none'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
            </svg>
            WhatsApp
          </a>
          <Link href="/login" style={{
            background: '#1B2F6E', color: '#fff',
            padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            textDecoration: 'none'
          }}>Ingresar</Link>
        </div>
      </nav>

      <section style={{
        background: 'linear-gradient(135deg, #0d1b4b 0%, #1B2F6E 50%, #2E4BA3 100%)',
        padding: '80px 1.5rem 100px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(201,168,76,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(201,168,76,0.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Image src={CONFIG.logo} alt={CONFIG.nombre} width={130} height={130} style={{ objectFit: 'contain', borderRadius: 16, background: 'white', padding: 12 }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
            {['🏛️ Incorporado a la SEP', '💻 100% en línea', '📜 Certificación oficial', '🚫 Sin examen final'].map(b => (
              <span key={b} style={{
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)',
                color: '#E8C97A', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600
              }}>{b}</span>
            ))}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 20 }}>
            Tu <span style={{ color: '#C9A84C' }}>Secundaria o Preparatoria</span> desde casa
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 40, lineHeight: 1.6 }}>
            Sin ir a la escuela. Sin perder tu trabajo.<br />
            Con <strong style={{ color: '#E8C97A' }}>certificado oficial reconocido por la SEP.</strong>
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center"
            style={{ gap: 16, marginBottom: 56 }}
          >
            <Link href="/register" style={{
              background: '#C9A84C', color: '#1B2F6E',
              padding: '14px 32px', borderRadius: 12, fontWeight: 800, fontSize: 16,
              textDecoration: 'none', display: 'inline-block'
            }}>Crear mi cuenta gratis →</Link>
            <WaButton />
          </div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { num: '2', label: 'Niveles', sub: 'Sec. y Prepa' },
              { num: '6', label: 'Meses', sub: 'Estándar' },
              { num: '3', label: 'Meses', sub: 'Express' },
              { num: '100%', label: 'En línea', sub: 'Sin salón' },
            ].map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#C9A84C' }}>{s.num}</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 1.5rem', background: '#F8F9FF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>PROGRAMAS</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#1B2F6E' }}>Elige tu nivel educativo</h2>
            <p style={{ color: '#666', marginTop: 12, fontSize: 16 }}>Dos programas, el mismo certificado oficial, la misma calidad.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { icon: '📚', titulo: 'Secundaria', desc: 'Certifícate con tu certificado de primaria.', doc: 'Certificado de Primaria', cert: '$4,250', popular: false },
              { icon: '🎓', titulo: 'Preparatoria', desc: 'Certifícate con tu certificado de secundaria.', doc: 'Certificado de Secundaria', cert: '$4,750', popular: true },
            ].map(n => (
              <div key={n.titulo} style={{
                background: '#fff', borderRadius: 20,
                border: n.popular ? '2px solid #C9A84C' : '1px solid #e8e8f0',
                padding: '32px 28px', position: 'relative',
                boxShadow: n.popular ? '0 8px 32px rgba(201,168,76,0.15)' : '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                {n.popular && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: '#C9A84C', color: '#1B2F6E', padding: '4px 20px',
                    borderRadius: 20, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap'
                  }}>🔥 Más solicitada</div>
                )}
                <div style={{ fontSize: 40, marginBottom: 16 }}>{n.icon}</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1B2F6E', marginBottom: 8 }}>{n.titulo}</h3>
                <p style={{ color: '#666', marginBottom: 20 }}>{n.desc}</p>
                <div style={{ background: '#F8F9FF', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
                  <span style={{ color: '#888' }}>Documento requerido: </span>
                  <span style={{ fontWeight: 600, color: '#1B2F6E' }}>{n.doc}</span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                    <span>6 meses / por mes</span><span style={{ fontWeight: 700, color: '#1B2F6E' }}>$1,000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                    <span>3 meses Express / por mes</span><span style={{ fontWeight: 700, color: '#1B2F6E' }}>$2,000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                    <span>Certificación (pago único)</span><span style={{ fontWeight: 700, color: '#C9A84C' }}>{n.cert}</span>
                  </div>
                </div>
                <WaButton className="w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>VENTAJAS</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#1B2F6E' }}>Todo lo que necesitas para terminar</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { icon: '📱', titulo: 'Desde tu celular o PC', desc: 'Estudia cuando quieras, donde quieras. Sin horarios fijos, sin trasladarte.' },
              { icon: '🚫', titulo: 'Sin examen final', desc: 'Nada de exámenes CENEVAL. Tu certificado se obtiene por actividades completadas.' },
              { icon: '⚡', titulo: '6 meses o 3 meses Express', desc: 'Elige tu ritmo. Programa regular en 6 meses o acelera al doble con Express.' },
              { icon: '✅', titulo: 'Certificado SEP oficial', desc: 'Certificado con validez oficial para continuar en universidades de México.' },
              { icon: '🎯', titulo: 'Videos y contenido claro', desc: 'Material didáctico con videos explicativos, quizzes y guías de estudio.' },
              { icon: '🏛️', titulo: 'Incorporado a la SEP', desc: 'Centro educativo oficialmente registrado ante la Secretaría de Educación Pública.' },
            ].map(f => (
              <div key={f.titulo} style={{ background: '#F8F9FF', borderRadius: 16, padding: '24px 20px', border: '1px solid #e8e8f0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, color: '#1B2F6E', marginBottom: 6, fontSize: 15 }}>{f.titulo}</div>
                <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 1.5rem', background: '#1B2F6E' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>INVERSIÓN</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>Planes y Precios</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 48 }}>
            Inscripción única: <strong style={{ color: '#C9A84C' }}>$399 MXN</strong> · Después pagas mensual según tu modalidad.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { tag: 'Programa Regular', sub: '6 Meses', precio: '$1,000', per: 'MXN/mes', items: ['Acceso completo 6 meses', 'Sin horarios fijos', 'Sin examen final', 'Soporte por WhatsApp', 'Certificado oficial SEP'], popular: false },
              { tag: '🔥 Terminas antes', sub: '⚡ Express 3 Meses', precio: '$2,000', per: 'MXN/mes', items: ['Terminas 3 meses antes', 'Ritmo intensivo manejable', 'Sin examen final', 'Soporte prioritario WhatsApp', 'Certificado oficial SEP'], popular: true },
            ].map(p => (
              <div key={p.sub} style={{
                background: p.popular ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '32px 28px',
                border: p.popular ? 'none' : '1px solid rgba(255,255,255,0.15)'
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.popular ? '#1B2F6E' : 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{p.tag}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: p.popular ? '#1B2F6E' : '#fff', marginBottom: 16 }}>{p.sub}</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: p.popular ? '#1B2F6E' : '#C9A84C' }}>{p.precio}</div>
                <div style={{ fontSize: 13, color: p.popular ? '#1B2F6E' : 'rgba(255,255,255,0.6)', marginBottom: 24 }}>{p.per}</div>
                <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: 24 }}>
                  {p.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: p.popular ? '#1B2F6E' : 'rgba(255,255,255,0.85)' }}>
                      <span style={{ color: p.popular ? '#1B2F6E' : '#C9A84C', fontWeight: 700 }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <WaButton className="w-full" />
              </div>
            ))}
          </div>
          <p style={{ marginTop: 32, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Costo de certificación al finalizar: <strong style={{ color: '#C9A84C' }}>Secundaria $4,250 · Preparatoria $4,750</strong>
          </p>
        </div>
      </section>

      <section style={{ padding: '80px 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>PROCESO</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#1B2F6E', marginBottom: 48 }}>3 pasos y ya estás adentro</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { num: '01', icon: '🙋', titulo: 'Crea tu cuenta gratis', desc: 'Regístrate en menos de 2 minutos. Sin tarjeta de crédito.' },
              { num: '02', icon: '💬', titulo: 'Contacta a tu asesor', desc: 'Escríbenos por WhatsApp. Te orientamos sobre nivel y modalidad.' },
              { num: '03', icon: '🎉', titulo: '¡Empieza a estudiar!', desc: 'Nuestro equipo te da acceso y puedes comenzar de inmediato.' },
            ].map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1B2F6E', color: '#C9A84C', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{s.num}</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, color: '#1B2F6E', marginBottom: 8, fontSize: 16 }}>{s.titulo}</div>
                <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
            <Link href="/register" style={{ background: '#1B2F6E', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>Crear mi cuenta gratis →</Link>
            <WaButton />
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 1.5rem', background: '#F8F9FF' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#1B2F6E' }}>Preguntas frecuentes</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: openFaq === i ? '1px solid #C9A84C' : '1px solid #e8e8f0', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', textAlign: 'left', padding: '18px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontWeight: 600, color: '#1B2F6E', fontSize: 15
                }}>
                  {faq.q}
                  <span style={{ color: '#C9A84C', fontSize: 20, flexShrink: 0, marginLeft: 12 }}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', color: '#555', fontSize: 14, lineHeight: 1.7 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, #0d1b4b 0%, #1B2F6E 60%, #2E4BA3 100%)', padding: '80px 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎓</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>Tu certificado te espera.</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
            En 6 meses — o 3 — puedes tener tu Secundaria o Preparatoria terminada.<br />Sin salir de casa. Sin perder tu trabajo.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ background: '#C9A84C', color: '#1B2F6E', padding: '16px 36px', borderRadius: 12, fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>Crear mi cuenta gratis →</Link>
            <WaButton />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 24 }}>Sin tarjeta de crédito · Registro en 2 minutos · Inscripción desde $399 MXN</p>
        </div>
      </section>

      <footer style={{ background: '#0d1b4b', padding: '32px 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Image src={CONFIG.logo} alt={CONFIG.nombre} width={36} height={36} style={{ objectFit: 'contain', borderRadius: 6, background: 'white', padding: 4 }} />
          <span style={{ color: '#fff', fontWeight: 700 }}>{CONFIG.nombre}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 8 }}>{CONFIG.dominio} · Preparatoria · Secundaria · {CONFIG.nombreCompleto}</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>© {new Date().getFullYear()} {CONFIG.nombre} · Todos los derechos reservados</p>
      </footer>

    </div>
  )
}
