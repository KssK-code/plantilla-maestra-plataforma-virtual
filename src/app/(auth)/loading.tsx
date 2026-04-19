import { Loader2 } from 'lucide-react'

export default function AuthLoading() {
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0B0D11 0%, #0F1628 50%, #1E2A5E 100%)' }}
    >
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#5B6CFF' }} />
    </div>
  )
}
