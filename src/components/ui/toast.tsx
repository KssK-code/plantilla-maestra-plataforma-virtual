'use client'

import { useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface SingleToastProps {
  item: ToastItem
  onClose: (id: number) => void
}

function SingleToast({ item, onClose }: SingleToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(item.id), item.duration)
    return () => clearTimeout(timer)
  }, [item.id, item.duration, onClose])

  const config = {
    success: { border: 'rgba(16,185,129,0.4)', color: '#10B981', Icon: CheckCircle },
    error: { border: 'rgba(239,68,68,0.4)', color: '#EF4444', Icon: XCircle },
    info: { border: 'rgba(91,108,255,0.4)', color: '#7B8AFF', Icon: Info },
  }[item.type]

  const Icon = config.Icon

  return (
    <div
      className="toast-slide-in flex items-start gap-3 px-4 py-3 rounded-xl w-full max-w-xs"
      style={{
        background: '#1E2130',
        border: `1px solid ${config.border}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
      <p className="flex-1 text-sm leading-snug" style={{ color: '#F1F5F9' }}>{item.message}</p>
      <button
        onClick={() => onClose(item.id)}
        className="flex-shrink-0 p-0.5 rounded transition-colors mt-0.5"
        style={{ color: '#475569' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onClose: (id: number) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '320px', width: 'calc(100vw - 2rem)' }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <SingleToast item={t} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

let _nextId = 1

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'success',
    duration = 4000
  ) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}
