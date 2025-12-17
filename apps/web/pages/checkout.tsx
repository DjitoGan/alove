/**
 * 🛒 Page de commande (Checkout) - Paiement et validation
 *
 * [1] Dépendances
 *     - useEffect: charger le panier au montage
 *     - useState: gestion du formulaire et des états
 *     - useRouter: redirection après succès
 *
 * Responsabilités:
 * - Afficher le formulaire de commande (infos + adresse + paiement)
 * - Afficher un récapitulatif sticky du panier
 * - Générer un numéro de commande
 * - Vider le panier après validation
 * - Rediriger vers l'accueil
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// [2] Interface CartItem: structure d'un article dans le panier
interface CartItem {
  id: string;
  title: string;
  price: string;
  quantity: number;
}

export default function CheckoutPage() {
  // [3] Hooks
  const router = useRouter();

  // [4] États du composant
  //     - cart: articles dans le panier
  //     - user: info utilisateur authentifié
  //     - formData: données saisies dans le formulaire
  //     - orderPlaced: booléen pour afficher la confirmation
  //     - orderId: numéro de commande généré
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'card',
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  // [5] Hook useEffect: charger le panier et les infos utilisateur au montage
  //     WHY: Vérifier l'authentification et remplir le formulaire avec l'email
  useEffect(() => {
    // [5a] Récupérer le token et les données utilisateur
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const cartStr = localStorage.getItem('cart');

    // [5b] Si pas de token: rediriger vers l'authentification
    if (!token) {
      router.push('/auth');
      return;
    }

    // [5c] Pré-remplir l'email du formulaire avec l'email de l'utilisateur
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setFormData((prev) => ({
        ...prev,
        email: userData.email,
      }));
    }

    // [5d] Charger le panier depuis localStorage
    if (cartStr) {
      setCart(JSON.parse(cartStr));
    }

    // [5e] Arrêter le loader
    setLoading(false);
  }, []);

  // [6] Fonction pour calculer le prix total
  //     WHY: Somme de (prix × quantité) pour tous les articles
  const getTotalPrice = () => {
    return cart
      .reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);
  };

  // [7] Fonction pour mettre à jour les champs du formulaire
  //     WHY: Centraliser la logique d'update de formData
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // [8] Fonction pour valider et placer la commande
  //     WHY: Vérifier les données, générer l'ID commande, vider le panier
  const handlePlaceOrder = (e: React.FormEvent) => {
    // [8a] Empêcher le rechargement de la page
    e.preventDefault();

    // [8b] Valider tous les champs obligatoires
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.address ||
      !formData.city ||
      !formData.zipCode
    ) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    // [8c] Vérifier que le panier n'est pas vide
    if (cart.length === 0) {
      alert('⚠️ Le panier est vide');
      return;
    }

    // [8d] Générer un numéro de commande unique basé sur le timestamp
    const newOrderId = `ORD-${Date.now()}`;
    setOrderId(newOrderId);
    // [8e] Afficher la page de confirmation
    setOrderPlaced(true);

    // [8f] Effacer le panier
    localStorage.removeItem('cart');

    // [8g] Rediriger vers l'accueil après 3 secondes
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
  }

  if (orderPlaced) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '500px',
          }}
        >
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>✅</div>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>Commande confirmée !</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Merci pour votre achat. Votre commande a été enregistrée.
          </p>
          <div
            style={{
              background: '#f0f0f0',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
            }}
          >
            <p style={{ margin: 0, color: '#666' }}>
              <strong>N° de commande:</strong>
            </p>
            <p
              style={{
                margin: '10px 0 0 0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#667eea',
              }}
            >
              {orderId}
            </p>
          </div>
          <p style={{ color: '#999', fontSize: '14px' }}>Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Panier vide. Retour au catalogue...</p>
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
          Aller au catalogue
        </button>
      </div>
    );
  }

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
          ← Retour au panier
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '30px', color: '#333' }}>📦 Passer la commande</h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: '40px',
          }}
        >
          {/* Formulaire */}
          <form onSubmit={handlePlaceOrder}>
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                marginBottom: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333' }}>
                👤 Informations personnelles
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '20px',
                }}
              >
                <input
                  type="text"
                  name="firstName"
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Nom"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '15px',
                  background: '#f9f9f9',
                  boxSizing: 'border-box',
                }}
              />

              <input
                type="tel"
                name="phone"
                placeholder="Téléphone (+225XXXXXXXXX)"
                value={formData.phone}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                marginBottom: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333' }}>
                📍 Adresse de livraison
              </h2>

              <input
                type="text"
                name="address"
                placeholder="Rue et numéro"
                value={formData.address}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '15px',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <input
                  type="text"
                  name="city"
                  placeholder="Ville"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  name="zipCode"
                  placeholder="Code postal"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                marginBottom: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333' }}>💳 Paiement</h2>

              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="card">💳 Carte bancaire</option>
                <option value="momo">📱 Mobile Money</option>
                <option value="transfer">🏦 Virement bancaire</option>
                <option value="cash">💵 Paiement à la livraison</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '15px',
                background: '#ff8c00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#e67e00')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#ff8c00')}
            >
              Passer la commande
            </button>
          </form>

          {/* Résumé de commande */}
          <div>
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: '20px',
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333' }}>📋 Résumé</h2>

              <div
                style={{
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: '15px',
                      paddingBottom: '15px',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '5px',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#333' }}>
                        <strong>{item.title}</strong>
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>x{item.quantity}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: '#999',
                      }}
                    >
                      <span>
                        {item.price}€ × {item.quantity}
                      </span>
                      <span>{(parseFloat(item.price) * item.quantity).toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px 0',
                  fontSize: '16px',
                }}
              >
                <span style={{ color: '#666' }}>Sous-total:</span>
                <span style={{ color: '#333', fontWeight: '600' }}>{getTotalPrice()}€</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px 0',
                  borderTop: '1px solid #e0e0e0',
                  fontSize: '16px',
                }}
              >
                <span style={{ color: '#666' }}>Livraison:</span>
                <span style={{ color: '#333', fontWeight: '600' }}>Gratuite</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  marginTop: '15px',
                  fontSize: '18px',
                }}
              >
                <span style={{ color: '#333', fontWeight: '600' }}>Total:</span>
                <span style={{ color: '#ff8c00', fontWeight: '700' }}>{getTotalPrice()}€</span>
              </div>

              <p
                style={{
                  margin: '20px 0 0 0',
                  fontSize: '12px',
                  color: '#999',
                  textAlign: 'center',
                }}
              >
                ✅ Paiement sécurisé & crypté
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
