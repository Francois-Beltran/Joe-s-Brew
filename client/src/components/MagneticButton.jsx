import { useRef, useCallback } from 'react'

/**
 * Wraps any button with a magnetic hover effect.
 * The button drifts up to `strength` px toward the cursor,
 * then snaps back on mouse-leave — all via transform: translate3d,
 * so there is zero layout thrashing.
 */
export default function MagneticButton({ children, strength = 0.35, className = '', style = {}, ...props }) {
  const btnRef = useRef(null)
  const rafRef = useRef(null)

  const onMouseMove = useCallback((e) => {
    const el   = btnRef.current
    if (!el) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const rect   = el.getBoundingClientRect()
      const cx     = rect.left + rect.width  / 2
      const cy     = rect.top  + rect.height / 2
      const dx     = (e.clientX - cx) * strength
      const dy     = (e.clientY - cy) * strength
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(1.04)`
    })
  }, [strength])

  const onMouseLeave = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    cancelAnimationFrame(rafRef.current)
    el.style.transform = 'translate3d(0,0,0) scale(1)'
  }, [])

  return (
    <button
      ref={btnRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{
        transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.35s ease',
        willChange: 'transform',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
