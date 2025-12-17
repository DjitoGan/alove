/**
 * 🔐 Page d'authentification - Inscription et Connexion
 *
 * [1] Import des dépendances
 *     - useState: gestion du formulaire et des états
 *     - useRouter: redirection après succès
 *
 * [2] Configuration API
 *     - API_BASE: URL de l'API (variable d'environnement ou localhost)
 *
 * Responsabilités:
 * - Afficher les onglets Inscription/Connexion
 * - Récupérer email et password depuis le formulaire
 * - Envoyer les données à l'API
 * - Stocker les tokens JWT dans localStorage
 * - Rediriger vers le catalogue
 */

import { useState } from 'react';
import { useRouter } from 'next/router';

// [3] Configuration API depuis les variables d'environnement
//     WHY: Permettre différents environnements (dev, prod) sans hardcoder l'URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function AuthPage() {
  // [4] Hook de routeur pour redirection après authentification
  const router = useRouter();

  // [5] États du formulaire et de la requête API
  //     - mode: 'login' ou 'register' pour basculer entre les onglets
  //     - email/password: données saisies par l'utilisateur
  //     - loading: boolean pour désactiver le bouton pendant la requête
  //     - error/success: messages d'état pour l'UX
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // [6] Fonction de gestion du formulaire
  //     WHY: Centraliser la logique d'authentification (inscription/connexion)
  const handleSubmit = async (e: React.FormEvent) => {
    // [6a] Empêcher le rechargement de la page (comportement par défaut du formulaire)
    e.preventDefault();

    // [6b] Réinitialiser les états pour une nouvelle tentative
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // [6c] Déterminer l'endpoint selon le mode (login ou register)
      const endpoint = mode === 'login' ? '/v1/auth/login' : '/v1/auth/register';

      // [6d] Appel API fetch avec configuration
      //      - method: 'POST' car on envoie des données
      //      - headers: JSON pour que l'API comprenne le format
      //      - body: email et password sérialisés en JSON
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // [6e] Parser la réponse JSON (contient user + tokens JWT)
      const data = await response.json();

      // [6f] Vérifier si la requête s'est bien passée
      //      WHY: response.ok = true si status 200-299, false sinon
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'authentification");
      }

      // [6g] Stocker les tokens JWT dans localStorage
      //      WHY: Permettre à l'app d'accéder au token pour les requêtes protégées
      //      - accessToken: utilisé dans le header Authorization: Bearer <token>
      //      - refreshToken: pour renouveler le token expiré (implémentation future)
      //      - user: info utilisateur sérialisée pour l'affichage immédiat
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // [6h] Message de succès conditionnel selon le mode
      setSuccess(mode === 'login' ? 'Connexion réussie !' : 'Inscription réussie !');

      // [6i] Redirection vers le catalogue
      //      WHY: Laisser l'utilisateur voir le message de succès 1 seconde
      //      puis le rediriger vers l'espace principal
      setTimeout(() => {
        router.push('/catalog');
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'system-ui',
      }}
    >
      {/* [7] Carte d'authentification avec formulaire */}
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          minWidth: '400px',
        }}
      >
        {/* [7a] Titre dynamique selon le mode (login/register) */}
        <h1 style={{ marginBottom: '10px', color: '#333' }}>
          {mode === 'login' ? '🔐 Connexion' : '📝 Inscription'}
        </h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>ALOVE - Marketplace de pièces auto</p>

        {/* [7b] Onglets pour basculer entre login et register */}
        {/* WHY: Style onglet avec couleur active et inactive */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: mode === 'login' ? '#667eea' : '#f0f0f0',
              color: mode === 'login' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: mode === 'register' ? '#667eea' : '#f0f0f0',
              color: mode === 'register' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Inscription
          </button>
        </div>

        {/* [7c] Formulaire d'authentification */}
        <form onSubmit={handleSubmit}>
          {/* [7c-i] Champ Email */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
              placeholder="votre@email.com"
            />
          </div>

          {/* [7c-ii] Champ Password avec validation minLength=8 */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
            <small style={{ color: '#666', fontSize: '13px' }}>Minimum 8 caractères</small>
          </div>

          {/* [7c-iii] Message d'erreur en rouge */}
          {error && (
            <div
              style={{
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c33',
                marginBottom: '20px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* [7c-iv] Message de succès en vert */}
          {success && (
            <div
              style={{
                padding: '12px',
                background: '#efe',
                border: '1px solid #cfc',
                borderRadius: '6px',
                color: '#3c3',
                marginBottom: '20px',
              }}
            >
              ✅ {success}
            </div>
          )}

          {/* [7c-v] Bouton de soumission avec état loading */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '6px',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        {/* [8] Lien de retour à l'accueil */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
