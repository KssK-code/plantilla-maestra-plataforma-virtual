import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte un color hex (#RRGGBB o #RGB) a rgba con opacidad.
 * Útil para generar fondos sutiles, sombras y overlays a partir de
 * los colores definidos en CONFIG.colores.
 *
 * @example withAlpha('#1B2A6B', 0.1) → 'rgba(27, 42, 107, 0.1)'
 * @example withAlpha(CONFIG.colores.primario, 0.05)
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`

  // Limpiar el hex: quitar # y normalizar a 6 chars
  let cleaned = hex.replace('#', '').trim()

  // Soportar formato #RGB → expandir a #RRGGBB
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('')
  }

  if (cleaned.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`
  }

  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)

  // Clamp alpha entre 0 y 1
  const a = Math.max(0, Math.min(1, alpha))

  return `rgba(${r}, ${g}, ${b}, ${a})`
}
