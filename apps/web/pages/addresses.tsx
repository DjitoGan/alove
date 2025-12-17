import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phoneNumber?: string;
  instructions?: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'TG',
    phoneNumber: '',
    instructions: '',
    isDefault: false,
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/addresses`);
      const data = await res.json();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId ? `${API_BASE}/v1/addresses/${editingId}` : `${API_BASE}/v1/addresses`;
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchAddresses();
        resetForm();
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Failed to save address:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette adresse ?')) return;

    try {
      const res = await fetch(`${API_BASE}/v1/addresses/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchAddresses();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/addresses/${id}/default`, {
        method: 'PATCH',
      });

      if (res.ok) {
        await fetchAddresses();
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Failed to set default:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setFormData(address);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      label: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'TG',
      phoneNumber: '',
      instructions: '',
      isDefault: false,
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement des adresses...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Mes Adresses - Alove</title>
      </Head>

      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
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
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>📍 Mes Adresses</h1>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}
          >
            ➕ Ajouter une adresse
          </button>
        )}

        {showForm && (
          <div
            style={{
              marginBottom: '2rem',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '1.5rem',
              background: '#eff6ff',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {editingId ? "Modifier l'adresse" : 'Nouvelle adresse'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                    Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Maison, Bureau, Atelier..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                    Adresse ligne 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.line1}
                    onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                    Adresse ligne 2
                  </label>
                  <input
                    type="text"
                    value={formData.line2 || ''}
                    onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                      Pays
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                    >
                      <option value="TG">Togo (TG)</option>
                      <option value="BJ">Bénin (BJ)</option>
                      <option value="NE">Niger (NE)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber || ''}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                    Instructions de livraison
                  </label>
                  <textarea
                    value={formData.instructions || ''}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.isDefault || false}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    <span>Définir comme adresse par défaut</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {editingId ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {addresses.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <p>Aucune adresse enregistrée</p>
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                style={{
                  border: address.isDefault ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                      {address.label}
                      {address.isDefault && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            background: '#3b82f6',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          PAR DÉFAUT
                        </span>
                      )}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => startEdit(address)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          background: '#fff',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        ⭐ Par défaut
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(address.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #ef4444',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.city}, {address.country}
                  </p>
                  {address.phoneNumber && <p>📞 {address.phoneNumber}</p>}
                  {address.instructions && (
                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                      💬 {address.instructions}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
