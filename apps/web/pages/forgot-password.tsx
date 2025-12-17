/**
 * 🔑 Page de demande de réinitialisation de mot de passe
 *
 * Responsabilités:
 * - Afficher un champ pour saisir l'email
 * - Envoyer une demande de reset à l'API
 * - Afficher un message de succès (même si email n'existe pas pour la sécurité)
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Échec de la demande');
        }

        setSuccess(
          'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
        );
        setEmail('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    },
    [email]
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
        <h1 style={{ marginBottom: '10px', color: '#333' }}>🔑 Mot de passe oublié</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
              }}
              required
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
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
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
