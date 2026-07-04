import { useState, useEffect } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const CONFIG = {
  customer: {
    title: "Install Joe's Brew",
    subtitle: 'Add to your home screen for quick ordering',
    icon: '☕',
    dismissKey: 'joesbrew_install_dismissed_customer',
  },
  admin: {
    title: 'Install Admin Dashboard',
    subtitle: 'Quick access to payment verification',
    icon: '🛡️',
    dismissKey: 'joesbrew_install_dismissed_admin',
  },
  employee: {
    title: 'Install Order Dashboard',
    subtitle: 'Quick access to order fulfillment',
    icon: '📋',
    dismissKey: 'joesbrew_install_dismissed_employee',
  },
}

// Auto-appearing toast banner. Pair with the <InstallButton> for a persistent trigger.
export default function InstallPrompt({ context = 'customer' }) {
  const { canInstall, install } = useInstallPrompt()
  const [show, setShow] = useState(false)
  const cfg = CONFIG[context] ?? CONFIG.customer

  useEffect(() => {
    if (canInstall && !localStorage.getItem(cfg.dismissKey)) {
      setShow(true)
    }
  }, [canInstall, cfg.dismissKey])

  const handleInstall = async () => {
    const accepted = await install()
    if (accepted) setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(cfg.dismissKey, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-brew-brown text-brew-beige rounded-2xl shadow-2xl p-4 z-40 flex items-center gap-3">
      <span className="text-3xl">{cfg.icon}</span>
      <div className="flex-1">
        <p className="font-heading text-sm tracking-wide">{cfg.title}</p>
        <p className="font-body text-xs text-brew-beige/70">{cfg.subtitle}</p>
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

// Inline button for dashboards — only renders when the app is installable.
export function InstallButton({ context = 'customer' }) {
  const { canInstall, install } = useInstallPrompt()
  const cfg = CONFIG[context] ?? CONFIG.customer
  if (!canInstall) return null
  return (
    <button
      onClick={install}
      className="font-heading text-xs tracking-wider px-4 py-1 rounded-full border border-brew-brown/30 text-brew-brown hover:border-brew-brown transition-colors flex items-center gap-1"
    >
      {cfg.icon} INSTALL APP
    </button>
  )
}
