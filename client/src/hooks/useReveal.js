import { useEffect, useRef } from 'react'

/**
 * Lightweight scroll-reveal via IntersectionObserver.
 * Adds the CSS class "in-view" once the element crosses the threshold.
 * Pair with the .reveal / .reveal.in-view CSS rules in index.css.
 *
 * @param {number} delay  — optional stagger delay in ms (applied via inline style)
 * @param {number} threshold — fraction of element that must be visible (0–1)
 */
export function useReveal(delay = 0, threshold = 0.15) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (delay) el.style.transitionDelay = `${delay}ms`

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          observer.unobserve(el) // fire once — no reverse flicker
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, threshold])

  return ref
}
