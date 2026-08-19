'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Render de los apuntes de una semana (`semanas.contenido`).
 *
 * Vive compartido A PROPÓSITO: lo usan la vista del ALUMNO y el preview del
 * EDITOR del admin. Si cada uno montara su propio ReactMarkdown, el preview
 * dejaría de ser lo que el alumno ve en cuanto alguien tocara un override en
 * uno de los dos — y esa equivalencia es justamente la promesa de la pantalla.
 */

/**
 * Normaliza los saltos de línea. Parte del seed guardó "\n" ESCAPADO (la barra
 * y la ene como dos caracteres) en vez de un salto real; sin esto, un apunte
 * entero se pinta como un solo párrafo. Se exporta aparte porque el alumno la
 * necesita también para contar palabras y estimar el tiempo de lectura.
 */
export function normalizarContenido(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
}

function ContenidoMarkdown({ texto }: { texto: string }) {
  if (!texto) return null

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-white prose-strong:font-semibold prose-p:text-slate-200 prose-li:text-slate-200 prose-ul:my-4 prose-ol:my-4 prose-a:text-cyan-400 prose-blockquote:border-cyan-500">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2" style={{ color: '#F1F5F9' }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2" style={{ color: '#F1F5F9' }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-1" style={{ color: '#F1F5F9' }}>{children}</h3>,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  )
}

// react-markdown no memoiza: sin esto, cada tecla en el editor re-parsea el
// Markdown de todas las vistas previas abiertas. La prop es un string plano,
// así que memo corta de forma fiable. El alumno también se beneficia.
export default memo(ContenidoMarkdown)
