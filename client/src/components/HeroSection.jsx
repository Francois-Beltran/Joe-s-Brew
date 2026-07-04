import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Hero section component with scroll-linked video animation
 * Displays brand video and text with GSAP scroll-triggered animations
 * 
 * @returns {JSX.Element} Hero section UI
 */
export default function HeroSection() {
  const sectionRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    // Fade out text on scroll (kept the same — only the video-scrub logic above is removed)
    gsap.to(textRef.current, {
      opacity: 0,
      y: -40,
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '30% top',
        scrub: true,
      },
    })

    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])
  return (
    <section ref={sectionRef} id="hero" className="h-[200vh] relative bg-[#4A2511]">
      {/* Sticky container to lock the video in place during the scroll */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex items-center justify-center">
        {/* 🖼️ TO CHANGE THIS IMAGE: replace file at client/public/images/hero-bg.jpg */}
        <img
          src="/images/hero-bg.jpg"
          alt="Joe's Brew"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Branding text sitting on top of the video */}
        <div ref={textRef} className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-[#D5BC9E] mb-4 tracking-wider uppercase">
            Joe's Brew
          </h1>
          <p className="text-xl md:text-2xl text-[#D5BC9E]/90 font-light italic">
            Brewing the perfect cup, every time.
          </p>
        </div>
      </div>
    </section>
  );
}