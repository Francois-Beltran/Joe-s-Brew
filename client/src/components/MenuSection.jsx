import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { supabase } from '../lib/supabaseClient'
import MenuCard from './MenuCard'
import FruitBlendCard from './FruitBlendCard'
import { useBranch } from '../context/BranchContext'

gsap.registerPlugin(ScrollTrigger)

// Categories that get horizontal swipe on mobile
const SWIPE_CATEGORIES = [
  'Hot Brew', 'Cold Brew', 'Barista Signature', 'Frappe',
  'Milk Tea', 'Fruit Blend', 'Coffee', 'Non-Coffee', 'Takoyaki', 'Waffles', 'Nachos', 'Fries', 'Food'
]

// Local image overrides for Fruit Blend items (keyed by lowercase keyword in item name)
const FRUIT_BLEND_IMAGES = {
  wintermelon:    '/images/wintermelon_fruitblend.JPEG',
  blueberry:      '/images/blueberry_fruitblend.JPEG',
  'four seasons': '/images/four_seasons_fruitblend.JPEG',
  mango:          '/images/mango_fruitblend.JPEG',
  lychee:         '/images/lychee_fruitblend.JPEG',
}

function getFruitBlendImage(name) {
  const lower = name.toLowerCase()
  for (const [key, path] of Object.entries(FRUIT_BLEND_IMAGES)) {
    if (lower.includes(key)) return path
  }
  return null
}

