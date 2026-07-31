'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Trash2, AlertTriangle } from 'lucide-react'
import { validarPortada } from '@/lib/cursos/archivos'
import { subirArchivoCursos } from '@/lib/cursos/upload'
import type { Curso } from '@/types/cursos'

/**
 * Campo numérico con su ayuda. `type="number"` con `min`/`step` es solo
 * comodidad de teclado en móvil: la validación que cuenta está en el servidor
 * (src/lib/cursos/parametros.ts), porque un curl no pasa por aquí.
 */
function CampoNumero({ id, label, valor, onChange, min, step, ayuda, resaltado }: {
  id: string
  label: string
  valor: string
  onChange: (v: string) => void
  min: number
  step: string
  ayuda: string
  resaltado?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={valor}
        onChange={e => onChange(e.target.value)}
        min={min}
        step={step}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
        style={{
          border: resaltado ? '1px solid #D97706' : '1px solid var(--color-borde)',
          color: 'var(--color-primario)',
          background: 'var(--color-superficie)',
        }}
      />
      <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-texto-secundario)' }}>{ayuda}</p>
    </div>
  )
}

interface CursoDatosFormProps {
  curso: Curso & { portadaUrl: string | null }
  /** Inscripciones activas: si hay, cambiar el ritmo mueve ventanas ya abiertas. */
  inscritosActivos?: number
  onChanged: (mensaje?: string) => void | Promise<void>
  onError: (mensaje: string) => void
}

