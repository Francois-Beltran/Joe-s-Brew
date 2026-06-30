import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { supabase } from '../lib/supabaseClient'
import MenuCard from './MenuCard'

gsap.registerPlugin(ScrollTrigger)

/**
 * Menu section component displaying available menu items
 * Fetches items from Supabase, supports category filtering, and animates cards on scroll
 * 
 * @returns {JSX.Element} Menu section UI
 */
export default function MenuSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const sectionRef = useRef(null)

  /**
   * Fetches available menu items from Supabase
   */
  useEffect(() => {
    async function fetchMenu() {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('category')

        if (!error) setItems(data)
      } catch (error) {
        // Handle error silently or show toast notification
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(
        '.menu-card',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      )
    }
  }, [loading, category])

  const categories = ['All', ...new Set(items.map(i => i.category).filter(Boolean))]
  const filtered   = category === 'All' ? items : items.filter(i => i.category === category)

  return (
    <section id="menu" ref={sectionRef} className="bg-brew-beige py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-body text-brew-brown/60 tracking-widest text-sm uppercase mb-2">
            What we're serving
          </p>
          <h2 className="font-heading text-6xl text-brew-brown">OUR MENU</h2>
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`font-heading tracking-wider px-6 py-2 rounded-full border-2 transition-all ${
                  category === cat
                    ? 'bg-brew-brown text-brew-beige border-brew-brown'
                    : 'text-brew-brown border-brew-brown/40 hover:border-brew-brown'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 font-heading text-3xl text-brew-brown/40 tracking-widest">
            BREWING...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 font-body text-brew-brown/60">
            No items available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} className="menu-card">
                <MenuCard item={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}