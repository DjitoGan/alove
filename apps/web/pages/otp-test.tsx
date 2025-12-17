/**
 * Page de test OTP (Next.js)
 * Génération et vérification d'un code OTP via l'API
 */

import { useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function OtpTestPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+22500000000');
  const [otp, setOtp] = useState('');
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateOtp = async (e: React.FormEvent) => {
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
      const response = await fetch(`${API_BASE}/v1/otp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la génération de l'OTP");
      }

      setSuccess(`OTP envoyé au ${phone}. En dev: ${data.otp || 'voir logs'}`);
      setOtpGenerated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
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
      const response = await fetch(`${API_BASE}/v1/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la vérification de l'OTP");
      }

      setSuccess('OTP vérifié avec succès.');
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
        background: 'linear-gradient(135deg, #52c41a 0%, #237804 100%)',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          minWidth: '500px',
        }}
      >
        <h1 style={{ marginBottom: '10px', color: '#333' }}>Test OTP</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>Vérification par code SMS</p>

        {!otpGenerated ? (
          <form onSubmit={handleGenerateOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}
              >
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                placeholder="+225XXXXXXXXX"
              />
              <small style={{ color: '#666', fontSize: '13px' }}>
                Format international (ex: +22500000000)
              </small>
            </div>

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

            {success && (
              <div
                style={{
                  padding: '12px',
                  background: '#efe',
                  border: '1px solid #cfc',
                  borderRadius: '6px',
                  color: '#237804',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap',
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
                border: 'none',
                borderRadius: '6px',
                background: loading ? '#ccc' : '#52c41a',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Envoi...' : 'Générer OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div
              style={{
                padding: '15px',
                background: '#e6f7e6',
                border: '1px solid #b7eb8f',
                borderRadius: '6px',
                marginBottom: '20px',
              }}
            >
              <p style={{ margin: 0, color: '#237804', fontSize: '14px' }}>
                OTP envoyé au: <strong>{phone}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}
              >
                Code OTP (6 chiffres)
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: 'bold',
                  boxSizing: 'border-box',
                }}
                placeholder="000000"
              />
            </div>

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

            {success && (
              <div
                style={{
                  padding: '12px',
                  background: '#efe',
                  border: '1px solid #cfc',
                  borderRadius: '6px',
                  color: '#237804',
                  marginBottom: '20px',
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
                border: 'none',
                borderRadius: '6px',
                background: loading ? '#ccc' : '#52c41a',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginBottom: '10px',
              }}
            >
              {loading ? 'Vérification...' : 'Vérifier OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpGenerated(false);
                setOtp('');
                setError('');
                setSuccess('');
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                background: 'white',
                color: '#666',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Générer un nouveau code
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '30px',
            textAlign: 'center',
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
          }}
        >
          <a href="/catalog" style={{ color: '#52c41a', textDecoration: 'none', fontSize: '14px' }}>
            ← Retour au catalogue
          </a>
          <span style={{ color: '#d9d9d9' }}>|</span>
          <a href="/" style={{ color: '#52c41a', textDecoration: 'none', fontSize: '14px' }}>
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
