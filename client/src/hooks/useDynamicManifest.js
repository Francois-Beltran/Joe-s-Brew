import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Swaps the page manifest depending on which section of the app is active,
// so /admin and /employee can be installed as their OWN separate PWA icons
export function useDynamicManifest() {
  const location = useLocation()

  useEffect(() => {
    let manifestPath = '/manifest.json'
    if (location.pathname.startsWith('/admin')) manifestPath = '/manifest-admin.json'
    if (location.pathname.startsWith('/employee')) manifestPath = '/manifest-employee.json'

    let link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = manifestPath
  }, [location.pathname])
}