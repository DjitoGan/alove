// apps/web/lib/i18n.ts
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const translations = {
  en: {
    common: {
      appName: 'ALOVE',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    home: {
      title: 'ALOVE - Auto Parts Marketplace',
      subtitle: 'Find quality used auto parts in West Africa',
      apiBase: 'API Base',
      defaultLanguage: 'Default Language',
      checkApiHealth: 'Check API Health',
    },
    nav: {
      home: 'Home',
      catalog: 'Catalog',
      orders: 'Orders',
      account: 'Account',
    },
  },
  fr: {
    common: {
      appName: 'ALOVE',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
    },
    home: {
      title: 'ALOVE - Marketplace de Pièces Auto',
      subtitle: "Trouvez des pièces auto d'occasion de qualité en Afrique de l'Ouest",
      apiBase: "URL de l'API",
      defaultLanguage: 'Langue par défaut',
      checkApiHealth: "Vérifier la santé de l'API",
    },
    nav: {
      home: 'Accueil',
      catalog: 'Catalogue',
      orders: 'Commandes',
      account: 'Compte',
    },
  },
};

export function getTranslation(locale: Locale = defaultLocale) {
  return translations[locale] || translations[defaultLocale];
}
