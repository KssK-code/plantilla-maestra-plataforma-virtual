/**
 * Índice público del catálogo de diplomados — Server Component.
 *
 * ⚠️ POR QUÉ EXISTE ESTE ARCHIVO. Antes solo había `/diplomados/[id]`: el
 * detalle de un diplomado concreto. La ruta padre `/diplomados` no estaba
 * definida, así que el cliente publicaba un diplomado desde su panel, escribía
 * la URL que parece obvia —`/diplomados`— y recibía un 404 de la plataforma
 * (TICKET-2026-09-03-37). El catálogo sí se pintaba, pero únicamente como una
 * sección dentro de la landing, y solo con `landing.mostrarCatalogoCursos`
 * encendido.
 *
 * Lee con `listarCatalogoPublico()`, el mismo helper de lista blanca que usa la
 * landing: desde el servidor y sin abrir la RLS a `anon`. No sale nada de
 * lecciones, videos, material ni exámenes; solo lo que es material de venta.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { CONFIG } from '@/lib/config'
import { listarCatalogoPublico, precioMXN } from '@/lib/cursos/catalogo'

export const metadata: Metadata = {
  title: `${CONFIG.landing.catalogoTitulo} · ${CONFIG.nombre}`,
  description: CONFIG.landing.catalogoSubtitulo,
}

export default async function DiplomadosPage() {
  const catalogo = await listarCatalogoPublico()

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/" style={{ display: 'inline-block', marginBottom: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CONFIG.logo} alt={CONFIG.nombre} style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <h1 style={{
            fontSize: 36, fontWeight: 700, margin: '0 0 12px',
            color: 'var(--color-primario)', lineHeight: 1.2,
          }}>
            {CONFIG.landing.catalogoTitulo}
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            {CONFIG.landing.catalogoSubtitulo}
          </p>
        </div>

        {catalogo.length === 0 ? (
          /* El cliente puede llegar aquí antes de publicar nada. Se le dice
             qué pasa, en vez de dejar la página en blanco. */
          <div style={{
            textAlign: 'center', padding: '56px 24px', background: '#fff',
            borderRadius: 16, border: '1px solid #e8e2d5',
          }}>
            <p style={{ fontSize: 16, color: '#475569', margin: '0 0 8px', fontWeight: 600 }}>
              Aún no hay programas publicados
            </p>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
              Escríbenos y con gusto te contamos qué estamos preparando.
            </p>
            <a href={CONFIG.whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', marginTop: 22, padding: '12px 26px',
                borderRadius: 999, background: '#25D366', color: '#fff',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>
              Escríbenos por WhatsApp
            </a>
          </div>
        ) : (
          <div style={{
            display: 'grid', gap: 20,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          }}>
            {catalogo.map(c => (
              <Link
                key={c.id}
                href={`/diplomados/${c.id}`}
                style={{
                  display: 'flex', flexDirection: 'column', padding: 26,
                  background: '#fff', borderRadius: 16,
                  border: '1px solid #e8e2d5', textDecoration: 'none',
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--color-acento)', marginBottom: 8,
                }}>
                  {c.tipo === 'diplomado' ? 'Diplomado' : 'Curso'}
                </span>
                <h2 style={{
                  fontSize: 18, fontWeight: 700, lineHeight: 1.35, margin: '0 0 10px',
                  color: 'var(--color-primario)',
                }}>
                  {c.nombre}
                </h2>
                {c.descripcion && (
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
                    {c.descripcion.length > 140 ? c.descripcion.slice(0, 140) + '…' : c.descripcion}
                  </p>
                )}
                <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #f1ece0' }}>
                  {(c.horas || c.duracion_meses) && (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 6px' }}>
                      {[c.horas ? `${c.horas} horas` : null,
                        c.duracion_meses ? `${c.duracion_meses} ${c.duracion_meses === 1 ? 'mes' : 'meses'}` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primario)', margin: 0 }}>
                    {c.precio_mensualidad > 0
                      ? <>{precioMXN(c.precio_mensualidad)}<span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}> /mes</span></>
                      : precioMXN(c.precio_inscripcion)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}>
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
