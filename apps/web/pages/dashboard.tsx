/**
 * 📊 Page du tableau de bord utilisateur - Compte et historique
 *
 * [1] Dépendances
 *     - useEffect: charger infos utilisateur au montage
 *     - useState: gestion d'état (user, orders, etc.)
 *     - useRouter: vérification authentification et navigation
 *
 * Responsabilités:
 * - Afficher les infos de compte (email, ID, date inscription)
 * - Afficher les statistiques (commandes, montant dépensé, etc.)
 * - Lister l'historique des commandes avec statuts
 * - Permettre le logout
 * - Appeler l'API pour actualiser les infos
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// [2] Configuration API
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

// [3] Interface User: infos utilisateur authentifié
interface User {
  id: string;
  email: string;
  createdAt: string;
}

// [4] Interface Order: structure d'une commande passée
//     WHY: Typage pour l'historique des commandes
interface Order {
  id: string; // Numéro de commande
  totalPrice: string; // Montant total en euros
  status: 'pending' | 'completed' | 'cancelled'; // Statut de livraison
  createdAt: string; // Date de la commande
  items: number; // Nombre d'articles
}

export default function DashboardPage() {
  // [5] Hooks
  const router = useRouter();

  // [6] États du composant
  //     - user: infos utilisateur authentifié
  //     - orders: mock data de l'historique des commandes
  //     - loading: loader pendant le chargement initial
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ORD-1702774800000',
      totalPrice: '125.50',
      status: 'completed',
      createdAt: '2025-12-10',
      items: 3,
    },
    {
      id: 'ORD-1702861200000',
      totalPrice: '89.99',
      status: 'completed',
      createdAt: '2025-12-11',
      items: 2,
    },
    {
      id: 'ORD-1702947600000',
      totalPrice: '45.00',
      status: 'pending',
      createdAt: '2025-12-12',
      items: 1,
    },
  ]);

  // [7] Hook useEffect: charger les infos utilisateur au montage
  //     WHY: Vérifier l'authentification et récupérer les données de l'utilisateur
  useEffect(() => {
    // [7a] Récupérer le token et les données utilisateur depuis localStorage
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    // [7b] Si pas de token: rediriger vers l'authentification
    if (!token) {
      router.push('/auth');
      return;
    }

    // [7c] Si l'utilisateur existe: mettre à jour l'état
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    // [7d] Arrêter le loader
    setLoading(false);
  }, []);

  // [8] Fonction pour se déconnecter
  //     WHY: Nettoyer localStorage et rediriger vers l'accueil
  const handleLogout = () => {
    // [8a] Suppression des données stockées
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // [8b] Redirection vers l'accueil
    router.push('/');
  };

  // [9] Fonction pour charger le profil depuis l'API
  //      WHY: Tester le endpoint GET /v1/auth/me et afficher les données actualisées
  const fetchProfileFromAPI = async () => {
    // [9a] Récupérer le token d'authentification
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // [9b] Appel API GET /v1/auth/me avec Authorization Header
      const response = await fetch(`${API_BASE}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // [9c] Si succès: afficher les données du profil dans une alerte
      if (response.ok) {
        const data = await response.json();
        // [9d] Calculer le nombre de jours depuis l'inscription
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        alert(
          `✅ Profil:\n\nID: ${data.id}\nEmail: ${data.email}\nCréé le: ${new Date(data.createdAt).toLocaleString('fr-FR')}\n\nCompte actif depuis ${daysSinceCreation} jours`
        );
      }
    } catch (err: any) {
      // [9e] Afficher les erreurs
      alert('❌ Erreur: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>👤 Mon Compte</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>Bienvenue sur votre espace personnel ALOVE</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* [10] Contenu principal du dashboard */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* [10a] Carte d'informations utilisateur */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#333' }}>
                ℹ️ Informations de compte
              </h2>
              {/* [10a-i] Affichage des données utilisateur (email, ID, date) */}
              {user && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>Email</p>
                    <p
                      style={{
                        margin: '5px 0 0 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '16px',
                      }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>ID Utilisateur</p>
                    <p
                      style={{
                        margin: '5px 0 0 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {user.id}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>Membre depuis</p>
                    <p
                      style={{
                        margin: '5px 0 0 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '16px',
                      }}
                    >
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* [10a-ii] Bouton pour actualiser les données depuis l'API */}
            <button
              onClick={fetchProfileFromAPI}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Actualiser
            </button>
          </div>

          {/* [10a-iii] Statistiques de l'utilisateur */}
          {/* WHY: Afficher le nombre de commandes, complétées et le montant dépensé */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              padding: '20px 0',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            {/* Stat 1: Total de commandes */}
            <div
              style={{
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontSize: '32px' }}>📦</p>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Commandes</p>
              <p
                style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#333' }}
              >
                {orders.length}
              </p>
            </div>

            {/* Stat 2: Commandes complétées */}
            <div
              style={{
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontSize: '32px' }}>✅</p>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Complétées</p>
              <p
                style={{
                  margin: '5px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#52c41a',
                }}
              >
                {orders.filter((o) => o.status === 'completed').length}
              </p>
            </div>

            {/* Stat 3: Montant total dépensé */}
            {/* WHY: Utiliser reduce() pour faire la somme de tous les totaux */}
            <div
              style={{
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontSize: '32px' }}>💰</p>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total dépensé</p>
              <p
                style={{
                  margin: '5px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ff8c00',
                }}
              >
                {orders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>

        {/* [10b] Section historique des commandes */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ margin: '0 0 30px 0', fontSize: '24px', color: '#333' }}>
            📋 Mes commandes
          </h2>

          {orders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              Aucune commande pour le moment
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                          Numéro de commande
                        </p>
                        <p
                          style={{
                            margin: '5px 0 0 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333',
                            fontFamily: 'monospace',
                          }}
                        >
                          {order.id}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Date</p>
                        <p
                          style={{
                            margin: '5px 0 0 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333',
                          }}
                        >
                          {order.createdAt}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Articles</p>
                        <p
                          style={{
                            margin: '5px 0 0 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333',
                          }}
                        >
                          {order.items}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Montant total</p>
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#ff8c00',
                        }}
                      >
                        {parseFloat(order.totalPrice).toFixed(2)}€
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background:
                          order.status === 'completed'
                            ? '#e6f7e6'
                            : order.status === 'pending'
                              ? '#fff7e6'
                              : '#fee',
                        color:
                          order.status === 'completed'
                            ? '#52c41a'
                            : order.status === 'pending'
                              ? '#fa8c16'
                              : '#c33',
                      }}
                    >
                      {order.status === 'completed' && '✅ Livrée'}
                      {order.status === 'pending' && '⏳ En cours'}
                      {order.status === 'cancelled' && '❌ Annulée'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
          <button
            onClick={() => router.push('/catalog')}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Continuer les achats
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Accueil
          </button>
        </div>
      </main>
    </div>
  );
}
