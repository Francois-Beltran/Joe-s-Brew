import { useState, useEffect } from 'react'

// Module-level singleton: the browser fires `beforeinstallprompt` exactly once
// per page load. Capturing it at module scope means any component that calls
// useInstallPrompt() — no matter when it mounts — shares the same reference.
let _prompt = null
const _subscribers = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _prompt = e
    _subscribers.forEach(fn => fn(_prompt))
  })
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(_prompt)

  useEffect(() => {
    _subscribers.add(setPrompt)
    return () => _subscribers.delete(setPrompt)
  }, [])

  const install = async () => {
    if (!prompt) return false
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    // Consume — browser only allows one call to .prompt()
    _prompt = null
    _subscribers.forEach(fn => fn(null))
    return outcome === 'accepted'
  }

  return { canInstall: !!prompt, install }
}
