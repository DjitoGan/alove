import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface CartItem {
  id: string;
  partId: string;
  partTitle: string;
  partImage: string | null;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  part: {
    price: number;
    stock: number;
  };
}

interface VendorGroup {
  vendor: {
    id: string;
    name: string;
  };
  items: CartItem[];
  subtotal: number;
}

interface Cart {
  id: string;
  total: number;
  vendorGroups: VendorGroup[];
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/cart`);
      const data = await res.json();
      setCart(data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    setUpdating(itemId);
    try {
      const res = await fetch(`${API_BASE}/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      setCart(data);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('Retirer cet article du panier ?')) return;

    setUpdating(itemId);
    try {
      const res = await fetch(`${API_BASE}/v1/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setCart(data);
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!confirm('Vider le panier complètement ?')) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/cart`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setCart(data);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      alert('Erreur lors du vidage du panier');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement du panier...</p>
      </div>
    );
  }

  const isEmpty = !cart || !cart.vendorGroups || cart.vendorGroups.length === 0;

  return (
    <>
      <Head>
        <title>Panier - Alove</title>
      </Head>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
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
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>🛒 Mon Panier</h1>
          </div>
          <Link href="/catalog" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            ← Continuer mes achats
          </Link>
        </div>

        {isEmpty ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem',
              background: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Votre panier est vide</p>
            <Link href="/catalog" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <>
            {/* Grouped by vendor */}
            {cart.vendorGroups.map((group) => (
              <div
                key={group.vendor.id}
                style={{
                  marginBottom: '2rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  background: '#fff',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    color: '#1f2937',
                  }}
                >
                  📦 Vendeur: {group.vendor.name}
                </h2>

                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      opacity: updating === item.id ? 0.5 : 1,
                    }}
                  >
                    {/* Image */}
                    <div style={{ flexShrink: 0 }}>
                      {item.partImage ? (
                        <img
                          src={item.partImage}
                          alt={item.partTitle}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            background: '#e5e7eb',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          📦
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {item.partTitle}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Prix unitaire: {item.part.price.toLocaleString()} XOF
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Stock disponible: {item.part.stock}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: '2rem', textAlign: 'center', fontWeight: '600' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id || item.quantity >= item.part.stock}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Price & Remove */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.5rem',
                      }}
                    >
                      <p style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                        {(item.part.price * item.quantity).toLocaleString()} XOF
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        style={{
                          color: '#ef4444',
                          fontSize: '0.875rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        🗑️ Retirer
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '1rem', textAlign: 'right', fontWeight: '600' }}>
                  Sous-total {group.vendor.name}: {group.subtotal.toLocaleString()} XOF
                </div>
              </div>
            ))}

            {/* Total & Actions */}
            <div
              style={{
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '1.5rem',
                background: '#eff6ff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Total:</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {cart.total.toLocaleString()} XOF
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={clearCart}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  Vider le panier
                </button>
                <button
                  onClick={() => router.push('/checkout')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Procéder au paiement →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
