import Navbar from '../components/common/Navbar'
import HeroSection from '../components/common/HeroSection'
import MenuSection from '../features/menu/MenuSection'
import BugReporter from '../components/common/BugReporter'   // if used
import InstallPrompt from '../components/common/InstallPrompt'
import { useState, useEffect } from 'react'

/**
 * Home page component
 * Main landing page with navigation, hero section, menu, and footer
 * 
 * @returns {JSX.Element} Home page UI
 */
export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 800)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <main>
      <Navbar />
      <HeroSection />
      <MenuSection />

      {/* About section */}
      <section id="about" className="bg-brew-brown text-brew-beige py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-5xl mb-6">SINCE 1939</h2>
          <p className="font-body text-brew-beige/80 text-lg leading-relaxed">
            Joe's Brew has been a cornerstone of the community for over eight decades.
            We believe a great cup of coffee doesn't need to be complicated —
            just the right beans, the right roast, and a little bit of soul.
          </p>
        </div>
      </section>

      <footer className="bg-brew-dark text-brew-beige/40 py-6 text-center font-body text-sm">
        © {new Date().getFullYear()} Joe's Brew · Est. 1939 · Brewing the perfect cup, every time.
      </footer>
      {showScrollTop && (
  <button
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-30 bg-brew-brown text-brew-beige w-12 h-12 rounded-full shadow-xl flex items-center justify-center hover:bg-brew-dark active:scale-90 transition-all"
    aria-label="Scroll to top"
  >
    ↑
  </button>
)}
      <InstallPrompt />
      <BugReporter />
    </main>
  )
}
