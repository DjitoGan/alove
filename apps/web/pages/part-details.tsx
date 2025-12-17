/**
 * 📦 Page détails d'une pièce - Fiche produit complète
 *
 * [1] Dépendances
 *     - useState, useEffect: gestion d'état et cycle de vie
 *     - useRouter: accès aux query parameters (id du produit)
 *
 * Responsabilités:
 * - Afficher les détails complets d'une pièce détachée
 * - Afficher les avis clients (mock data)
 * - Permettre la sélection de quantité
 * - Ajouter au panier avec redirection
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

// [2] Configuration API (non utilisée ici)

// [3] Interface Part: toutes les infos d'une pièce détachée
interface Part {
  id: string;
  title: string;
  price: string;
  stock: number;
  createdAt: string;
  vendorId: string;
  updatedAt: string;
}

interface Review {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface CartItem extends Part {
  quantity: number;
}

export default function PartDetailsPage() {
  // [4] Hooks
  const router = useRouter();
  const { id } = router.query;

  // [5] États du composant
  //     - part: données de la pièce détachée
  //     - loading: loader pendant le chargement
  //     - quantity: quantité sélectionnée par l'utilisateur
  //     - reviews: mock data des avis clients
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews] = useState<Review[]>([
    {
      author: 'Ahmed M.',
      rating: 5,
      comment: 'Excellent produit, très bien emballé !',
      date: '2025-12-10',
    },
    { author: 'Fatou N.', rating: 4, comment: 'Bon état, livraison rapide.', date: '2025-12-05' },
    {
      author: 'Malik K.',
      rating: 5,
      comment: 'Conforme à la description. Recommandé !',
      date: '2025-11-28',
    },
  ]);

  // [6] Hook useEffect: charger la pièce au montage
  //     WHY: Exécuter une fois quand l'ID est défini
  useEffect(() => {
    if (!id) return;
    fetchPart();
  }, [id, fetchPart]);

  // [7] Fonction pour charger les détails d'une pièce
  //     WHY: Récupérer les données de la pièce (actuellement mock data)
  const fetchPart = useCallback(async () => {
    try {
      setLoading(true);
      // [7a] En dev, créer une pièce de demo (API n'a pas encore le endpoint détail)
      //      WHY: Permettre de tester le UI sans backend
      const mockParts: { [key: string]: Part } = {
        'part-1': {
          id: 'cmj92ziya0007sqsfeaq0pbwo',
          title: 'Filtre à huile Bosch 0 986 AFO 250',
          price: '8.50',
          stock: 120,
          createdAt: '2025-12-16T21:14:46.835Z',
          updatedAt: '2025-12-16T21:14:46.835Z',
          vendorId: 'cmj92ziy90005sqsfzyjus6tu',
        },
      };

      // [7b] Utiliser mock ou créer une pièce par défaut avec l'ID demandé
      const mockPart = mockParts[id as string] || {
        id: id,
        title: 'Pièce détachée auto',
        price: '49.99',
        stock: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        vendorId: 'vendor-001',
      };

      // [7c] Stocker la pièce dans l'état
      setPart(mockPart);
    } catch (err: unknown) {
      // [7d] Afficher les erreurs
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      // [7e] Arrêter le loader
      setLoading(false);
    }
  }, [id]);

  // [8] Fonction pour ajouter la pièce au panier
  //     WHY: Sauvegarder le panier dans localStorage et rediriger
  const handleAddToCart = () => {
    // [8a] Vérifier que la pièce existe
    if (!part) return;

    // [8b] Récupérer le panier existant depuis localStorage
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    // [8c] Chercher si la pièce est déjà dans le panier
    const existingItem = cart.find((item) => item.id === part.id);

    // [8d] Incrémenter quantité ou ajouter nouvel item
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ ...part, quantity });
    }

    // [8e] Sauvegarder le panier et afficher confirmation
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`✅ ${quantity} × ${part.title} ajouté au panier !`);
    // [8f] Rediriger vers le catalogue
    router.push('/catalog');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error || !part) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>❌ {error || 'Pièce non trouvée'}</p>
        <button
          onClick={() => router.push('/catalog')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retour au catalogue
        </button>
      </div>
    );
  }

  const rating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const totalReviews = reviews.length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      {/* Header */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e0e0e0',
          padding: '20px 40px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <button
          onClick={() => router.push('/catalog')}
          style={{
            background: 'none',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          ← Retour au catalogue
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '40px',
          }}
        >
          {/* Image Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '80px',
              }}
            >
              🔧
            </div>
          </div>

          {/* Details Section */}
          <div>
            <h1 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '32px' }}>{part.title}</h1>

            {/* Rating */}
            <div
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}
              >
                <span style={{ fontSize: '24px' }}>
                  {'⭐'.repeat(Math.round(parseFloat(rating)))}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  {rating} ({totalReviews} avis)
                </span>
              </div>
            </div>

            {/* Price */}
            <div style={{ marginBottom: '30px' }}>
              <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea' }}>
                {parseFloat(part.price).toFixed(2)}€
              </span>
              {part.stock > 0 ? (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 15px',
                    background: '#e6f7e6',
                    color: '#52c41a',
                    borderRadius: '6px',
                    display: 'inline-block',
                    fontWeight: '500',
                  }}
                >
                  ✅ En stock ({part.stock} disponibles)
                </div>
              ) : (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 15px',
                    background: '#fee',
                    color: '#c33',
                    borderRadius: '6px',
                    display: 'inline-block',
                    fontWeight: '500',
                  }}
                >
                  ❌ Rupture de stock
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div style={{ marginBottom: '30px' }}>
              <label
                style={{ display: 'block', marginBottom: '10px', fontWeight: '500', color: '#333' }}
              >
                Quantité
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={part.stock}
                  style={{
                    width: '60px',
                    padding: '8px',
                    textAlign: 'center',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                  }}
                />
                <button
                  onClick={() => setQuantity(Math.min(part.stock, quantity + 1))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={part.stock === 0}
              style={{
                width: '100%',
                padding: '15px',
                background: part.stock > 0 ? '#ff8c00' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: part.stock > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => {
                if (part.stock > 0) e.currentTarget.style.background = '#e67e00';
              }}
              onMouseOut={(e) => {
                if (part.stock > 0) e.currentTarget.style.background = '#ff8c00';
              }}
            >
              {part.stock > 0
                ? `🛒 Ajouter au panier (${quantity} × ${(parseFloat(part.price) * quantity).toFixed(2)}€)`
                : 'Indisponible'}
            </button>

            {/* Info */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>ID produit:</strong> {part.id.substring(0, 8)}...
              </p>
              <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Ajouté le:</strong> {new Date(part.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Dernier update:</strong>{' '}
                {new Date(part.updatedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ margin: '0 0 30px 0', color: '#333' }}>📝 Avis clients ({totalReviews})</h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            {reviews.map((review, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  borderLeft: '4px solid #667eea',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '16px', color: '#333' }}>{review.author}</strong>
                    <div style={{ color: '#ff8c00', fontSize: '14px', marginTop: '5px' }}>
                      {'⭐'.repeat(review.rating)}
                    </div>
                  </div>
                  <span style={{ color: '#999', fontSize: '12px' }}>{review.date}</span>
                </div>
                <p style={{ margin: '10px 0 0 0', color: '#666' }}>{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
