import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LINES = [
  { text: "Joe's Brew", sub: 'Est. 2024', start: '0%', end: '20%' },
  { text: 'Hand-Crafted Quality', sub: 'Every cup, every time.', start: '20%', end: '45%' },
  { text: 'Brewed With Soul', sub: 'From our hands to yours.', start: '45%', end: '70%' },
  { text: 'Order Now', sub: null, start: '70%', end: '100%', cta: true },
]

export default function HeroSection() {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const textRefs = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // --- Video parallax: moves up slower than scroll (background layer) ---
      gsap.to(videoRef.current, {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // --- Overlay darkens as user scrolls in ---
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0.3 },
        {
          opacity: 0.65,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '40% top',
            scrub: true,
          },
        }
      )

      // --- Each text panel: fade in, hold, fade out ---
      textRefs.current.forEach((el, i) => {
        if (!el) return
        const line = LINES[i]

        // Fade IN
        gsap.fromTo(
          el,
          { opacity: 0, y: 40, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: `${line.start} top`,
              end: `${parseFloat(line.start) + 8}% top`,
              scrub: 1,
            },
          }
        )

        // Fade OUT (except last panel)
        if (i < LINES.length - 1) {
          gsap.fromTo(
            el,
            { opacity: 1, y: 0, filter: 'blur(0px)' },
            {
              opacity: 0,
              y: -40,
              filter: 'blur(8px)',
              ease: 'power2.in',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: `${parseFloat(line.end) - 8}% top`,
                end: `${line.end} top`,
                scrub: 1,
              },
            }
          )
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    // 500vh gives ~5 scroll-screens of sticky content to play across
    <section ref={sectionRef} id="hero" style={{ height: '500vh' }} className="relative">

      {/* Sticky viewport container */}
      <div className="sticky top-0 w-full h-screen overflow-hidden">

        {/* --- Background video layer (parallax: moves at 0.8× scroll speed) --- */}
        <div
          ref={videoRef}
          className="absolute inset-0 w-full"
          style={{
            height: '120%',          // extra height to prevent letterboxing during parallax
            top: '-10%',
            willChange: 'transform', // promote to compositor layer
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            style={{ willChange: 'transform' }}
          >
            <source src="/video/coffee_main_backgound.mp4" type="video/mp4" />
          </video>
        </div>

        {/* --- Gradient overlay (darkens on scroll) --- */}
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-gradient-to-b from-brew-dark/50 via-brew-dark/40 to-brew-dark/80"
          style={{ willChange: 'opacity' }}
        />

        {/* --- Foreground text panels (sticky, swap in/out via GSAP) --- */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {LINES.map((line, i) => (
            <div
              key={i}
              ref={(el) => (textRefs.current[i] = el)}
              className="absolute text-center px-6"
              style={{ opacity: 0, willChange: 'transform, opacity, filter' }}
            >
              {/* Text mask gradient — top and bottom fade into video */}
              <div
                className="inline-block"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                }}
              >
                <h2
                  className="font-heading text-6xl md:text-8xl text-brew-beige tracking-wider leading-none"
                  style={{
                    textShadow: '0 4px 32px rgba(0,0,0,0.7), 0 1px 0 rgba(0,0,0,0.5)',
                  }}
                >
                  {line.text}
                </h2>

                {line.sub && (
                  <p
                    className="font-body text-xl md:text-2xl text-brew-beige/80 mt-3 tracking-widest uppercase"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
                  >
                    {line.sub}
                  </p>
                )}
              </div>

              {line.cta && (
                <button
                  onClick={scrollToMenu}
                  className="pointer-events-auto mt-8 bg-brew-beige text-brew-dark font-heading tracking-widest px-10 py-4 rounded-full text-lg hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-2xl"
                >
                  ORDER NOW
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Scroll indicator — visible only at very top */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brew-beige/50">
          <p className="font-heading text-xs tracking-widest">SCROLL</p>
          <div className="w-px h-10 bg-gradient-to-b from-brew-beige/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}
