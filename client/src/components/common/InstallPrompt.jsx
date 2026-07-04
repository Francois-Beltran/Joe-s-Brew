import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Only show if not already installed and not dismissed before
      const dismissed = localStorage.getItem('joesbrew_install_dismissed')
      if (!dismissed) setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('joesbrew_install_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-brew-brown text-brew-beige rounded-2xl shadow-2xl p-4 z-40 flex items-center gap-3">
      <span className="text-3xl">☕</span>
      <div className="flex-1">
        <p className="font-heading text-sm tracking-wide">Install Joe's Brew</p>
        <p className="font-body text-xs text-brew-beige/70">Add to your home screen for quick access</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-brew-beige text-brew-brown font-heading text-xs px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-brew-beige/50 font-body text-xs hover:text-brew-beige"
        >
          Not now
        </button>
      </div>
    </div>
  )
}