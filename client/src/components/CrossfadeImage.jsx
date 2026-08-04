import { useEffect, useRef, useState } from 'react'

/**
 * Two stacked <img> layers that crossfade whenever `images` changes (branch
 * switch) or the internal cycle timer advances (multi-photo branches).
 */
export default function CrossfadeImage({ images, alt = '', className = '', interval = 4500 }) {
  const [layerA, setLayerA] = useState(images[0])
  const [layerB, setLayerB] = useState(images[0])
  const [showA, setShowA] = useState(true)
  const showARef = useRef(true)
  const idxRef = useRef(0)

  useEffect(() => { showARef.current = showA }, [showA])

  useEffect(() => {
    idxRef.current = 0
    const next = images[0]
    if (showARef.current) setLayerB(next); else setLayerA(next)
    setShowA(v => !v)

    if (images.length <= 1) return undefined

    const t = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % images.length
      const src = images[idxRef.current]
      if (showARef.current) setLayerB(src); else setLayerA(src)
      setShowA(v => !v)
    }, interval)
    return () => clearInterval(t)
  }, [images, interval])

  return (
    <>
      <img
        src={layerA}
        alt={alt}
        aria-hidden={!showA}
        className={`${className} absolute inset-0 transition-opacity duration-[1200ms] ease-in-out`}
        style={{ opacity: showA ? 1 : 0 }}
      />
      <img
        src={layerB}
        alt={alt}
        aria-hidden={showA}
        className={`${className} absolute inset-0 transition-opacity duration-[1200ms] ease-in-out`}
        style={{ opacity: showA ? 0 : 1 }}
      />
    </>
  )
}
