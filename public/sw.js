/* LHIBC Raffles service worker — offline app shell.
   Strategy:
   - Precache the document shell on install.
   - Navigations: network-first, fall back to the cached shell when offline.
   - Same-origin assets (JS, CSS, fonts, icons): cache-first, populated as they
     are fetched, so after one online visit the app runs fully offline.
   Cross-origin requests are left untouched. */

const CACHE = 'raffle-cache-v1'
const SHELL = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // leave cross-origin alone

  // App navigations: try the network, fall back to the cached shell offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/', { ignoreSearch: true }))
    )
    return
  }

  // Static assets: serve from cache first, otherwise fetch and cache
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
    })
  )
})
