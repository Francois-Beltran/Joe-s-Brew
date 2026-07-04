const CACHE_NAME = 'joes-brew-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// Network-first caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification handler — fires even when the tab is closed
self.addEventListener('push', (event) => {
  let data = { title: "Joe's Brew", body: 'You have a new notification.' }
  try {
    data = event.data.json()
  } catch (_) {
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/images/icon-192.png',
      badge: '/images/icon-192.png',
      tag: data.tag || 'joesbrew-notification',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})

// Open or focus the app when the notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
