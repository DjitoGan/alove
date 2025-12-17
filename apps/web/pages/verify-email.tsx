/**
 * 📧 Page de vérification d'email
 *
 * Responsabilités:
 * - Afficher un champ pour saisir le code OTP à 6 chiffres
 * - Envoyer le code à l'API pour vérification
 * - Permettre de renvoyer l'OTP si expiré
 * - Rediriger vers le catalogue après vérification réussie
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth');
    }
  }, [router]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/auth');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/v1/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Échec de la vérification');
        }

        setSuccess('Email vérifié avec succès !');

        // Redirection après succès
        setTimeout(() => {
          router.push('/catalog');
        }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    },
    [code, router]
  );

  const handleResendOtp = useCallback(async () => {
    setResending(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/v1/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de l\'envoi de l\'OTP');
      }

      setSuccess('Un nouveau code a été envoyé à votre email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setResending(false);
    }
  }, [router]);

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
        <h1 style={{ marginBottom: '10px', color: '#333' }}>📧 Vérifiez votre email</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>
          Un code de vérification à 6 chiffres a été envoyé à votre adresse email.
        </p>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500',
              }}
            >
              Code de vérification
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '0.5em',
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
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || code.length !== 6 ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              marginBottom: '15px',
            }}
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: resending ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
              }}
            >
              {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/catalog')}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Retour au catalogue
          </button>
        </div>
      </div>
    </div>
  );
}
