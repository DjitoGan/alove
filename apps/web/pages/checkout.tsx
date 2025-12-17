import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

interface CartItem {
  id: string;
  quantity: number;
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

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<{ [vendorId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const fetchData = useCallback(async () => {
    try {
      const [cartRes, addressRes] = await Promise.all([
        fetch(`${API_BASE}/v1/cart`),
        fetch(`${API_BASE}/v1/addresses`),
      ]);

      const cartData = await cartRes.json();
      const addressData = await addressRes.json();

      setCart(cartData);
      setAddresses(addressData);

      // Pre-select default address for all vendors
      const defaultAddress = addressData.find((a: Address) => a.isDefault);
      if (defaultAddress && cartData.vendorGroups) {
        const initialSelection: { [key: string]: string } = {};
        cartData.vendorGroups.forEach((vg: VendorGroup) => {
          initialSelection[vg.vendor.id] = defaultAddress.id;
        });
        setSelectedAddresses(initialSelection);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckout = async () => {
    if (!cart) return;

    // Validate all vendors have addresses
    const missingVendors = cart.vendorGroups.filter((vg) => !selectedAddresses[vg.vendor.id]);

    if (missingVendors.length > 0) {
      alert('Veuillez sélectionner une adresse pour chaque vendeur');
      return;
    }

    setSubmitting(true);

    try {
      const vendorShipping = cart.vendorGroups.map((vg) => ({
        vendorId: vg.vendor.id,
        addressId: selectedAddresses[vg.vendor.id],
      }));

      const res = await fetch(`${API_BASE}/v1/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorShipping }),
      });

      if (res.ok) {
        const order = await res.json();
        alert(`Commande créée avec succès ! N° ${order.id}`);
        router.push('/');
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Erreur lors de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!cart || cart.vendorGroups.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Votre panier est vide</p>
        <Link href="/catalog" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          Retour au catalogue
        </Link>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>
          Vous devez d&apos;abord enregistrer une adresse de livraison
        </p>
        <Link
          href="/addresses"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
          }}
        >
          Gérer mes adresses
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - Alove</title>
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
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              💳 Finaliser la commande
            </h1>
          </div>
          <Link href="/cart" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            ← Retour au panier
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left: Vendor groups with address selection */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Sélection des adresses de livraison
            </h2>

            {cart.vendorGroups.map((group) => (
              <div
                key={group.vendor.id}
                style={{
                  marginBottom: '1.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  background: '#fff',
                }}
              >
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  📦 {group.vendor.name}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {group.items.length} article(s) · {group.subtotal.toLocaleString()} XOF
                </p>

                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Adresse de livraison pour ce vendeur:
                </label>
                <select
                  value={selectedAddresses[group.vendor.id] || ''}
                  onChange={(e) =>
                    setSelectedAddresses({
                      ...selectedAddresses,
                      [group.vendor.id]: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">-- Choisir une adresse --</option>
                  {addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label} - {addr.line1}, {addr.city} {addr.isDefault && '⭐'}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: '1rem' }}>
                  <Link
                    href="/addresses"
                    style={{
                      fontSize: '0.875rem',
                      color: '#3b82f6',
                      textDecoration: 'underline',
                    }}
                  >
                    + Gérer mes adresses
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Summary & Checkout */}
          <div>
            <div
              style={{
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '1.5rem',
                background: '#eff6ff',
                position: 'sticky',
                top: '2rem',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Récapitulatif
              </h3>

              {cart.vendorGroups.map((group) => (
                <div
                  key={group.vendor.id}
                  style={{
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #bfdbfe',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem' }}>{group.vendor.name}</span>
                    <span style={{ fontWeight: '600' }}>{group.subtotal.toLocaleString()} XOF</span>
                  </div>
                </div>
              ))}

              <div
                style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #3b82f6' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Total:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {cart.total.toLocaleString()} XOF
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  submitting || Object.keys(selectedAddresses).length !== cart.vendorGroups.length
                }
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: submitting ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Traitement en cours...' : 'Confirmer la commande'}
              </button>

              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textAlign: 'center',
                }}
              >
                En cliquant sur &quot;Confirmer&quot;, vous acceptez nos conditions générales de
                vente
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
