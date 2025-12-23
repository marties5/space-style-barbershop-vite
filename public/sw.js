// Service Worker for Push Notifications - Space Style Barbershop
// This service worker runs in the background and can receive push notifications
// even when the browser tab is closed

const CACHE_NAME = 'spacestyle-v1';

// Install event - called when service worker is first installed
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - called when service worker becomes active
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

// Push event - receives push notifications from server
// This works even when the browser/tab is closed!
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  // Default notification data
  let title = 'Space Style Barbershop';
  let body = 'Anda memiliki notifikasi baru';
  let icon = '/pwa-192x192.png';
  let badge = '/pwa-192x192.png';
  let tag = 'notification-' + Date.now();
  let notificationData = {};

  try {
    if (event.data) {
      // Try to parse as JSON first
      try {
        const payload = event.data.json();
        console.log('[SW] Parsed JSON payload:', payload);
        
        // Extract data from payload
        title = payload.title || payload.notification?.title || title;
        body = payload.body || payload.notification?.body || body;
        icon = payload.icon || payload.notification?.icon || icon;
        badge = payload.badge || payload.notification?.badge || badge;
        tag = payload.tag || tag;
        notificationData = payload.data || {};
      } catch (jsonError) {
        // If JSON parsing fails, try to get as text
        const textData = event.data.text();
        console.log('[SW] Text payload:', textData);
        
        // Try parsing text as JSON one more time
        try {
          const parsed = JSON.parse(textData);
          title = parsed.title || title;
          body = parsed.body || body;
          icon = parsed.icon || icon;
          tag = parsed.tag || tag;
          notificationData = parsed.data || {};
        } catch {
          body = textData || body;
        }
      }
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: notificationData,
    vibrate: [200, 100, 200, 100, 200], // Strong vibration pattern
    requireInteraction: true, // Keep notification until user interacts
    renotify: true, // Notify again even if same tag
    silent: false, // Play sound
    actions: [
      { action: 'open', title: 'Buka Aplikasi', icon: '/pwa-192x192.png' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  console.log('[SW] Showing notification:', { title, ...options });

  // waitUntil ensures the service worker doesn't terminate before showing the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handles user interaction with notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Handle different actions
  if (event.action === 'close') {
    console.log('[SW] User closed notification');
    return;
  }

  // Determine URL to open
  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  console.log('[SW] Opening URL:', fullUrl);

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          console.log('[SW] Found existing window, focusing...');
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // Open new window if none found
      console.log('[SW] No existing window, opening new one...');
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Notification close event - called when notification is dismissed
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed by user:', event.notification.tag);
});

// Background sync event - for offline-first functionality
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
});

// Push subscription change event - handles subscription updates
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  // Re-subscribe if needed
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true
    }).then((subscription) => {
      console.log('[SW] Re-subscribed:', subscription.endpoint);
      // Here you would send the new subscription to your server
    })
  );
});
