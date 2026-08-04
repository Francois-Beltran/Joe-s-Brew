import { useReveal } from '../hooks/useReveal'
import { useBranch, BRANCHES as BRANCH_DATA } from '../context/BranchContext'
import CrossfadeImage from './CrossfadeImage'

const BRANCHES = [
  {
    id: 'candijay',
    name: 'Candijay Branch',
    tag: 'Main Branch',
    description: 'Our flagship location — the heart of Joe\'s Brew where it all started.',
    icon: '☕',
  },
  {
    id: 'loboc',
    name: 'Loboc Branch',
    tag: 'By the River',
    description: 'Enjoy your brew with a serene riverside view. Perfect for a quiet afternoon.',
    icon: '🌿',
  },
  {
    id: 'cogtong',
    name: 'Cogtong Branch',
    tag: 'Newest Location',
    description: 'Our latest addition, bringing the Joe\'s Brew experience closer to you.',
    icon: '✨',
  },
]

export default function BranchesSection() {
  const { branch } = useBranch()
  const headingRef = useReveal(0,   0.2)
  const imgRef     = useReveal(100, 0.1)
  const c0Ref      = useReveal(0,   0.15)
  const c1Ref      = useReveal(120, 0.15)
  const c2Ref      = useReveal(240, 0.15)
  const cardRefs   = [c0Ref, c1Ref, c2Ref]

  return (
    <section id="branches" className="py-24 px-6 bg-brew-light">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div ref={headingRef} className="reveal text-center mb-14">
          <p className="font-heading text-brew-brown/50 text-sm tracking-[0.3em] uppercase mb-2">
            Find Us
          </p>
          <h2 className="font-heading text-5xl md:text-6xl text-brew-brown tracking-wide">
            OUR BRANCHES
          </h2>
          <div className="w-16 h-0.5 bg-brew-brown/30 mx-auto mt-4" />
        </div>

        {/* Full-width photo strip — crossfades through the selected branch's photos */}
        <div
          ref={imgRef}
          className="reveal relative rounded-3xl overflow-hidden mb-14 shadow-2xl"
          style={{ aspectRatio: '21/8' }}
        >
          <CrossfadeImage
            images={branch.images}
            alt={`${branch.label} branch interior`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brew-dark/60 via-transparent to-transparent" />
          <p
            key={branch.id}
            className="absolute bottom-6 left-0 right-0 text-center font-body text-brew-beige/90 text-base md:text-lg tracking-wide italic transition-opacity duration-700"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)', animation: 'fadeIn 0.7s ease-in-out' }}
          >
            Now viewing: {branch.emoji} {branch.label} Branch
          </p>
        </div>

        {/* Branch cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BRANCHES.map((card, i) => {
            const data = BRANCH_DATA[card.id]
            const isActive = branch.id === card.id
            return (
              <div
                key={card.id}
                ref={cardRefs[i]}
                className="reveal rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all duration-500"
                style={{
                  background:           'rgba(245, 236, 215, 0.65)',
                  backdropFilter:       'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border:               isActive ? '1px solid rgba(74,37,17,0.45)' : '1px solid rgba(74,37,17,0.1)',
                  boxShadow:            isActive ? '0 8px 32px rgba(74,37,17,0.18)' : '0 4px 24px rgba(74,37,17,0.08)',
                  transform:            isActive ? 'translateY(-4px)' : 'none',
                }}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/10' }}>
                  <CrossfadeImage images={data?.images ?? []} alt={card.name} className="w-full h-full object-cover" />
                  {isActive && (
                    <span className="absolute top-3 right-3 bg-brew-brown/90 text-brew-beige text-[10px] font-heading tracking-widest uppercase px-2.5 py-1 rounded-full">
                      Viewing
                    </span>
                  )}
                </div>
                <div className="p-8 flex flex-col gap-3">
                  <span className="text-3xl">{card.icon}</span>
                  <div>
                    <p className="font-heading text-xs text-brew-brown/50 tracking-[0.25em] uppercase mb-1">
                      {card.tag}
                    </p>
                    <h3 className="font-heading text-2xl text-brew-brown">{card.name}</h3>
                  </div>
                  <p className="font-body text-sm text-brew-brown/70 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
