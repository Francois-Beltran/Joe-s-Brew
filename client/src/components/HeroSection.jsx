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
  const videoRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current;
    
    if (video) {
      video.currentTime = 0;

      // The Fix: Wait until the browser actually knows how long the video is
      const initGsap = () => {
        gsap.to(video, {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
          currentTime: video.duration || 5, 
          ease: "none"
        });
      };

      if (video.readyState >= 1) {
        initGsap();
      } else {
        video.addEventListener('loadedmetadata', initGsap);
      }
    }

    // Text fading animation
    gsap.to(textRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "center center",
        scrub: true,
      },
      opacity: 0,
      y: -50
    });
  }, []);

  return (
    <section ref={sectionRef} id="hero" className="h-[200vh] relative bg-[#4A2511]">
      {/* Sticky container to lock the video in place during the scroll */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef}
          src="/video/hero-scroll.mp4" 
          preload="auto"
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-40"
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