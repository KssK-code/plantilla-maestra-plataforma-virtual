'use client'

import Image from 'next/image'
import { CONFIG } from '@/lib/config'

interface IVSLogoProps {
  size?: number
  innerFill?: string  // kept for API compatibility, unused
}

export function EdvexLogo({ size = 36 }: IVSLogoProps) {
  return (
    <Image
      src={CONFIG.logo}
      alt={CONFIG.nombreCompleto}
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 6 }}
    />
  )
}
