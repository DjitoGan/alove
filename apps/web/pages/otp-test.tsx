/**
 * 📱 Page de test OTP - Vérification par SMS
 * 
 * [1] Dépendances
 *     - useState: gestion du formulaire et des états
 *     - useRouter: vérification authentification et redirection
 * 
 * Responsabilités:
 * - Afficher le formulaire de saisie du téléphone
 * - Générer un code OTP via l'API
 * - Afficher le formulaire de saisie du code
 * - Vérifier le code OTP via l'API
 * - Afficher les messages de succès/erreur
 */

import { useState } from 'react';
import { useRouter } from 'next/router';

// [2] Configuration API
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function OtpTestPage() {
  // [3] Hook useRouter pour vérification authentification
  const router = useRouter();
  
  // [4] États du formulaire OTP
  //     - phone: numéro de téléphone au format international (+225...)
  //     - otp: code à 6 chiffres saisi par l'utilisateur
  //     - otpGenerated: boolean pour afficher l'écran de saisie du code
  //     - loading: boolean pendant la requête API
  //     - error/success: messages de feedback
  const [phone, setPhone] = useState('+22500000000');
  const [otp, setOtp] = useState('');
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // [5] Fonction pour générer un OTP
  //     WHY: Centraliser la logique d'appel à l'API /otp/generate
  const handleGenerateOtp = async (e: React.FormEvent) => {
    // [5a] Prévent soumission formulaire par défaut
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // [5b] Vérifier que l'utilisateur est authentifié
    //      WHY: Les endpoints OTP nécessitent un JWT valide
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      // [5c] Appel API POST /v1/otp/generate
      //      WHY: Demander au backend de créer et envoyer un code OTP via SMS
      //      Headers: Authorization Bearer token pour authentifier la requête
      const response = await fetch(`${API_BASE}/v1/otp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      // [5d] Vérifier le code HTTP de la réponse
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la génération de l'OTP");
      }

      // [5e] Si succès: afficher l'écran de saisie du code
      //      WHY: L'utilisateur peut maintenant entrer le code reçu par SMS
      //      Note: En développement, afficher le code OTP reçu pour test
      setSuccess(
        `✅ OTP envoyé au ${phone}. En dev, le code est: ${data.otp || 'vérifie les logs'}`
      );
      setOtpGenerated(true);
    } catch (err: any) {
      // [5f] Afficher les erreurs réseau ou serveur
      setError(err.message);
    } finally {
      // [5g] Toujours arrêter le loading après la requête
      setLoading(false);
    }
  };

  // [6] Fonction pour vérifier le code OTP entré
  //     WHY: Centraliser la logique d'appel à l'API /otp/verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    // [6a] Prévent soumission formulaire par défaut
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // [6b] Vérifier que l'utilisateur est authentifié
    //      WHY: Les endpoints OTP nécessitent un JWT valide
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth');
      return;
    }

    try {
      // [6c] Appel API POST /v1/otp/verify
      //      WHY: Vérifier que le code OTP entré correspond au code envoyé
      //      Paramètres: phone (lié au code généré), otp (code 6 chiffres)
      const response = await fetch(`${API_BASE}/v1/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      // [6d] Vérifier le code HTTP de la réponse
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la vérification de l'OTP");
      }

      // [6e] Si succès: afficher message de confirmation
      //      WHY: Indiquer que la vérification est complète et le téléphone est confirmé
      setSuccess('✅ OTP vérifié avec succès ! Téléphone confirmé.');
    } catch (err: any) {
      // [6f] Afficher les erreurs (code invalide, expiré, etc.)
      setError(err.message);
    } finally {
      // [6g] Toujours arrêter le loading après la requête
      setLoading(false);
    }
  };

  // [7] Rendu JSX
  //     [7a] Conteneur principal avec gradient vert
  //     [7b] Carte blanche contenant le formulaire
  //     [7c] Affichage conditionnel: formulaire téléphone OU formulaire OTP

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
        <h1 style={{ marginBottom: '10px', color: '#333' }}>📱 Test OTP</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>Vérification par code SMS</p>

        {/* [7d] Étape 1: Saisie du numéro de téléphone */}
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

            {/* [7e] Messages d'erreur en rouge */}
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

            {/* [7f] Messages de succès en vert */}
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

            {/* [7g] Bouton pour générer l'OTP avec état loading */}
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
          /* [7h] Étape 2: Saisie et vérification du code OTP */
          <form onSubmit={handleVerifyOtp}>
            {/* [7h-i] Affichage du numéro auquel l'OTP a été envoyé */}
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
                📱 OTP envoyé au: <strong>{phone}</strong>
              </p>
            </div>

            {/* [7h-ii] Champ de saisie pour le code à 6 chiffres */}
            {/* WHY: Utiliser maxLength=6 et pattern="[0-9]{6}" pour forcer le format */}
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

            {/* [7h-iii] Messages d'erreur en rouge */}
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

            {/* [7h-iv] Messages de succès en vert */}
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

            {/* [7h-v] Bouton principal pour vérifier l'OTP */}
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

            {/* [7h-vi] Bouton secondaire pour recommencer le processus */}
            {/* WHY: Permettre à l'utilisateur de retourner à l'étape 1 */}
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

        {/* [8] Pieds de page avec liens de navigation */}
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
