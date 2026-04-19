'use client'

import { useEffect, useState } from 'react'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'none'
  className?: string
}

export default function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: FadeInProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const initial: Record<string, string> = {
    up:   'opacity-0 translate-y-4',
    down: 'opacity-0 -translate-y-4',
    left: 'opacity-0 translate-x-4',
    none: 'opacity-0',
  }

  return (
    <div
      className={[
        'transition-all duration-[400ms] ease-out',
        visible ? 'opacity-100 translate-y-0 translate-x-0' : initial[direction],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
