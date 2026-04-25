'use client'
import dynamic from 'next/dynamic'

const EvaluacionClient = dynamic(
  () => import('./EvaluacionClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Cargando examen...</p>
      </div>
    ),
  }
)

export default function EvaluacionPage({ params }: { params: { id: string } }) {
  return <EvaluacionClient id={params.id} />
}
