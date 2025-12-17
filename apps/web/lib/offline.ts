// Cart offline storage utilities (US-PWA-1101)

const DB_NAME = 'alove-db';
const DB_VERSION = 1;
const CART_STORE = 'offline-cart';

interface CartItem {
  partId: string;
  quantity: number;
  timestamp: number;
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(CART_STORE)) {
        db.createObjectStore(CART_STORE, { keyPath: 'partId' });
      }
    };
  });
}

// Save cart item offline
export async function saveCartItemOffline(partId: string, quantity: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CART_STORE, 'readwrite');
  const store = tx.objectStore(CART_STORE);

  const item: CartItem = {
    partId,
    quantity,
    timestamp: Date.now(),
  };

  await store.put(item);
}

// Get all offline cart items
export async function getOfflineCartItems(): Promise<CartItem[]> {
  const db = await openDB();
  const tx = db.transaction(CART_STORE, 'readonly');
  const store = tx.objectStore(CART_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear offline cart
export async function clearOfflineCart(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CART_STORE, 'readwrite');
  const store = tx.objectStore(CART_STORE);
  await store.clear();
}

// Sync offline cart with server
type SyncResponse = { cart: unknown; conflicts: { partId: string; reason: string }[] };
export async function syncOfflineCart(apiBase: string): Promise<SyncResponse> {
  const items = await getOfflineCartItems();

  if (items.length === 0) {
    return { cart: null, conflicts: [] };
  }

  const response = await fetch(`${apiBase}/v1/cart/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((item) => ({
        partId: item.partId,
        quantity: item.quantity,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error('Sync failed');
  }

  const result = await response.json();

  // Clear offline cart on successful sync
  if (result.conflicts.length === 0) {
    await clearOfflineCart();
  }

  return result;
}

// Register service worker
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New SW version available. Please refresh.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });

      // Request background sync permission
      navigator.serviceWorker.ready.then((reg: ServiceWorkerRegistration) => {
        const anyReg = reg as unknown as { sync?: { register: (tag: string) => Promise<void> } };
        if (anyReg.sync) {
          return anyReg.sync.register('sync-cart');
        }
      });
    });
  }
}

// Check if app is offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Add online/offline event listeners
export function setupOnlineHandlers(onOnline: () => void, onOffline: () => void): void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
}
