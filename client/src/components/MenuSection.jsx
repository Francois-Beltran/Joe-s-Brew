import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { supabase } from '../lib/supabaseClient'
import MenuCard from './MenuCard'
import AddonCard from './AddonCard'

gsap.registerPlugin(ScrollTrigger)

// Categories that get horizontal swipe on mobile
// Desktop always shows grid
const SWIPE_CATEGORIES = [
  'Hot Brew', 'Cold Brew', 'Barista Signature', 'Frappe',
  'Milk Tea', 'Fruity Seltzer', 'Coffee', 'Non-Coffee',
  'Takoyaki', 'Waffles', 'Nachos', 'Fries', 'Food', 'Add-ons'
]

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
          <div
            key={item.id}
            className="menu-card shrink-0 w-64 snap-start"
          >
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

function AddonRow({ items, categoryName }) {
  return (
    <div className="mb-10">
      <h3 className="font-heading text-2xl text-brew-brown mb-2 px-4 md:px-0 tracking-wide">
        {categoryName.toUpperCase()}
      </h3>
      <p className="font-body text-xs text-brew-brown/50 mb-4 px-4 md:px-0">
        Tap to add to your order
      </p>
      {/* Mobile swipe */}
      <div
        className="flex md:hidden gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map(item => (
          <div key={item.id} className="snap-start">
            <AddonCard item={item} />
          </div>
        ))}
      </div>
      {/* Desktop wrap */}
      <div className="hidden md:flex flex-wrap gap-3">
        {items.map(item => (
          <AddonCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
export default function MenuSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef(null)

  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category')

      if (!error) setItems(data ?? [])
      setLoading(false)
    }
    fetchMenu()
  }, [])

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

  // Group items by category, preserving a sensible order
  const CATEGORY_ORDER = [
    'Hot Brew',
    'Cold Brew',
    'Barista Signature',
    'Frappe',
    'Milk Tea',
    'Fruity Seltzer',
    'Coffee',
    'Non-Coffee',
    'Takoyaki',
    'Waffles',
    'Nachos',
    'Fries',
    'Food',
    'Add-ons',
  ]

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  // Sort categories by preferred order, unknown ones go at the end
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
        </div>

        {loading ? (
          <div className="text-center py-20 font-heading text-3xl text-brew-brown/40 tracking-widest">
            BREWING...
          </div>
        ) : (
          <div>
            {sortedCategories.map(category => {
              const categoryItems = grouped[category];

              // 1. Handle Add-ons specifically
              if (category === 'Add-ons') {
                return <AddonRow key={category} items={categoryItems} categoryName={category} />;
              }

              // 2. Handle everything else
              const isSwipeCategory = SWIPE_CATEGORIES.includes(category);
              return isSwipeCategory ? (
                <SwipeRow key={category} items={categoryItems} categoryName={category} />
              ) : (
                <GridSection key={category} items={categoryItems} categoryName={category} />
              );
            })}
          </div>
        )}
      </div>
    </section>
  )
}