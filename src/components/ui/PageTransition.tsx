'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!ref.current) return
    gsap.from(ref.current, {
      opacity: 0,
      y: 12,
      duration: 0.35,
      ease: 'power2.out',
    })
  }, { scope: ref })

  return <div ref={ref}>{children}</div>
}
