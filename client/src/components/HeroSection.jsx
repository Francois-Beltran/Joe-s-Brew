import { useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Three sticky panels across the 500vh scroll space
// Panel positions are expressed as scroll-progress fractions (0–1)
const PANELS = [
  {
    id: 'p1',
    title: "Joe's Brew",
    sub: 'Est. 1939',
    inAt: 0,
    holdFrom: 0.08,
    holdTo: 0.30,
    outAt: 0.38,
  },
  {
    id: 'p2',
    title: 'Our Branches',
    sub: 'Candijay Branch · Loboc Branch · Cogtong Branch',
    inAt: 0.40,
    holdFrom: 0.48,
    holdTo: 0.72,
    outAt: 0.80,
  },
  {
    id: 'cta',
    cta: true,
    inAt: 0.84,
    holdFrom: 0.90,
    holdTo: 1.00,
    outAt: 1.00,
  },
]

export default function HeroSection() {
  const sectionRef    = useRef(null)
  const stickyRef     = useRef(null)
  const videoRef      = useRef(null)
  const videoWrapRef  = useRef(null)
  const overlayRef    = useRef(null)
  const panelRefs     = useRef([])

  // RAF state — all mutable refs so RAF never causes re-renders
  const rafIdRef      = useRef(null)
  const isSeekingRef  = useRef(false)
  const progressRef   = useRef(0)   // 0–1 scroll progress within the hero

  // ─── Scroll → progress ───────────────────────────────────────────────────
  const readProgress = useCallback(() => {
    const section = sectionRef.current
    if (!section) return 0
    const top      = section.getBoundingClientRect().top + window.scrollY
    const scrollH  = section.scrollHeight - window.innerHeight
    return scrollH > 0 ? Math.max(0, Math.min(1, (window.scrollY - top) / scrollH)) : 0
  }, [])

  // ─── RAF loop ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video    = videoRef.current
    const wrapEl   = videoWrapRef.current
    const overlayEl = overlayRef.current
    const p        = progressRef.current

    // 1. Video scrubbing — only seek when delta ≥ 1 frame (~33ms at 30fps)
    if (video && video.readyState >= 1 && video.duration && !isSeekingRef.current) {
      const target  = p * video.duration
      const current = video.currentTime
      if (Math.abs(current - target) > 0.033) {
        isSeekingRef.current = true
        video.currentTime = target
      }
    }

    // 2. Depth-of-field blur: 0px → 5px as user scrolls in
    if (wrapEl) {
      const blur = p * 5
      wrapEl.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : ''
    }

    // 3. Overlay alpha: darkens slightly as scroll progresses
    if (overlayEl) {
      const alpha = 0.38 + p * 0.28   // 0.38 → 0.66
      overlayEl.style.background =
        `linear-gradient(to bottom, rgba(0,0,0,${(alpha * 0.7).toFixed(2)}) 0%, rgba(0,0,0,${alpha.toFixed(2)}) 60%, rgba(0,0,0,${(alpha * 1.2).toFixed(2)}) 100%)`
    }

    // 4. Text panels — read-only opacity/transform updates via inline style
    //    (GSAP handles these via its own rAF; this block is intentionally left
    //    empty — panel animations are driven by GSAP ScrollTrigger below)

    rafIdRef.current = requestAnimationFrame(tick)
  }, [])

  // ─── Scroll handler ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => { progressRef.current = readProgress() }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // seed initial value

    // Start RAF loop
    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafIdRef.current)
    }
  }, [readProgress, tick])

  // ─── Video seeked callback ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onSeeked  = () => { isSeekingRef.current = false }
    const onError   = () => { isSeekingRef.current = false }
    video.addEventListener('seeked',  onSeeked)
    video.addEventListener('error',   onError)
    return () => {
      video.removeEventListener('seeked',  onSeeked)
      video.removeEventListener('error',   onError)
    }
  }, [])

  // ─── GSAP: sticky panel fade-in / fade-out ────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      PANELS.forEach((panel, i) => {
        const el = panelRefs.current[i]
        if (!el) return

        // Scroll positions within the 500vh section expressed as percentages
        const inPct       = panel.inAt       * 100
        const holdFromPct = panel.holdFrom   * 100
        const holdToPct   = panel.holdTo     * 100
        const outPct      = panel.outAt      * 100

        // Fade / rise IN
        gsap.fromTo(el,
          { opacity: 0, y: 50, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: `${inPct}% top`,
              end:   `${holdFromPct}% top`,
              scrub: 1.2,
            },
          }
        )

        // Fade / rise OUT (skip last panel)
        if (i < PANELS.length - 1) {
          gsap.fromTo(el,
            { opacity: 1, y: 0, filter: 'blur(0px)' },
            {
              opacity: 0, y: -50, filter: 'blur(10px)',
              ease: 'power2.in',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: `${holdToPct}% top`,
                end:   `${outPct}% top`,
                scrub: 1.2,
              },
            }
          )
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const scrollToMenu = () =>
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })

  return (
    // 500vh → ~4 scroll-screen lengths for the sticky section to play across
    <section ref={sectionRef} id="hero" className="relative" style={{ height: '500vh' }}>

      {/* ── Sticky viewport ────────────────────────────────────────────── */}
      <div ref={stickyRef} className="sticky top-0 w-full h-screen overflow-hidden">

        {/* ── Video layer ────────────────────────────────────────────────
             - NO autoPlay / loop — currentTime driven purely by scroll
             - willChange: filter tells GPU to pre-composite this layer     */}
        <div
          ref={videoWrapRef}
          className="absolute inset-0"
          style={{ willChange: 'filter', transform: 'translate3d(0,0,0)' }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            disableRemotePlayback
            className="w-full h-full object-cover"
            style={{ transform: 'translate3d(0,0,0)', willChange: 'filter' }}
          >
            <source src="/video/coffee_main_backgound.mp4" type="video/mp4" />
          </video>
        </div>

        {/* ── Dark gradient overlay (alpha driven by JS in RAF loop) ──── */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.27) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.50) 100%)',
          }}
        />

        {/* ── Text panels ────────────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center">
          {PANELS.map((panel, i) => (
            <div
              key={panel.id}
              ref={(el) => (panelRefs.current[i] = el)}
              className="absolute text-center px-6 max-w-3xl w-full"
              style={{ opacity: 0, willChange: 'transform, opacity, filter' }}
            >
              {panel.cta ? (
                /* ── CTA panel ─────────────────────────────────── */
                <div className="flex flex-col items-center gap-6">
                  <h2
                    className="font-heading text-5xl md:text-7xl text-brew-beige tracking-wider"
                    style={{ textShadow: '0 4px 24px rgba(0,0,0,0.7)' }}
                  >
                    Order Now
                  </h2>
                  <button
                    onClick={scrollToMenu}
                    className="magnetic-btn bg-brew-beige text-brew-dark font-heading tracking-widest px-12 py-4 rounded-full text-lg shadow-2xl hover:bg-white"
                  >
                    VIEW MENU
                  </button>
                </div>
              ) : (
                /* ── Story panel ────────────────────────────────── */
                <>
                  {/* Glassmorphism card behind text */}
                  <div
                    className="inline-block px-10 py-8 rounded-3xl"
                    style={{
                      background:    'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    <h2
                      className="font-heading text-5xl md:text-8xl text-brew-beige tracking-wider leading-none"
                      style={{ textShadow: '0 4px 32px rgba(0,0,0,0.6)' }}
                    >
                      {panel.title}
                    </h2>
                    {panel.sub && (
                      <p
                        className="font-body text-base md:text-xl text-brew-beige/85 mt-4 tracking-widest uppercase"
                        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
                      >
                        {panel.sub}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Scroll indicator ─────────────────────────────────────────── */}
        <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brew-beige/50 pointer-events-none">
          <span className="font-heading text-[10px] tracking-[0.3em]">SCROLL</span>
          <div className="w-px h-10 bg-gradient-to-b from-brew-beige/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}
