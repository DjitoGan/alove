// Service Worker for PWA offline support (US-PWA-1101)
const CACHE_NAME = 'alove-cache-v1';
const API_CACHE = 'alove-api-cache-v1';

const STATIC_ASSETS = ['/', '/catalog', '/cart', '/addresses', '/checkout'];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first with offline fallback
  if (url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET responses
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try to serve from cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Return offline response for failed requests
            return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (request.method === 'GET' && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle background sync for cart operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  try {
    // Get offline cart items from IndexedDB
    const db = await openDB();
    const tx = db.transaction('offline-cart', 'readonly');
    const store = tx.objectStore('offline-cart');
    const items = await store.getAll();

    if (items.length === 0) return;

    // Sync with server
    const response = await fetch('/v1/cart/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    if (response.ok) {
      // Clear offline cart on successful sync
      const clearTx = db.transaction('offline-cart', 'readwrite');
      const clearStore = clearTx.objectStore('offline-cart');
      await clearStore.clear();
    }
  } catch (error) {
    console.error('Cart sync failed:', error);
    throw error; // Retry later
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('alove-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-cart')) {
        db.createObjectStore('offline-cart', { keyPath: 'partId' });
      }
    };
  });
}