/** Número → cadena para un <input>. NULL se pinta vacío, no '0'. */
const aTexto = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function CursoDatosForm({ curso, inscritosActivos = 0, onChanged, onError }: CursoDatosFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(curso.nombre)
  const [descripcion, setDescripcion] = useState(curso.descripcion ?? '')
  const [tipo, setTipo] = useState(curso.tipo)
  const [guardando, setGuardando] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  // ── B7/T3: los seis parámetros, como TEXTO ────────────────────────────────
  // Se guardan como string y no como number a propósito: con number, borrar el
  // campo obliga a representar el vacío como NaN o 0, y el 0 es un valor
  // legítimo distinto de «sin dato». En `duracion_meses` esa diferencia es
  // justo la que decide si el curso tiene tope de meses o no.
  const [precioInscripcion, setPrecioInscripcion] = useState(aTexto(curso.precio_inscripcion))
  const [precioMensualidad, setPrecioMensualidad] = useState(aTexto(curso.precio_mensualidad))
  const [horas, setHoras] = useState(aTexto(curso.horas))
  const [duracionMeses, setDuracionMeses] = useState(aTexto(curso.duracion_meses))
  const [modulosPorMes, setModulosPorMes] = useState(aTexto(curso.modulos_por_mes))
  const [intentos, setIntentos] = useState(aTexto(curso.intentos_permitidos))

  const hayCambios =
    nombre.trim() !== curso.nombre ||
    (descripcion.trim() || null) !== (curso.descripcion ?? null) ||
    tipo !== curso.tipo ||
    precioInscripcion !== aTexto(curso.precio_inscripcion) ||
    precioMensualidad !== aTexto(curso.precio_mensualidad) ||
    horas !== aTexto(curso.horas) ||
    duracionMeses !== aTexto(curso.duracion_meses) ||
    modulosPorMes !== aTexto(curso.modulos_por_mes) ||
    intentos !== aTexto(curso.intentos_permitidos)

  /** ¿El cambio pendiente mueve la ventana de quien ya está inscrito? */
  const tocaRitmo =
    modulosPorMes !== aTexto(curso.modulos_por_mes) ||
    duracionMeses !== aTexto(curso.duracion_meses)
  const avisaRetroactivo = tocaRitmo && inscritosActivos > 0

  // Sincronizar con el refetch del padre SOLO si no hay edición local sin
  // guardar (cada mutación en el editor re-crea el objeto curso, y un reset
  // incondicional borraría lo que el admin está escribiendo).
  useEffect(() => {
    if (!hayCambios) {
      setNombre(curso.nombre)
      setDescripcion(curso.descripcion ?? '')
      setTipo(curso.tipo)
      setPrecioInscripcion(aTexto(curso.precio_inscripcion))
      setPrecioMensualidad(aTexto(curso.precio_mensualidad))
      setHoras(aTexto(curso.horas))
      setDuracionMeses(aTexto(curso.duracion_meses))
      setModulosPorMes(aTexto(curso.modulos_por_mes))
      setIntentos(aTexto(curso.intentos_permitidos))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curso])

  async function guardarDatos(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      onError('El nombre no puede estar vacío')
      return
    }

    // Confirmación explícita antes de mover ventanas ya abiertas. No se
    // BLOQUEA —corregir el ritmo de un curso es legítimo— pero el admin tiene
    // que enterarse aquí y no por la llamada del alumno preguntando dónde
    // quedó su módulo.
    if (avisaRetroactivo) {
      const ok = window.confirm(
        `Este curso tiene ${inscritosActivos} inscripción${inscritosActivos !== 1 ? 'es' : ''} activa${inscritosActivos !== 1 ? 's' : ''}.\n\n` +
        'Cambiar los módulos por mes o la duración recalcula lo que ven TODOS ellos, ' +
        'incluidos los meses que ya pagaron: bajar el ritmo les oculta módulos que ya tenían abiertos, ' +
        'y subirlo les abre otros antes de tiempo.\n\n¿Guardar de todas formas?'
      )
      if (!ok) return
    }

    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/cursos/${curso.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo,
          precio_inscripcion:  precioInscripcion,
          precio_mensualidad:  precioMensualidad,
          horas,
          duracion_meses:      duracionMeses,
          modulos_por_mes:     modulosPorMes,
          intentos_permitidos: intentos,
        }),
      })
      const json = await res.json().catch(() => ({} as Partial<Curso> & { error?: string }))
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      // ⚠️ RE-SEMBRAR EL ESTADO CON LO QUE QUEDÓ GUARDADO. No es cosmética.
      //
      // El estado de estos campos es TEXTO y `hayCambios` lo compara contra
      // `aTexto(curso.X)`. El servidor normaliza —redondea precios a dos
      // decimales, '' → 0 en precios, '' → null en horas y duración— y Postgres
      // devuelve un número. Así que «1500.00» se guarda como 1500 y vuelve como
      // '1500': la comparación de cadenas YA NO VUELVE A COINCIDIR NUNCA.
      //
      // Sin esto, `hayCambios` se queda en true para siempre y el
      // `useEffect([curso])` —que solo re-sincroniza `if (!hayCambios)`— deja de
      // refrescar el formulario: si otro admin edita el curso, esta pestaña
      // muestra datos viejos, el botón sigue habilitado y un clic posterior
      // reenvía los valores locales pisando la edición ajena. Además
      // `tocaRitmo` quedaría encendido y el `confirm()` saltaría en cada
      // guardado. Lo disparan también '' → '0' y '06' → '6', no solo decimales.
      //
      // Se re-siembra desde la RESPUESTA del PATCH, que es la fila ya
      // normalizada: al llegar el refetch del padre, los textos ya coinciden.
      if (json.nombre !== undefined) setNombre(json.nombre)
      setDescripcion(json.descripcion ?? '')
      if (json.tipo) setTipo(json.tipo)
      setPrecioInscripcion(aTexto(json.precio_inscripcion))
      setPrecioMensualidad(aTexto(json.precio_mensualidad))
      setHoras(aTexto(json.horas))
      setDuracionMeses(aTexto(json.duracion_meses))
      setModulosPorMes(aTexto(json.modulos_por_mes))
      setIntentos(aTexto(json.intentos_permitidos))

      onChanged('Datos del curso guardados')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function onPortadaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const valid = validarPortada(file)
    if (!valid.ok) {
      onError(valid.error)
      e.target.value = ''
      return
    }
    setSubiendoPortada(true)
    try {
      // Subida directa a Storage (evita el límite de 4.5MB de Vercel)
      const resultado = await subirArchivoCursos(`/api/admin/cursos/${curso.id}/portada`, file)
      if (!resultado.ok) throw new Error(resultado.error)
      onChanged('Portada actualizada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al subir la portada')
    } finally {
      setSubiendoPortada(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function quitarPortada() {
    setSubiendoPortada(true)
    try {
      const res = await fetch(`/api/admin/cursos/${curso.id}/portada`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? 'Error al quitar la portada')
      }
      onChanged('Portada eliminada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al quitar la portada')
    } finally {
      setSubiendoPortada(false)
    }
  }

  const inputStyle = { border: '1px solid var(--color-borde)', color: 'var(--color-primario)', background: 'var(--color-superficie)' }

  return (
    <form
      onSubmit={guardarDatos}
      className="rounded-2xl p-6 space-y-5"
      style={{ background: 'var(--color-superficie)', border: '1px solid #E8F0F7', boxShadow: '0 2px 8px rgba(27,58,87,0.06)' }}
    >
      <h2 className="text-base font-bold" style={{ color: 'var(--color-primario)' }}>Datos del curso</h2>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="curso-nombre" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Nombre <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="curso-nombre"
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="curso-descripcion" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
              Descripción
            </label>
            <textarea
              id="curso-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-y"
              style={inputStyle}
            />
          </div>

          <div>
            <span className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>Tipo</span>
            <div className="flex gap-2">
              {(['curso', 'diplomado'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold capitalize"
                  style={tipo === t
                    ? { background: 'var(--color-acento)', color: 'var(--color-texto-sobre-acento)', border: '1px solid var(--color-acento)' }
                    : { background: 'var(--color-superficie)', color: 'var(--color-texto-secundario)', border: '1px solid var(--color-borde)' }}
                  aria-pressed={tipo === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Portada */}
        <div>
          <span className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-primario)' }}>
            Portada <span className="font-normal text-xs" style={{ color: 'var(--color-texto-secundario)' }}>(JPG/PNG/WebP · máx 5MB)</span>
          </span>
          <div className="relative rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, var(--color-primario) 0%, color-mix(in srgb, var(--color-primario) 78%, #000) 100%)' }}>
            {curso.portadaUrl && (
              <Image
                src={curso.portadaUrl}
                alt={`Portada de ${curso.nombre}`}
                fill
                sizes="280px"
                className="object-cover"
              />
            )}
            {!curso.portadaUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs" style={{ color: 'rgba(245,240,232,0.6)' }}>Sin portada</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoPortada}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-acento)', background: 'var(--color-superficie)' }}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {subiendoPortada ? 'Subiendo…' : curso.portadaUrl ? 'Reemplazar' : 'Subir portada'}
            </button>
            {curso.portadaUrl && (
              <button
                type="button"
                onClick={quitarPortada}
                disabled={subiendoPortada}
                className="flex items-center justify-center px-3 py-2 rounded-xl disabled:opacity-50"
                style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#EF4444', background: 'var(--color-superficie)' }}
                aria-label="Quitar portada"
                title="Quitar portada"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPortadaChange}
            className="hidden"
            aria-label="Archivo de portada"
          />
        </div>
      </div>

      {/* ── B7/T3: parámetros comerciales y de ritmo ──────────────────────────
          Cada campo lleva su ayuda en una línea. El admin es el dueño de la
          escuela, no un técnico: «modulos_por_mes» no le dice nada, «cuántos
          módulos se abren con cada mes pagado» sí. */}
      <div className="pt-2" style={{ borderTop: '1px solid #E8F0F7' }}>
        <h3 className="text-sm font-bold pt-4 mb-1" style={{ color: 'var(--color-primario)' }}>
          Precios y ritmo
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-texto-secundario)' }}>
          Con esto el diplomado queda listo para venderse y para liberar contenido solo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CampoNumero
            id="curso-precio-inscripcion" label="Inscripción (MXN)" valor={precioInscripcion} onChange={setPrecioInscripcion}
            min={0} step="0.01" ayuda="Cuota única al inscribirse. Deja 0 si no cobras inscripción."
          />
          <CampoNumero
            id="curso-precio-mensualidad" label="Mensualidad (MXN)" valor={precioMensualidad} onChange={setPrecioMensualidad}
            min={0} step="0.01" ayuda="Lo que paga cada mes. Es el monto que se propone al registrar el pago."
          />
          <CampoNumero
            id="curso-horas" label="Horas" valor={horas} onChange={setHoras}
            min={0} step="1" ayuda="Horas que declara el diplomado. Aparece en la constancia y en el catálogo."
          />
          <CampoNumero
            id="curso-modulos-por-mes" label="Módulos por mes" valor={modulosPorMes} onChange={setModulosPorMes}
            min={1} step="1" ayuda="Cuántos módulos se abren con cada mes pagado. Es el ritmo del curso."
            resaltado={avisaRetroactivo}
          />
          <CampoNumero
            id="curso-duracion-meses" label="Duración (meses)" valor={duracionMeses} onChange={setDuracionMeses}
            min={1} step="1" ayuda="Tope de meses que se pueden abrir. Vacío = sin tope: dura lo que dure el temario."
            resaltado={avisaRetroactivo}
          />
          <CampoNumero
            id="curso-intentos" label="Intentos del examen" valor={intentos} onChange={setIntentos}
            min={1} step="1" ayuda="Cuántas veces puede presentar el examen final cada alumno."
          />
        </div>

        {avisaRetroactivo && (
          <div className="mt-4 rounded-xl p-3.5 flex items-start gap-2.5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
              Este curso tiene <strong>{inscritosActivos} inscripción{inscritosActivos !== 1 ? 'es' : ''} activa{inscritosActivos !== 1 ? 's' : ''}</strong>.
              {' '}Cambiar los módulos por mes o la duración recalcula lo que ven todos ellos, incluidos los meses
              que ya pagaron: bajar el ritmo oculta módulos que ya tenían abiertos y subirlo abre otros antes de tiempo.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={guardando || !hayCambios || !nombre.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--color-acento)', color: 'var(--color-texto-sobre-acento)' }}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
