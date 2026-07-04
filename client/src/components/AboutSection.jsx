import { useReveal } from '../hooks/useReveal'

export default function AboutSection({ onOpenBugReporter }) {
  const imgRef     = useReveal(0,   0.1)
  const badgeRef   = useReveal(0,   0.2)
  const headRef    = useReveal(80,  0.2)
  const bodyRef    = useReveal(160, 0.2)
  const missionRef = useReveal(240, 0.2)
  const ctaRef     = useReveal(320, 0.2)

  return (
    <section id="about" className="py-24 px-6 bg-brew-brown overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Two-column layout — image left, text right on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Photo */}
          <div
            ref={imgRef}
            className="reveal relative rounded-3xl overflow-hidden shadow-2xl"
            style={{ aspectRatio: '4/3' }}
          >
            <img
              src="/images/web-background-3.jpg"
              alt="Customer enjoying Joe's Brew"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brew-dark/50 via-transparent to-transparent" />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <p
              ref={badgeRef}
              className="reveal font-heading text-brew-beige/40 text-sm tracking-[0.3em] uppercase"
            >
              Est. 1939 · Our Story
            </p>

            <h2
              ref={headRef}
              className="reveal font-heading text-5xl md:text-6xl text-brew-beige tracking-wide leading-tight"
            >
              BREWED FOR<br />THE COMMUNITY
            </h2>

            <p
              ref={bodyRef}
              className="reveal font-body text-brew-beige/75 text-base leading-relaxed"
            >
              Joe's Brew has been a cornerstone of Bohol for decades — serving
              hand-crafted drinks with honest ingredients and a whole lot of soul.
              We believe a great cup doesn't need to be complicated. Just the right
              beans, the right roast, and people who care.
            </p>

            {/* Mission callout — glassmorphism card */}
            <div
              ref={missionRef}
              className="reveal rounded-2xl px-6 py-5"
              style={{
                background:           'rgba(255,255,255,0.07)',
                backdropFilter:       'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border:               '1px solid rgba(213,188,158,0.2)',
              }}
            >
              <p className="font-heading text-brew-beige text-sm tracking-widest uppercase mb-2">
                🛠️ Platform Mission
              </p>
              <p className="font-body text-brew-beige/70 text-sm leading-relaxed">
                This web platform exists for <strong className="text-brew-beige/95 font-semibold">your convenience</strong> —
                browse our full menu, place your order, and pay from anywhere, no queue needed.
                We're always improving. If you spot a bug or have a suggestion, we genuinely
                want to hear it.
              </p>
            </div>

            {/* Bug report CTA */}
            <div ref={ctaRef} className="reveal flex flex-wrap gap-3 mt-2">
              <button
                onClick={onOpenBugReporter}
                className="magnetic-btn font-heading tracking-widest text-sm px-7 py-3 rounded-full bg-brew-beige text-brew-dark hover:bg-white shadow-lg"
              >
                🐛 REPORT A BUG
              </button>
              <button
                onClick={onOpenBugReporter}
                className="magnetic-btn font-heading tracking-widest text-sm px-7 py-3 rounded-full border border-brew-beige/30 text-brew-beige hover:border-brew-beige/70 transition-colors"
              >
                💡 SUGGEST A FEATURE
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
