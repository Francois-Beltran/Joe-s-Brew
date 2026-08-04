import { useReveal } from '../hooks/useReveal'
import { useBranch } from '../context/BranchContext'
import CrossfadeImage from './CrossfadeImage'

export default function HeroSection() {
  const headingRef = useReveal(0,   0.1)
  const subRef     = useReveal(120, 0.1)
  const ctaRef     = useReveal(240, 0.1)
  const { branch } = useBranch()

  const scrollToMenu = () =>
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image — crossfades between the selected branch's photos */}
      <CrossfadeImage
        images={branch.images}
        alt=""
        className="w-full h-full object-cover"
      />

      {/* Dark gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/65 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto pt-24 pb-16">

        {/* Glassmorphism card */}
        <div
          className="px-8 py-10 md:px-14 md:py-14 rounded-3xl"
          style={{
            background:           'rgba(255,255,255,0.08)',
            backdropFilter:       'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border:               '1px solid rgba(255,255,255,0.18)',
            boxShadow:            '0 12px 48px rgba(0,0,0,0.35)',
          }}
        >
          <p
            key={branch.id}
            className="font-heading text-brew-beige/80 text-xs md:text-sm tracking-[0.3em] uppercase mb-3 transition-opacity duration-700"
            style={{ animation: 'fadeIn 0.7s ease-in-out' }}
          >
            {branch.emoji} {branch.label} Branch
          </p>

          <h1
            ref={headingRef}
            className="reveal font-heading text-6xl md:text-8xl text-brew-beige tracking-wider leading-none"
            style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}
          >
            JOE'S BREW
          </h1>

          <p
            ref={subRef}
            className="reveal font-body text-brew-beige/85 text-lg md:text-xl mt-4 tracking-widest uppercase"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            A cup of perfection to make your morning.
          </p>

          <div ref={ctaRef} className="reveal mt-8">
            <button
              onClick={scrollToMenu}
              className="magnetic-btn bg-brew-beige text-brew-dark font-heading tracking-widest px-10 py-4 rounded-full text-base hover:bg-white shadow-xl"
            >
              ORDER NOW
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brew-beige/50 pointer-events-none">
        <span className="font-heading text-[10px] tracking-[0.3em]">SCROLL</span>
        <div className="w-px h-10 bg-gradient-to-b from-brew-beige/50 to-transparent" />
      </div>
    </section>
  )
}
