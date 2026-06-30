import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import MenuSection from '../components/MenuSection'

/**
 * Home page component
 * Main landing page with navigation, hero section, menu, and footer
 * 
 * @returns {JSX.Element} Home page UI
 */
export default function Home() {
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
    </main>
  )
}
