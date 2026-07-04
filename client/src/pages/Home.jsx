import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import BranchesSection from '../components/BranchesSection'
import AboutSection from '../components/AboutSection'
import MenuSection from '../components/MenuSection'
import InstallPrompt from '../components/InstallPrompt'
import BugReporter from '../components/BugReporter'

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const bugReporterRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const openBugReporter = () => {
    // BugReporter manages its own open state via a floating button;
    // simulate a click on its toggle so the About section CTAs can open it.
    const btn = document.getElementById('bug-reporter-toggle')
    if (btn) btn.click()
  }

  return (
    <main className="bg-brew-light">
      <Navbar />
      <HeroSection />
      <MenuSection />
      <BranchesSection />
      <AboutSection onOpenBugReporter={openBugReporter} />

      <footer className="bg-brew-dark text-brew-beige/40 py-8 text-center font-body text-sm">
        <p>© {new Date().getFullYear()} Joe's Brew · Est. 1939</p>
        <p className="mt-1 text-brew-beige/25 text-xs tracking-wider">
          Candijay · Loboc · Cogtong · Bohol, Philippines
        </p>
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
      <BugReporter ref={bugReporterRef} />
    </main>
  )
}
