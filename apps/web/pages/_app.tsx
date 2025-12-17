import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import '../styles/globals.css';
import { registerServiceWorker, setupOnlineHandlers, syncOfflineCart } from '../lib/offline';

export default function App({ Component, pageProps }: AppProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showSyncNotif, setShowSyncNotif] = useState(false);

  useEffect(() => {
    // Register service worker for PWA
    registerServiceWorker();

    // Setup online/offline handlers
    setIsOnline(navigator.onLine);

    setupOnlineHandlers(
      async () => {
        setIsOnline(true);
        // Try to sync offline cart when back online
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
          const result = await syncOfflineCart(apiBase);
          if (result.conflicts && result.conflicts.length > 0) {
            setShowSyncNotif(true);
            setTimeout(() => setShowSyncNotif(false), 5000);
          }
        } catch (error) {
          console.error('Failed to sync cart:', error);
        }
      },
      () => {
        setIsOnline(false);
      }
    );
  }, []);

  return (
    <>
      <Head>
        <title>ALOVE - Marketplace de Pièces Auto</title>
        <meta
          name="description"
          content="ALOVE - Marketplace de pièces auto d'occasion en Afrique de l'Ouest"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Alove" />
      </Head>

      {/* Offline indicator */}
      {!isOnline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#f59e0b',
            color: '#fff',
            padding: '0.5rem',
            textAlign: 'center',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: '600',
          }}
        >
          📡 Mode hors ligne - Vos modifications seront synchronisées à la reconnexion
        </div>
      )}

      {/* Sync notification */}
      {showSyncNotif && (
        <div
          style={{
            position: 'fixed',
            top: isOnline ? '1rem' : '3rem',
            right: '1rem',
            background: '#10b981',
            color: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontSize: '0.875rem',
          }}
        >
          ✅ Panier synchronisé !
        </div>
      )}

      <div style={{ paddingTop: !isOnline ? '2.5rem' : 0 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
