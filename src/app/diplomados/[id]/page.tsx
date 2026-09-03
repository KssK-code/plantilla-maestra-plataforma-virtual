/**
 * Detalle público de un diplomado — Server Component.
 *
 * Página de venta: el prospecto la abre desde el catálogo o desde un link que le
 * mandaron por WhatsApp, ve el temario y los precios, y escribe. No hay checkout
 * ni auto-inscripción: la conversión es por WhatsApp y el admin lo inscribe (B3).
 *
 * ⚠️ QUÉ PUEDE SALIR AQUÍ Y QUÉ NO. Los datos vienen de `detallePublico()`, que
 * lee con una lista blanca de campos desde el servidor. Sale el TEMARIO — los
 * títulos de los módulos, que son material de venta. NO sale nada de lecciones
 * (ni títulos, ni conteos), ni URLs de video, ni material, ni una sola pregunta
 * del examen, ni quién está inscrito.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CONFIG } from '@/lib/config'
import { detallePublico, precioMXN, waUrlDiplomado } from '@/lib/cursos/catalogo'

interface Props { params: { id: string } }

/**
 * Metadatos por diplomado: el link se comparte por WhatsApp, así que la
 * previsualización tiene que decir de qué va en vez de repetir el nombre del
 * sitio.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const curso = await detallePublico(params.id)
  if (!curso) return { title: 'Diplomado no disponible' }

  const desc = curso.descripcion?.slice(0, 155)
    ?? `${curso.nombre}${curso.horas ? ` · ${curso.horas} horas` : ''} en ${CONFIG.nombreCompleto}.`

  return {
    title: `${curso.nombre} — ${CONFIG.nombreCompleto}`,
    description: desc,
    openGraph: {
      title: `${curso.nombre} — ${CONFIG.nombreCompleto}`,
      description: desc,
      type: 'website',
    },
  }
}

export default async function DiplomadoPublicoPage({ params }: Props) {
  const curso = await detallePublico(params.id)

  // Un curso en borrador da 404 igual que uno inexistente: decir "existe pero no
  // está publicado" ya sería filtrar información.
  if (!curso) notFound()

  const wa = waUrlDiplomado(CONFIG.whatsappUrl, curso.nombre)
  const etiqueta = curso.tipo === 'diplomado' ? 'Diplomado' : 'Curso'

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-fondo)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-16">

        <Link href="/#diplomados" className="text-sm font-semibold" style={{ color: 'var(--color-primario)' }}>
          ← Volver al catálogo
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 sm:p-10" style={{ border: '1px solid var(--color-borde)' }}>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-primario)' }}>
            {etiqueta}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight mt-2" style={{ color: 'var(--color-primario)' }}>
            {curso.nombre}
          </h1>

          {curso.descripcion && (
            <p className="text-sm sm:text-base leading-relaxed mt-4 whitespace-pre-wrap" style={{ color: 'var(--color-texto)' }}>
              {curso.descripcion}
            </p>
          )}

          {/* Datos duros. Se omite lo que sea NULL en vez de pintar "—". */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm" style={{ color: 'var(--color-texto-secundario)' }}>
            {curso.horas !== null && <span><strong style={{ color: 'var(--color-primario)' }}>{curso.horas}</strong> horas</span>}
            {curso.duracion_meses !== null && (
              <span><strong style={{ color: 'var(--color-primario)' }}>{curso.duracion_meses}</strong> {curso.duracion_meses === 1 ? 'mes' : 'meses'}</span>
            )}
          </div>

          {/* ⚠️ Un curso SIN mensualidad se cobra de una sola vez. Etiquetarlo
              «Inscripción única de $X» se lee como un anticipo al que seguirán
              pagos, que es justo lo contrario. Se distinguen los dos casos. */}
          {(curso.precio_mensualidad > 0 || curso.precio_inscripcion > 0) && (
            <div className="mt-6 rounded-xl p-4"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
              {curso.precio_mensualidad > 0 ? (
                <>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-primario)' }}>
                    {precioMXN(curso.precio_mensualidad)}
                    <span className="text-sm font-normal" style={{ color: 'var(--color-texto-secundario)' }}> / mes</span>
                  </p>
                  {curso.precio_inscripcion > 0 && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-texto-secundario)' }}>
                      Inscripción de {precioMXN(curso.precio_inscripcion)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-primario)' }}>
                    {precioMXN(curso.precio_inscripcion)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-texto-secundario)' }}>Pago único</p>
                </>
              )}
            </div>
          )}

          {/* TEMARIO: solo títulos de módulo. Nada de lecciones ni del examen. */}
          {curso.temario.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-primario)' }}>Temario</h2>
              <ol className="space-y-2">
                {curso.temario.map((titulo, i) => (
                  <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--color-texto)' }}>
                    <span className="font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--color-texto-secundario)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{titulo}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* CTA alcanzable con el pulgar: ancho completo en móvil. */}
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 w-full flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold"
            style={{ background: '#0F7A41', color: '#fff' }}
          >
            Pedir informes por WhatsApp
          </a>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--color-texto-secundario)' }}>
            Te contactamos para resolver dudas y darte de alta.
          </p>
        </div>
      </div>
    </main>
  )
}
