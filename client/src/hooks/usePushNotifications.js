import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(role = 'customer') {
  const [status, setStatus] = useState('idle') // idle | requesting | subscribed | denied | unsupported

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') setStatus('denied')
    if (Notification.permission === 'granted') setStatus('subscribed')
  }, [])

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    setStatus('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const keyRes = await fetch(`${API_URL}/api/push/vapid-public-key`)
      const { publicKey } = await keyRes.json()

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, role }),
      })

      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscribe error:', err)
      setStatus('idle')
    }
  }

  return { status, subscribe }
}
