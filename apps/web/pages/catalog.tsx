/**
 * 🛒 Page du catalogue - Marketplace principal
 *
 * [1] Dépendances et configuration
 *     - useEffect: charger données au montage
 *     - useState: gestion d'état complexe (panier, recherche, etc.)
 *     - useRouter: navigation et redirection
 *
 * [2] Interfaces TypeScript
 *     - Part: structure d'une pièce détachée
 *     - CartItem: Part + quantity pour le panier
 *     - User: info utilisateur authentifié
 *
 * Responsabilités majeures:
 * - Lister toutes les pièces détachées depuis l'API
 * - Permettre la recherche en temps réel
 * - Gérer le panier (add/remove/persistance)
 * - Afficher l'overlay du panier
 * - Vérifier l'authentification
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// [3] Configuration de l'API depuis .env ou fallback local
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

// [4] Interface Part: structure d'une pièce détachée retournée par l'API
//     WHY: TypeScript pour la complétude du code et les erreurs à la compilation
interface Part {
  id: string; // ID unique (UUID)
  title: string; // Nom de la pièce (ex: "Filtre à huile")
  price: string; // Prix en euros (string car peut avoir décimales)
  stock: number; // Nombre en stock
  createdAt: string; // Date d'ajout (ISO format)
}

// [5] Interface User: données utilisateur authentifié
interface User {
  id: string;
  email: string;
}

// [6] Interface CartItem: pièce + quantité dans le panier
//     WHY: extends Part signifie qu'un CartItem a tous les champs de Part + quantity
interface CartItem extends Part {
  quantity: number; // Quantité choisie par l'utilisateur
}

export default function CatalogPage() {
  // [7] Hook useRouter pour navigation programmatique
  const router = useRouter();

  // [8] États complexes du catalogue
  //     [8a] Données de pièces
  const [parts, setParts] = useState<Part[]>([]); // Toutes les pièces du serveur
  const [filteredParts, setFilteredParts] = useState<Part[]>([]); // Pièces filtrées par recherche
  const [searchQuery, setSearchQuery] = useState(''); // Query de recherche

  //     [8b] Données utilisateur
  const [user, setUser] = useState<User | null>(null); // Infos user connecté

  //     [8c] États de la requête API
  const [loading, setLoading] = useState(true); // Loading initial des pièces
  const [error, setError] = useState(''); // Erreur réseau/API
  const [page, setPage] = useState(1); // Page de pagination
  const [hasMore, setHasMore] = useState(false); // Y-a-t-il une page suivante?

  //     [8d] États du panier
  const [cart, setCart] = useState<CartItem[]>([]); // Contenu du panier en mémoire
  const [showCart, setShowCart] = useState(false); // Afficher l'overlay du panier?

  useEffect(() => {
    // Charger le panier depuis localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/auth');
      return;
    }

    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    fetchParts();
  }, [page]);

  // Filtrer les pièces selon la recherche
  useEffect(() => {
    const filtered = parts.filter((part) =>
      part.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredParts(filtered);
  }, [searchQuery, parts]);

  // [9] Fonction pour charger les pièces depuis l'API
  //     WHY: Récupérer les données du serveur avec pagination
  const fetchParts = async () => {
    try {
      // [9a] Afficher le loader
      setLoading(true);

      // [9b] Appel API GET /v1/v1/parts?page=X
      //      Retourne: { items: Part[], hasMore: boolean, total: number }
      const response = await fetch(`${API_BASE}/v1/v1/parts?page=${page}`);
      const data = await response.json();

      // [9c] Vérifier le code de statut HTTP
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des pièces');
      }

      // [9d] Stocker les pièces et l'info de pagination
      setParts(data.items);
      setHasMore(data.hasMore);
    } catch (err: any) {
      // [9e] Afficher les erreurs
      setError(err.message);
    } finally {
      // [9f] Arrêter le loader
      setLoading(false);
    }
  };

  // [10] Fonction pour se déconnecter
  //      WHY: Nettoyer localStorage et rediriger vers l'accueil
  const handleLogout = () => {
    // [10a] Suppression des données stockées
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // [10b] Redirection vers l'accueil
    router.push('/');
  };

  // [11] Fonction pour ajouter une pièce au panier
  //      WHY: Incrémenter quantité si existe, ou ajouter nouvel item
  const addToCart = (part: Part) => {
    // [11a] Chercher si la pièce est déjà dans le panier
    const existingItem = cart.find((item) => item.id === part.id);

    let newCart: CartItem[];
    if (existingItem) {
      // [11b] Si existe: incrémenter la quantité
      newCart = cart.map((item) =>
        item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      // [11c] Si n'existe pas: ajouter nouvel item avec quantity=1
      newCart = [...cart, { ...part, quantity: 1 }];
    }

    // [11d] Mettre à jour l'état et localStorage
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  // [12] Fonction pour retirer une pièce du panier
  //      WHY: Supprimer complètement un item (pas juste décrémenter)
  const removeFromCart = (partId: string) => {
    // [12a] Filtrer pour exclure l'item
    const newCart = cart.filter((item) => item.id !== partId);
    // [12b] Mettre à jour l'état et localStorage
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  // [13] Fonction pour calculer le prix total du panier
  //      WHY: Somme de (prix × quantité) pour chaque item
  const getTotalPrice = () => {
    return cart
      .reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2); // [13a] Arrondir à 2 décimales
  };

  // [14] Fonction pour charger le profil utilisateur via API
  //      WHY: Tester le endpoint GET /v1/auth/me avec Bearer token
  const fetchProfile = async () => {
    // [14a] Récupérer le token d'authentification
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // [14b] Appel API GET /v1/auth/me avec Authorization Header
      const response = await fetch(`${API_BASE}/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // [14c] Si succès: afficher les données du profil
      if (response.ok) {
        const data = await response.json();
        alert(
          `✅ Profil chargé:\n\nID: ${data.id}\nEmail: ${data.email}\nCréé le: ${new Date(data.createdAt).toLocaleString('fr-FR')}`
        );
      }
    } catch (err: any) {
      // [14d] Afficher les erreurs
      alert('❌ Erreur: ' + err.message);
    }
  };

  if (loading && parts.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        fontFamily: 'system-ui',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e0e0e0',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>🔧 ALOVE Catalog</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Marketplace de pièces auto d'occasion
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {user && (
            <div
              style={{
                padding: '8px 16px',
                background: '#f0f0f0',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              👤 {user.email}
            </div>
          )}
          <button
            onClick={() => setShowCart(!showCart)}
            style={{
              padding: '10px 20px',
              border: '1px solid #ff8c00',
              borderRadius: '6px',
              background: cart.length > 0 ? '#ff8c00' : 'white',
              color: cart.length > 0 ? 'white' : '#ff8c00',
              cursor: 'pointer',
              fontWeight: '500',
              position: 'relative',
            }}
          >
            🛒 Panier{' '}
            {cart.length > 0 && <span style={{ marginLeft: '5px' }}>({cart.length})</span>}
          </button>
          <button
            onClick={fetchProfile}
            style={{
              padding: '10px 20px',
              border: '1px solid #667eea',
              borderRadius: '6px',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Mon Profil
          </button>
          <button
            onClick={() => router.push('/otp-test')}
            style={{
              padding: '10px 20px',
              border: '1px solid #52c41a',
              borderRadius: '6px',
              background: 'white',
              color: '#52c41a',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Tester OTP
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#ff4d4f',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {showCart && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
              <h2 style={{ margin: 0, color: '#333' }}>🛒 Votre Panier</h2>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                Le panier est vide. Ajoutez des pièces ! 📦
              </p>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px 0',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong>{item.title}</strong>
                        <div style={{ color: '#666', fontSize: '13px', marginTop: '5px' }}>
                          {item.price}€ × {item.quantity} ={' '}
                          <strong>{(parseFloat(item.price) * item.quantity).toFixed(2)}€</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: '#ff4d4f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                    Total: <span style={{ color: '#ff8c00' }}>{getTotalPrice()}€</span>
                  </span>
                  <button
                    style={{
                      background: '#ff8c00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                    onClick={() =>
                      alert(
                        `Commande passée ! Total: ${getTotalPrice()}€\n\nEn dev, la commande n'est pas vraiment passée.`
                      )
                    }
                  >
                    Passer la commande
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '15px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33',
              marginBottom: '20px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '30px' }}>
          <input
            type="text"
            placeholder="🔍 Rechercher une pièce..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <p style={{ color: '#666', fontSize: '14px', margin: '10px 0 0 0' }}>
              {filteredParts.length} résultat{filteredParts.length !== 1 ? 's' : ''} trouvé
              {filteredParts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredParts.map((part) => (
            <div
              key={part.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <h3
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '18px',
                  color: '#333',
                  minHeight: '48px',
                }}
              >
                {part.title}
              </h3>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#667eea',
                  }}
                >
                  {parseFloat(part.price).toFixed(2)} €
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    background: part.stock > 10 ? '#e6f7e6' : '#fff7e6',
                    color: part.stock > 10 ? '#52c41a' : '#fa8c16',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  Stock: {part.stock}
                </span>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f0f0f0',
                }}
              >
                Ajouté le {new Date(part.createdAt).toLocaleDateString('fr-FR')}
              </div>

              <button
                style={{
                  width: '100%',
                  marginTop: '15px',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#ff8c00',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e67e00')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#ff8c00')}
                onClick={() => {
                  addToCart(part);
                  alert(`✅ ${part.title} ajoutée au panier !`);
                }}
              >
                🛒 Ajouter au panier
              </button>
            </div>
          ))}
        </div>

        {filteredParts.length === 0 && searchQuery && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
            }}
          >
            <p style={{ fontSize: '48px', margin: '0 0 20px 0' }}>📦</p>
            <p style={{ fontSize: '18px' }}>Aucune pièce disponible</p>
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || hasMore) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginTop: '40px',
            }}
          >
            {page > 1 && (
              <button
                onClick={() => setPage(page - 1)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #667eea',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                ← Précédent
              </button>
            )}

            <span
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                borderRadius: '6px',
                fontWeight: '500',
              }}
            >
              Page {page}
            </span>

            {hasMore && (
              <button
                onClick={() => setPage(page + 1)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #667eea',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Suivant →
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
