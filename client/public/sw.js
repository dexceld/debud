const CACHE_NAME = 'beshlita-v102'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  // Only handle GET requests for http/https — skip chrome-extension:// and others
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith('http')) return
  // Skip Firebase Auth popup handler — must not be intercepted
  if (e.request.url.includes('/__/auth/')) return
  // Skip analytics / third-party
  if (!e.request.url.startsWith(self.location.origin)) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then((cached) =>
          cached || new Response('', { status: 503, statusText: 'Offline' })
        )
      )
  )
})
