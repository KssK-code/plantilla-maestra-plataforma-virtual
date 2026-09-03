'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Trash2, Upload, X } from 'lucide-react'
import { VideoPreview } from './VideoPreview'
import { validarMaterial } from '@/lib/cursos/archivos'
import { subirArchivoCursos } from '@/lib/cursos/upload'
import type { CursoLeccion } from '@/types/cursos'

interface LeccionModalProps {
  open: boolean
  cursoId: string
  moduloId: string
  /** null → crear; con valor → editar */
  leccion: CursoLeccion | null
  onClose: () => void
  /** Se llama tras guardar con éxito para refrescar el detalle. */
  onSaved: (mensaje: string) => void
  /** Refetch silencioso: para fallos parciales (lección guardada, archivo no). */
  onPartial: () => void
  onError: (mensaje: string) => void
}

export function LeccionModal({ open, cursoId, moduloId, leccion, onClose, onSaved, onPartial, onError }: LeccionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [titulo, setTitulo] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [texto, setTexto] = useState('')
  const [material, setMaterial] = useState<File | null>(null)
  const [quitarMaterialActual, setQuitarMaterialActual] = useState(false)
  const [guardando, setGuardando] = useState(false)
  // Si el POST de creación tuvo éxito pero el PDF falló, aquí queda el id
  // real: el reintento hace PATCH sobre esta lección (evita duplicados).
  const [leccionIdGuardada, setLeccionIdGuardada] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitulo(leccion?.titulo ?? '')
      setVideoUrl(leccion?.video_url ?? '')
      setTexto(leccion?.contenido_texto ?? '')
      setMaterial(null)
      setQuitarMaterialActual(false)
      setGuardando(false)
      setLeccionIdGuardada(null)
    }
  }, [open, leccion])

  if (!open) return null

  function onMaterialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const valid = validarMaterial(file)
    if (!valid.ok) {
      onError(valid.error)
      e.target.value = ''
      return
    }
    setMaterial(file)
    setQuitarMaterialActual(false)
  }

  async function handleGuardar() {
    const t = titulo.trim()
    if (!t) {
      onError('El título es requerido')
      return
    }
    setGuardando(true)
    try {
      // El id puede venir del prop (editar) o de un intento anterior que creó
      // la lección pero falló en el archivo (evita POST duplicado al reintentar)
      let leccionId = leccion?.id ?? leccionIdGuardada

      if (!leccionId) {
        // Crear
        const res = await fetch(`/api/admin/cursos/${cursoId}/lecciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modulo_id: moduloId,
            titulo: t,
            video_url: videoUrl.trim() || null,
            contenido_texto: texto.trim() || null,
          }),
        })
        const json = await res.json().catch(() => ({} as { id?: string; error?: string }))
        if (!res.ok) throw new Error(json.error ?? 'Error al crear la lección')
        leccionId = json.id as string
        setLeccionIdGuardada(leccionId)
      } else {
        // Editar (o reintento tras creación parcial)
        const res = await fetch(`/api/admin/cursos/${cursoId}/lecciones/${leccionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: t,
            video_url: videoUrl.trim() || null,
            contenido_texto: texto.trim() || null,
          }),
        })
        const json = await res.json().catch(() => ({} as { error?: string }))
        if (!res.ok) throw new Error(json.error ?? 'Error al guardar la lección')
      }

      // Material: subir nuevo (reemplaza el anterior) o quitar el actual.
      // La subida va directa a Storage con signed URL (límite Vercel 4.5MB).
      if (material && leccionId) {
        const resultado = await subirArchivoCursos(
          `/api/admin/cursos/${cursoId}/lecciones/${leccionId}/material`,
          material
        )
        if (!resultado.ok) {
          // Fallo PARCIAL: la lección sí quedó guardada → refetch silencioso
          // para que aparezca en la lista, y el modal queda abierto para
          // reintentar el PDF (leccionIdGuardada evita duplicarla).
          onPartial()
          throw new Error(`La lección se guardó, pero el PDF falló: ${resultado.error}. Reintenta la subida.`)
        }
      } else if (quitarMaterialActual && leccionId && leccion?.material_path) {
        const rmRes = await fetch(`/api/admin/cursos/${cursoId}/lecciones/${leccionId}/material`, { method: 'DELETE' })
        if (!rmRes.ok) {
          const rmJson = await rmRes.json().catch(() => ({} as { error?: string }))
          onPartial()
          throw new Error(`La lección se guardó, pero no se pudo quitar el PDF: ${rmJson.error ?? 'error'}`)
        }
      }

      onSaved(leccion ? 'Lección actualizada' : 'Lección creada')
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const inputStyle = { border: '1px solid var(--color-borde)', color: 'var(--color-primario)', background: 'var(--color-superficie)' }
  const materialActualVisible = Boolean(leccion?.material_path) && !material && !quitarMaterialActual

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={leccion ? 'Editar lección' : 'Nueva lección'}>
      <div className="absolute inset-0 bg-black/50" onClick={guardando ? undefined : onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-primario)' }}>
            {leccion ? 'Editar lección' : 'Nueva lección'}
          </h3>
          <button onClick={onClose} disabled={guardando} className="p-1 rounded-lg" style={{ color: '#9CA3AF' }} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="leccion-titulo" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Título <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="leccion-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={200}
              placeholder="Ej. Introducción al módulo"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="leccion-video" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              URL de video <span className="font-normal text-xs" style={{ color: 'var(--color-texto-secundario)' }}>(YouTube, Vimeo o Loom)</span>
            </label>
            <input
              id="leccion-video"
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
            <VideoPreview url={videoUrl} titulo={titulo} />
          </div>

          <div>
            <label htmlFor="leccion-texto" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Texto de la lección
            </label>
            <textarea
              id="leccion-texto"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={5}
              placeholder="Contenido en texto plano. Los saltos de línea se respetan al mostrarse."
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-y"
              style={inputStyle}
            />
          </div>

          <div>
            <span className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Material PDF <span className="font-normal text-xs" style={{ color: 'var(--color-texto-secundario)' }}>(opcional · máx 10MB)</span>
            </span>

            {materialActualVisible && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-acento)' }} />
                {leccion?.materialUrl ? (
                  <a
                    href={leccion.materialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate flex-1 hover:underline"
                    style={{ color: 'var(--color-acento)' }}
                  >
                    {leccion.material_path?.split('/').pop()}
                  </a>
                ) : (
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--color-texto-secundario)' }}>
                    {leccion?.material_path?.split('/').pop()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setQuitarMaterialActual(true)}
                  className="p-1 rounded"
                  style={{ color: '#EF4444' }}
                  aria-label="Quitar PDF actual"
                  title="Quitar PDF"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {quitarMaterialActual && (
              <p className="text-xs mb-2" style={{ color: '#F59E0B' }}>
                El PDF actual se eliminará al guardar.{' '}
                <button type="button" onClick={() => setQuitarMaterialActual(false)} className="underline font-medium">
                  Deshacer
                </button>
              </p>
            )}

            {material ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.3)' }}>
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                <span className="text-sm font-medium truncate flex-1" style={{ color: '#065F46' }}>{material.name}</span>
                <button
                  type="button"
                  onClick={() => { setMaterial(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="p-1 rounded"
                  style={{ color: '#EF4444' }}
                  aria-label="Quitar PDF seleccionado"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full justify-center"
                style={{ border: '2px dashed #D1D5DB', color: 'var(--color-texto-secundario)', background: '#FAFAFA' }}
              >
                <Upload className="w-4 h-4" />
                {leccion?.material_path && !quitarMaterialActual ? 'Reemplazar PDF' : 'Seleccionar PDF'}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={onMaterialChange}
              className="hidden"
              aria-label="Archivo PDF de material"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto-secundario)', background: 'var(--color-superficie)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !titulo.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-acento)', color: 'var(--color-texto-sobre-acento)' }}
          >
            {guardando ? 'Guardando…' : 'Guardar lección'}
          </button>
        </div>
      </div>
    </div>
  )
}
