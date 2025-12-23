// Service Worker for Push Notifications - Space Style Barbershop

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  // Default notification data
  let title = 'Space Style Barbershop';
  let body = 'Anda memiliki notifikasi baru';
  let icon = '/pwa-192x192.png';
  let badge = '/pwa-192x192.png';
  let tag = 'default';
  let notificationData = {};

  try {
    if (event.data) {
      // Try to parse as JSON first
      try {
        const payload = event.data.json();
        console.log('Parsed JSON payload:', payload);
        
        // Extract data from payload
        title = payload.title || payload.notification?.title || title;
        body = payload.body || payload.notification?.body || body;
        icon = payload.icon || payload.notification?.icon || icon;
        badge = payload.badge || payload.notification?.badge || badge;
        tag = payload.tag || 'notification-' + Date.now();
        notificationData = payload.data || {};
      } catch (jsonError) {
        // If JSON parsing fails, try to get as text
        const textData = event.data.text();
        console.log('Text payload:', textData);
        body = textData || body;
      }
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: notificationData,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  console.log('Showing notification with options:', { title, ...options });

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Navigate to the app
  const urlToOpen = '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
