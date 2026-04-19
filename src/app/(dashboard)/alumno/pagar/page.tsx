'use client'

import { CONFIG } from '@/lib/config'

export default function PagarPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Pagos y Acceso
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
          Para desbloquear módulos o realizar pagos, contacta a tu asesor.
        </p>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
        <p className="text-gray-700">Para desbloquear el siguiente módulo contacta a tu asesor</p>
        <a
          href={`https://wa.me/${CONFIG.whatsapp}`}
          className="mt-2 inline-block bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          {`💬 WhatsApp ${CONFIG.whatsappDisplay}`}
        </a>
      </div>
    </div>
  )
}
