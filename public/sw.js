// Service Worker for Space Style Barbershop PWA

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Fetch event - basic caching strategy
self.addEventListener('fetch', (event) => {
  // Let the browser handle the request normally
  event.respondWith(fetch(event.request));
});
