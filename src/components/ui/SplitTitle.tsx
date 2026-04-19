'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

interface SplitTitleProps {
  text: string
  className?: string
  style?: React.CSSProperties
}

export default function SplitTitle({ text, className, style }: SplitTitleProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const words = text.split(' ')

  useGSAP(() => {
    if (!containerRef.current) return
    const wordSpans = containerRef.current.querySelectorAll('.split-word')
    gsap.from(wordSpans, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
    })
  }, { scope: containerRef, dependencies: [text] })

  return (
    <span ref={containerRef} className={className} style={{ display: 'block', ...style }}>
      {words.map((word, i) => (
        <span
          key={i}
          className="split-word inline-block"
          style={{ marginRight: i < words.length - 1 ? '0.3em' : 0 }}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
