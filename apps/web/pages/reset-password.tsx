/**
 * 🔐 Page de réinitialisation de mot de passe
 *
 * Responsabilités:
 * - Récupérer le token depuis l'URL (?token=...)
 * - Afficher un formulaire pour nouveau mot de passe + confirmation
 * - Envoyer le token et le nouveau mot de passe à l'API
 * - Rediriger vers la page de connexion après succès
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Récupérer le token depuis l'URL
  useEffect(() => {
    if (router.isReady) {
      const tokenParam = router.query.token as string;
      if (tokenParam) {
        setToken(tokenParam);
      } else {
        setError('Token manquant. Vérifiez le lien dans votre email.');
      }
    }
  }, [router.isReady, router.query.token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      // Validation côté client
      if (newPassword.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/v1/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Échec de la réinitialisation');
        }

        setSuccess('Mot de passe réinitialisé avec succès ! Redirection vers la connexion...');

        // Redirection après succès
        setTimeout(() => {
          router.push('/auth');
        }, 2000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    },
    [token, newPassword, confirmPassword, router]
  );

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
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          minWidth: '400px',
          maxWidth: '500px',
        }}
      >
        <h1 style={{ marginBottom: '10px', color: '#333' }}>🔐 Nouveau mot de passe</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500',
              }}
            >
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 8 caractères"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
              required
              minLength={8}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500',
              }}
            >
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                background: '#fee',
                color: '#c33',
                borderRadius: '6px',
                marginBottom: '15px',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '12px',
                background: '#efe',
                color: '#3c3',
                borderRadius: '6px',
                marginBottom: '15px',
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !token ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !token ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/auth')}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px',
            }}
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
