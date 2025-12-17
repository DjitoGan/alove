/**
 * 🔧 Page Admin - Tableau de bord d'administration
 *
 * Fonctionnalités:
 * - Vue d'ensemble des endpoints API
 * - Statistiques Meilisearch (sync, documents indexés)
 * - Tests rapides des endpoints
 * - Accès à la documentation Swagger
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface SearchStatus {
  indexedParts: number;
  publishedParts: number;
  inSync: boolean;
  isIndexing: boolean;
}

interface SyncResult {
  message: string;
  indexed: number;
  duration: number;
}

export default function AdminPage() {
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/search/status`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }, [API_BASE]);

  // Charger le statut initial
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const triggerSync = async () => {
    setLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE}/v1/search/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      setSyncResult(data);
      // Recharger le statut après sync
      setTimeout(fetchStatus, 500);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const endpoints = [
    {
      category: 'Auth',
      items: [
        'POST /v1/auth/register',
        'POST /v1/auth/login',
        'POST /v1/auth/refresh',
        'GET /v1/auth/me',
      ],
    },
    {
      category: 'Parts',
      items: [
        'GET /v1/parts',
        'GET /v1/parts/search',
        'GET /v1/parts/:id',
        'POST /v1/parts',
        'PATCH /v1/parts/:id',
        'DELETE /v1/parts/:id',
        'POST /v1/parts/:id/publish',
      ],
    },
    {
      category: 'Search',
      items: ['GET /v1/search/status', 'GET /v1/search/stats', 'POST /v1/search/sync'],
    },
    {
      category: 'Import',
      items: [
        'POST /v1/catalog/import',
        'GET /v1/catalog/import',
        'GET /v1/catalog/import/:id',
        'GET /v1/catalog/import/:id/errors',
      ],
    },
    {
      category: 'Orders',
      items: ['POST /v1/orders', 'GET /v1/orders', 'GET /v1/orders/:id', 'DELETE /v1/orders/:id'],
    },
    {
      category: 'Payments',
      items: [
        'POST /v1/payments',
        'GET /v1/payments/:id',
        'POST /v1/payments/:id/verify',
        'POST /v1/payments/:id/refund',
      ],
    },
  ];

  return (
    <div
      style={{
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'system-ui',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/"
            style={{ fontSize: '1.5rem', textDecoration: 'none' }}
            title="Retour à l'accueil"
          >
            🏠
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>🔧 Admin Dashboard</h1>
            <p style={{ margin: '8px 0 0', color: '#666' }}>Gestion de l&apos;API ALOVE</p>
          </div>
        </div>
        <button
          onClick={() => window.open(`${API_BASE}/api/docs`, '_blank')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          📖 Swagger Docs
        </button>
      </div>

      {/* Search Status Card */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>🔍 Meilisearch Status</h2>
          <button
            onClick={triggerSync}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#ccc' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            {loading ? '⏳ Syncing...' : '🔄 Full Sync'}
          </button>
        </div>

        {status && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                Indexed Parts
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#0070f3' }}>
                {status.indexedParts}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                Published Parts
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
                {status.publishedParts}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                Sync Status
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: status.inSync ? '#10b981' : '#ef4444',
                }}
              >
                {status.inSync ? '✅ In Sync' : '⚠️ Out of Sync'}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Indexing</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: status.isIndexing ? '#f59e0b' : '#6b7280',
                }}
              >
                {status.isIndexing ? '⏳ Running' : '✓ Idle'}
              </div>
            </div>
          </div>
        )}

        {syncResult && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            ✅ {syncResult.message}: <strong>{syncResult.indexed}</strong> parts indexed in{' '}
            <strong>{syncResult.duration}ms</strong>
          </div>
        )}
      </div>

      {/* Endpoints List */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>
          📡 API Endpoints
        </h2>

        {endpoints.map((group, idx) => (
          <div key={idx} style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '2px solid #e5e7eb',
              }}
            >
              {group.category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.items.map((endpoint, i) => {
                const [method, path] = endpoint.split(' ');
                const methodColor =
                  method === 'GET'
                    ? '#10b981'
                    : method === 'POST'
                      ? '#0070f3'
                      : method === 'PATCH'
                        ? '#f59e0b'
                        : method === 'DELETE'
                          ? '#ef4444'
                          : '#6b7280';

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: methodColor,
                        color: 'white',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '11px',
                        minWidth: '60px',
                        textAlign: 'center',
                        marginRight: '12px',
                      }}
                    >
                      {method}
                    </span>
                    <span style={{ color: '#374151' }}>{path}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: 0 }}>
          💡 Pour tester les endpoints, utilisez <strong>Swagger UI</strong> ou{' '}
          <strong>curl</strong> / <strong>Postman</strong>
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
          API Base:{' '}
          <code
            style={{
              padding: '2px 6px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            {API_BASE}
          </code>
        </p>
      </div>
    </div>
  );
}
