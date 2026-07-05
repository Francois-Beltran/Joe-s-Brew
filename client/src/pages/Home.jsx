import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import BranchesSection from '../components/BranchesSection'
import AboutSection from '../components/AboutSection'
import MenuSection from '../components/MenuSection'
import InstallPrompt from '../components/InstallPrompt'
import BugReporter from '../components/BugReporter'

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="bg-brew-light">
      <Navbar />
      <HeroSection />
      <MenuSection />
      <BranchesSection />
      <AboutSection onOpenBugReporter={() => setBugOpen(true)} />

      {/* Footer */}
      <footer className="bg-brew-dark text-brew-beige/50 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="font-heading text-brew-beige/80 text-lg tracking-widest">JOE'S BREW</p>
            <p className="font-body text-xs mt-1">© {new Date().getFullYear()} · Est. 1939</p>
            <p className="font-body text-brew-beige/30 text-xs tracking-wider mt-0.5">
              Candijay · Loboc · Cogtong · Bohol, Philippines
            </p>
          </div>

          {/* Centralised bug report / feedback */}
          <div className="flex flex-col items-center gap-2">
            <p className="font-body text-brew-beige/35 text-xs tracking-wider uppercase">Feedback</p>
            <button
              onClick={() => setBugOpen(true)}
              className="font-heading text-xs tracking-widest px-5 py-2 rounded-full border border-brew-beige/20 text-brew-beige/60 hover:border-brew-beige/50 hover:text-brew-beige transition-colors"
            >
              🐛 Report a Bug · 💡 Suggest a Feature
            </button>
          </div>
        </div>
      </footer>

      {/* Scroll-to-top */}
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
      <BugReporter open={bugOpen} onClose={() => setBugOpen(false)} />
    </main>
  )
}
