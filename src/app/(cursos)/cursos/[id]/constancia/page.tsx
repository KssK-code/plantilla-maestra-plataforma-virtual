'use client'

/**
 * Constancia de curso — documento imprimible del alumno.
 *
 * Reemplaza al folio que se generaba con `Math.random()` EN EL NAVEGADOR y no se
 * persistía: cambiaba en cada recarga, dos alumnos podían colisionar, y el
 * propio documento decía "para verificar su autenticidad contacte a
 * administración" cuando administración no tenía contra qué verificar.
 *
 * Aquí TODO viene del servidor: folio consecutivo de `curso_folio_seq` y los
 * snapshots congelados al emitir. Si el alumno se cambia el nombre o el curso se
 * renombra después, el documento sigue diciendo lo que decía el día que se
 * emitió — que es lo que debe hacer un documento.
 *
 * Se conserva el flujo imprimible con `window.print()` de la constancia
 * tradicional: es el patrón que ya funciona en la flota y no había razón para
 * rediseñarlo.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { CONFIG } from '@/lib/config'

interface Constancia {
  folio: string
  emitido_en: string
  horas: number | null
  alumno_nombre: string
  curso_nombre: string
  calificacion: number | null
}

type Motivo = 'sin_inscripcion' | 'examen_pendiente' | 'no_aprobado' | 'aprobado_en_emision' | null

const MENSAJE: Record<string, { titulo: string; detalle: string }> = {
  sin_inscripcion: {
    titulo: 'No estás inscrito en este curso',
    detalle: 'Si crees que es un error, contacta a tu institución.',
  },
  examen_pendiente: {
    titulo: 'Aún no presentas el examen final',
    detalle: 'Al aprobarlo, tu institución emite la constancia.',
  },
  no_aprobado: {
    titulo: 'Todavía no apruebas el examen final',
    detalle: 'La constancia se emite al alcanzar la calificación mínima. Puedes volver a intentarlo si te quedan intentos.',
  },
  // B8.2 — el estado entre aprobar y tener el documento: la emisión es manual
  // (el admin verifica y emite). Sin este mensaje, el alumno aprobado veía
  // "todavía no apruebas", que es mentirle justo en su mejor momento.
  aprobado_en_emision: {
    titulo: '¡Examen aprobado! Tu constancia está en emisión',
    detalle: 'Tu institución la está preparando. En cuanto la emitan, la verás aquí lista para descargar.',
  },
}

export default function ConstanciaCursoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const cursoId = params.id

  const [constancia, setConstancia] = useState<Constancia | null>(null)
  const [motivo, setMotivo] = useState<Motivo>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    fetch(`/api/alumno/cursos/${cursoId}/constancia`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: { constancia: Constancia | null; motivo: Motivo } | null) => {
        if (cancelado || !j) return
        setConstancia(j.constancia)
        setMotivo(j.motivo)
      })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [cursoId])

  const imprimir = useCallback(() => window.print(), [])

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primario)' }} />
      </div>
    )
  }

  if (!constancia) {
    const m = MENSAJE[motivo ?? 'examen_pendiente'] ?? MENSAJE.examen_pendiente
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <button
          onClick={() => router.push(`/cursos/${cursoId}`)}
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--color-primario)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver al curso
        </button>
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7' }}>
          <p className="text-base font-bold" style={{ color: 'var(--color-primario)' }}>{m.titulo}</p>
          <p className="text-sm mt-2" style={{ color: '#64748B' }}>{m.detalle}</p>
        </div>
      </div>
    )
  }

  const fecha = new Date(constancia.emitido_en).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <style>{`@media print { .no-imprimir { display: none !important; } }`}</style>

      <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <div className="flex gap-2 self-start no-imprimir">
          <button
            onClick={() => router.push(`/cursos/${cursoId}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(27,48,104,0.06)', color: 'var(--color-primario)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <button
            onClick={imprimir}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-acento)', color: '#fff' }}
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>

        {/* ── El documento ── */}
        <div
          className="w-full max-w-3xl px-8 py-10 sm:px-14 sm:py-14"
          style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}
        >
          <div className="text-center space-y-1">
            {CONFIG.logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={CONFIG.logo} alt="" style={{ height: 56, margin: '0 auto 10px' }} />
            )}
            <p className="text-lg font-bold tracking-wide" style={{ color: '#0F172A' }}>
              {CONFIG.nombreCompleto}
            </p>
            {CONFIG.cct?.trim() && (
              <p className="text-[11px]" style={{ color: '#94A3B8' }}>CCT: {CONFIG.cct.trim()}</p>
            )}
          </div>

          <p
            className="text-center mt-10 mb-8 uppercase"
            style={{ fontSize: 26, letterSpacing: '0.18em', color: '#0F172A', fontWeight: 700 }}
          >
            {CONFIG.diploma.etiqueta}
          </p>

          <p className="text-center text-sm" style={{ color: '#475569' }}>Se otorga la presente a</p>

          {/* SNAPSHOT: el nombre congelado al emitir, no el actual del perfil. */}
          <p className="text-center my-4" style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
            {constancia.alumno_nombre}
          </p>

          <p className="text-center text-sm leading-relaxed" style={{ color: '#475569' }}>
            por haber concluido y aprobado
          </p>
          <p className="text-center my-3" style={{ fontSize: 19, fontWeight: 600, color: '#1E293B' }}>
            {constancia.curso_nombre}
          </p>

          <p className="text-center text-sm" style={{ color: '#475569' }}>
            {constancia.horas !== null && <>con una duración de <strong>{constancia.horas} horas</strong>. </>}
            {constancia.calificacion !== null && (
              <>Calificación obtenida: <strong>{Math.round(Number(constancia.calificacion))}</strong>.</>
            )}
          </p>

          <p className="text-center text-sm mt-6" style={{ color: '#475569' }}>
            Expedida el {fecha}.
          </p>

          {/* Firma, solo si el cliente la configuró */}
          {CONFIG.diploma.firma && (
            <div className="flex flex-col items-center mt-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CONFIG.diploma.firma} alt="" style={{ height: 80 }} />
              <div style={{ width: 240, borderTop: '1px solid #94A3B8', marginTop: 6 }} />
              <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>{CONFIG.diploma.firmaCargo}</p>
            </div>
          )}

          <div className="flex items-end justify-between mt-12 pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#A0AEC0' }}>Folio</p>
              {/* Consecutivo, de curso_folio_seq. Verificable contra la base. */}
              <p className="text-sm font-bold tabular-nums" style={{ color: '#0F172A' }}>{constancia.folio}</p>
            </div>
            {CONFIG.logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={CONFIG.logo} alt="" style={{ height: 26, opacity: 0.5 }} />
            )}
          </div>

          {/*
            Texto deliberadamente NEUTRO. No dice "validez oficial", ni "SEP", ni
            "RVOE": afirmarlo por default sería poner en boca de todos los
            clientes algo que solo puede decir quien acredite su propio registro.
          */}
          <p className="text-[10px] text-center mt-4" style={{ color: '#94A3B8' }}>
            Documento con folio {constancia.folio}, expedido digitalmente por {CONFIG.nombreCompleto}.
            Para verificar su autenticidad, contacte a administración.
          </p>
        </div>
      </div>
    </>
  )
}