function SwipeRow({ items, categoryName }) {
  const scrollRef = useRef(null)

  return (
    <div className="mb-10">
      <h3 className="font-heading text-2xl text-brew-brown mb-4 px-4 md:px-0 tracking-wide">
        {categoryName.toUpperCase()}
      </h3>

      {/* Mobile: horizontal swipe */}
      <div
        ref={scrollRef}
        className="flex md:hidden gap-4 overflow-x-auto pb-3 px-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map(item => (
          <div key={item.id} className="menu-card shrink-0 w-64 snap-start">
            <MenuCard item={item} />
          </div>
        ))}
      </div>

      {/* Desktop: normal grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => (
          <div key={item.id} className="menu-card">
            <MenuCard item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}

function GridSection({ items, categoryName }) {
  return (
    <div className="mb-10">
      <h3 className="font-heading text-2xl text-brew-brown mb-4 tracking-wide">
        {categoryName.toUpperCase()}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => (
          <div key={item.id} className="menu-card">
            <MenuCard item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MenuSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  // Per-branch availability overrides: { [menu_item_id]: boolean }
  const [branchAvail, setBranchAvail] = useState({})
  const sectionRef = useRef(null)
  const { branch } = useBranch()

  // Fetch all menu items once
  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
      if (!error) setItems(data ?? [])
      setLoading(false)
    }
    fetchMenu()
  }, [])

  // Fetch branch-scoped availability overrides whenever the branch changes
  useEffect(() => {
    if (branch.comingSoon) {
      setBranchAvail({})
      return
    }
    async function fetchBranchAvail() {
      const { data } = await supabase
        .from('branch_menu_availability')
        .select('menu_item_id, is_available')
        .eq('branch_id', branch.id)
      setBranchAvail(
        Object.fromEntries((data ?? []).map(r => [r.menu_item_id, r.is_available]))
      )
    }
    fetchBranchAvail()
  }, [branch.id, branch.comingSoon])

  // Merge branch overrides into items — branch row wins over global is_available
  const effectiveItems = items.map(item => ({
    ...item,
    is_available: item.id in branchAvail ? branchAvail[item.id] : item.is_available,
  }))

  useEffect(() => {
    if (!loading) {
      const cards = sectionRef.current?.querySelectorAll('.menu-card')
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.07,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
            },
          }
        )
      }
    }
  }, [loading])

  const CATEGORY_ORDER = [
    'Hot Brew', 'Cold Brew', 'Barista Signature', 'Frappe',
    'Milk Tea', 'Fruit Blend', 'Coffee', 'Non-Coffee', 'Takoyaki', 'Waffles', 'Nachos', 'Fries', 'Food'
  ]

  const grouped = effectiveItems.reduce((acc, item) => {
    if (item.category === 'Add-ons') return acc
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <section id="menu" ref={sectionRef} className="bg-brew-beige py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-body text-brew-brown/60 tracking-widest text-sm uppercase mb-2">
            What we're serving
          </p>
          <h2 className="font-heading text-5xl md:text-6xl text-brew-brown">OUR MENU</h2>
          <p className="font-body text-brew-brown/50 text-sm mt-2">
            {branch.emoji} {branch.label} Branch
            {branch.comingSoon && <span className="ml-2 text-amber-600 font-semibold">· Coming Soon</span>}
            {!branch.delivery && !branch.comingSoon && <span className="ml-2 text-brew-brown/40">· Pickup Only</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 font-heading text-3xl text-brew-brown/40 tracking-widest">
            BREWING...
          </div>
        ) : branch.comingSoon ? (
          /* ── Loboc: Coming Soon overlay ──────────────────────────── */
          <div className="relative rounded-3xl overflow-hidden min-h-[420px]">
            <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {items.slice(0, 8).map(item => (
                  <div key={item.id} className="bg-brew-light rounded-2xl h-64" />
                ))}
              </div>
            </div>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6"
              style={{ background: 'rgba(245,236,215,0.55)', backdropFilter: 'blur(2px)' }}
            >
              <span className="text-6xl">{branch.emoji}</span>
              <h3 className="font-heading text-4xl text-brew-brown tracking-wide">
                {branch.label} Branch
              </h3>
              <p className="font-body text-brew-brown/70 text-lg">
                We're brewing something special here.
              </p>
              <p className="font-heading text-brew-brown text-2xl tracking-widest">
                COMING SOON...
              </p>
              <p className="font-body text-brew-brown/50 text-sm max-w-sm">
                Online ordering for the Loboc branch is not yet available.
                Please visit us in person or select a different branch above.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {sortedCategories.map(category => {
              const categoryItems = grouped[category]

              if (category === 'Frappe') {
                const coffeeBase = categoryItems.filter(i => i.subcategory === 'Coffee Base')
                const creamBase = categoryItems.filter(i => i.subcategory === 'Cream Base')
                const other = categoryItems.filter(i => !i.subcategory)
                return (
                  <div key={category}>
                    {coffeeBase.length > 0 && <SwipeRow categoryName="Frappe — Coffee Base" items={coffeeBase} />}
                    {creamBase.length > 0 && <SwipeRow categoryName="Frappe — Cream Base" items={creamBase} />}
                    {other.length > 0 && <SwipeRow categoryName="Frappe" items={other} />}
                  </div>
                )
              }

              if (category === 'Milk Tea') {
                return (
                  <div key={category}>
                    <SwipeRow categoryName={category} items={categoryItems} />
                  </div>
                )
              }

              if (category === 'Fruit Blend') {
                // Filter out Peach and apply local image overrides
                const fruitBlendItems = categoryItems
                  .filter(item => !item.name.toLowerCase().includes('peach'))
                  .map(item => {
                    const localImg = getFruitBlendImage(item.name)
                    return localImg ? { ...item, image_url: localImg } : item
                  })

                if (fruitBlendItems.length === 0) return null

                return (
                  <div key={category} className="mb-10">
                    <h3 className="font-heading text-2xl text-brew-brown mb-4 px-4 md:px-0 tracking-wide">
                      FRUIT BLEND
                    </h3>
                    {/* Mobile: horizontal swipe */}
                    <div
                      className="flex md:hidden gap-4 overflow-x-auto pb-3 px-4 snap-x snap-mandatory scrollbar-hide"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {fruitBlendItems.map(item => (
                        <div key={item.id} className="menu-card shrink-0 w-64 snap-start">
                          <FruitBlendCard item={item} />
                        </div>
                      ))}
                    </div>
                    {/* Desktop: grid */}
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {fruitBlendItems.map(item => (
                        <div key={item.id} className="menu-card">
                          <FruitBlendCard item={item} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              return SWIPE_CATEGORIES.includes(category) ? (
                <SwipeRow key={category} categoryName={category} items={categoryItems} />
              ) : (
                <GridSection key={category} categoryName={category} items={categoryItems} />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
