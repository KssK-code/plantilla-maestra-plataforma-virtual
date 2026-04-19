import { Loader2 } from 'lucide-react'

export default function AdminLoading() {
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: '#0B0D11' }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5B6CFF' }} />
        <p className="text-xs" style={{ color: '#475569' }}>Cargando...</p>
      </div>
    </div>
  )
}
