/**
 * 🏠 Page d'accueil ALOVE - Entrée principale de l'application
 *
 * [1] Import des dépendances Next.js et React
 *     - GetStaticProps: pour SSG (Static Site Generation) avec i18n
 *     - useRouter: navigation côté client
 *     - useState, useEffect: gestion d'état et cycle de vie
 *
 * [2] Interfaces TypeScript pour typage
 *     - HomeProps: props passés au composant (locale, traductions)
 *
 * Responsabilités du composant:
 * - Afficher la page d'accueil avec cartes d'accès
 * - Vérifier si l'utilisateur est authentifié
 * - Afficher les boutons "Mon Compte" et "Catalogue" si connecté
 * - Navigation vers les différentes sections
 */

import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getTranslation, Locale } from '../lib/i18n';

interface HomeProps {
  locale: Locale;
  t: ReturnType<typeof getTranslation>;
}

export default function Home({ t }: HomeProps) {
  // [3] Hook useRouter pour navigation programmatique
  const router = useRouter();

  // [4] État pour vérifier l'authentification
  //     - isLoggedIn: boolean qui détermine l'affichage des boutons du header
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // [5] Hook useEffect avec tableau vide [] = s'exécute UNE SEULE FOIS au montage
  //     WHY: Vérifier si un token JWT existe dans localStorage
  //     - Si token existe = utilisateur déjà authentifié
  //     - Afficher les boutons de navigation rapide
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    // [5a] Conversion booléenne: !!token = true si token existe, false sinon
    setIsLoggedIn(!!token);
  }, []);

  return (
    <main
      style={{
        padding: '40px 20px',
        fontFamily: 'system-ui',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* [6] En-tête avec titre et boutons contextuels */}
      {/* WHY: Affichage conditionnel des boutons si l'utilisateur est connecté */}
      <header
        style={{
          marginBottom: '40px',
          borderBottom: '2px solid #e5e5e5',
          paddingBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#1a1a1a' }}>
            {t.home.title}
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>{t.home.subtitle}</p>
        </div>
        {/* [6a] Boutons de navigation rapide - visibles seulement si authentifié */}
        {isLoggedIn && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/dashboard')}
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
              📊 Mon Compte
            </button>
            <button
              onClick={() => router.push('/catalog')}
              style={{
                padding: '10px 20px',
                background: '#ff8c00',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              🔧 Catalogue
            </button>
          </div>
        )}
      </header>

      {/* [7] Section de configuration de l'application */}
      {/* Affiche l'API Base et la langue par défaut */}
      <section style={{ display: 'grid', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>{t.home.apiBase}</h3>
          <code
            style={{
              background: '#fff',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              display: 'inline-block',
            }}
          >
            {process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}
          </code>
        </div>

        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>{t.home.defaultLanguage}</h3>
          <strong style={{ fontSize: '1.1rem', color: '#0070f3' }}>
            {process.env.NEXT_PUBLIC_DEFAULT_LANG || 'fr'}
          </strong>
        </div>
      </section>

      {/* [8] Cartes d'accès principales vers les fonctionnalités */}
      {/* Grille responsive avec 250px minimum par colonne */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        {/* [8a] Carte Authentification */}
        <a
          href="/auth"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔐</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
            Authentification
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Inscription & Connexion</div>
        </a>

        <a
          href="/catalog"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔧</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>Catalogue</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Pièces détachées</div>
        </a>

        <a
          href="/cart"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛒</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>Panier</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Mon panier d&apos;achat</div>
        </a>

        <a
          href="/addresses"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: '#333',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📍</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>Adresses</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Mes adresses de livraison</div>
        </a>

        <a
          href="/admin"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #ffaf7b 0%, #d76d77 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛠️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>Admin</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Monitoring & sync</div>
        </a>

        <a
          href="/otp-test"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📱</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>Test OTP</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Vérification SMS</div>
        </a>

        <a
          href="http://localhost:3001/v1/health"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '30px 20px',
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: '500',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>❤️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>API Health</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Vérifier l&apos;API</div>
        </a>
      </section>

      <footer
        style={{
          marginTop: '60px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e5e5',
          color: '#666',
          fontSize: '0.9rem',
        }}
      >
        <p>© 2025 ALOVE - Sprint 0 MVP</p>
      </footer>
    </main>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const locale = (process.env.NEXT_PUBLIC_DEFAULT_LANG || 'fr') as Locale;
  const t = getTranslation(locale);

  return {
    props: {
      locale,
      t,
    },
  };
};
