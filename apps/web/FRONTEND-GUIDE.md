# 🎨 ALOVE Frontend - Guide Complet

## Vue d'ensemble

Le frontend ALOVE est une application **Next.js** complète avec un design moderne et des fonctionnalités e-commerce avancées.

**URL:** http://localhost:3000

---

## 📑 Pages Disponibles

### 1. 🏠 Accueil (`/`)

- **URL:** http://localhost:3000
- **Description:** Page d'accueil avec présentation de l'application
- **Fonctionnalités:**
  - 4 cartes d'accès aux principales sections
  - Affichage conditionnel: boutons "Mon Compte" et "Catalogue" si connecté
  - Liens vers l'API health check

**Cartes d'accès:**

- 🔐 Authentification → `/auth`
- 🔧 Catalogue → `/catalog` (authentification requise)
- 📱 Test OTP → `/otp-test` (authentification requise)
- ❤️ API Health → API directe

---

### 2. 🔐 Authentification (`/auth`)

- **URL:** http://localhost:3000/auth
- **Description:** Page d'inscription et connexion
- **Fonctionnalités:**
  - Onglets pour basculer entre Inscription/Connexion
  - Stockage des tokens JWT (accessToken + refreshToken) dans localStorage
  - Stockage des données utilisateur dans localStorage
  - Redirection automatique vers le catalogue après connexion
  - Validation email et mot de passe (min 8 caractères)

**Flux:**

```
Accueil → Authentification → Saisie email/password → Tokens JWT → Catalogue
```

**Endpoints utilisés:**

- `POST /v1/auth/register` - Inscription
- `POST /v1/auth/login` - Connexion

---

### 3. 🔧 Catalogue (`/catalog`)

- **URL:** http://localhost:3000/catalog (authentification requise)
- **Description:** Marketplace principal avec liste de pièces détachées
- **Fonctionnalités:**
  - ✅ Affichage d'une grille de pièces détachées
  - ✅ Recherche en temps réel (filtrage par titre)
  - ✅ Panier persistant dans localStorage
  - ✅ Ajout/suppression d'articles au panier
  - ✅ Affichage du panier en overlay
  - ✅ Calcul automatique du total
  - ✅ Pagination si nécessaire
  - ✅ Boutons: Mon Profil, Tester OTP, Déconnexion

**Grille de pièces:**

- Affichage: titre, prix, stock
- Couleur stock: vert (>10), orange (<10)
- Bouton "Ajouter au panier" orange
- Confirmation visuelle lors de l'ajout

**Panier:**

- Bouton dans le header avec compteur (nombre d'articles)
- Affichage détaillé: titre, prix unitaire × quantité
- Bouton "Supprimer" par article
- Total calculé automatiquement
- Bouton "Passer la commande" → `/checkout`

**Endpoints utilisés:**

- `GET /v1/v1/parts?page=1` - Lister les pièces
- `GET /v1/auth/me` - Récupérer le profil

---

### 4. 📦 Détails d'une pièce (`/part-details`)

- **URL:** http://localhost:3000/part-details?id={part_id}
- **Description:** Page détaillée d'une pièce unique
- **Fonctionnalités:**
  - 🖼️ Image placeholder (gradient bleu)
  - ⭐ Système d'avis (mock data avec 3 avis)
  - 💰 Prix en grand format
  - 📊 Indicateur stock (rouge/vert)
  - 🛒 Sélecteur de quantité (+/- buttons)
  - ✅ Bouton "Ajouter au panier" avec prix total
  - 📝 Avis clients (mock data)

**Informations affichées:**

- Titre complet
- Prix
- Stock disponible
- ID produit (8 premiers caractères)
- Date d'ajout et dernière mise à jour
- 3 avis clients avec note 5 étoiles

**Flux:**

```
Catalogue → Cliquer sur pièce → Page détails → Ajouter au panier → Retour catalog
```

---

### 5. 🛒 Checkout / Passer la commande (`/checkout`)

- **URL:** http://localhost:3000/checkout
- **Description:** Page de paiement et validation de commande
- **Fonctionnalités:**
  - 👤 Formulaire d'informations personnelles (prénom, nom, email, téléphone)
  - 📍 Adresse de livraison (rue, ville, code postal)
  - 💳 Choix du mode de paiement:
    - 💳 Carte bancaire
    - 📱 Mobile Money
    - 🏦 Virement bancaire
    - 💵 Paiement à la livraison
  - 📋 Résumé de panier sticky
  - 💰 Total avec livraison gratuite
  - ✅ Confirmation de commande (avec numéro généré)

**Validations:**

- Tous les champs obligatoires
- Email pré-rempli (non modifiable)
- Génération d'un numéro de commande: `ORD-{timestamp}`
- Effacement automatique du panier après succès
- Redirection vers accueil après 3 secondes

**Endpoints utilisés:**

- Aucun (simulation locale pour dev)

---

### 6. 📱 Test OTP (`/otp-test`)

- **URL:** http://localhost:3000/otp-test (authentification requise)
- **Description:** Interface de test pour la vérification OTP par SMS
- **Fonctionnalités:**
  - 📞 Saisie du numéro de téléphone (format international)
  - 🔐 Génération d'un code OTP
  - 🔢 Saisie du code à 6 chiffres
  - ✅ Vérification du code
  - 🔄 Possibilité de générer un nouveau code

**Flux:**

1. Saisir le numéro de téléphone
2. Cliquer "Générer OTP"
3. Voir le code en dev (affiché dans l'alerte)
4. Saisir le code
5. Cliquer "Vérifier OTP"
6. Confirmation du succès

**Endpoints utilisés:**

- `POST /v1/otp/generate` - Générer un code OTP
- `POST /v1/otp/verify` - Vérifier le code OTP

---

### 7. 📊 Mon Compte / Dashboard (`/dashboard`)

- **URL:** http://localhost:3000/dashboard (authentification requise)
- **Description:** Tableau de bord utilisateur
- **Fonctionnalités:**
  - 👤 Affichage des infos de compte (email, ID, date d'inscription)
  - 📊 Statistiques:
    - Nombre total de commandes
    - Nombre de commandes complétées
    - Total dépensé
  - 📋 Historique des commandes avec:
    - Numéro de commande
    - Date
    - Nombre d'articles
    - Montant total
    - Statut (✅ Livrée / ⏳ En cours / ❌ Annulée)
  - 🔄 Bouton "Actualiser" pour faire un appel API
  - 🚪 Bouton "Déconnexion" dans le header

**Statistiques (mock data):**

- 3 commandes total
- 2 complétées
- Total: 260.49€

**Endpoints utilisés:**

- `GET /v1/auth/me` - Récupérer les infos du profil

---

## 🔒 Gestion de l'Authentification

### Tokens JWT

Les tokens sont stockés dans `localStorage`:

```javascript
localStorage.getItem('accessToken'); // JWT pour les requêtes API
localStorage.getItem('refreshToken'); // JWT pour renouveler le token
localStorage.getItem('user'); // Objet User sérialisé
```

### Protection des routes

Toutes les pages nécessitant une authentification redirigent automatiquement vers `/auth` si le token n'est pas présent.

### Appels API protégés

Les requêtes protégées incluent le header:

```javascript
'Authorization': `Bearer ${token}`
```

---

## 💾 Gestion du panier

### Stockage local

Le panier est persistant dans `localStorage`:

```javascript
localStorage.setItem('cart', JSON.stringify(cartItems));
```

### Structure d'un article:

```javascript
{
  id: string,
  title: string,
  price: string,
  stock: number,
  createdAt: string,
  quantity: number  // Ajouté au panier
}
```

### Opérations:

- ➕ Ajouter au panier
- ➖ Supprimer du panier
- 🔄 Affichage du total

---

## 🎨 Design & Styles

### Couleurs principales:

- **Primaire:** `#667eea` (Bleu-violet)
- **Secondaire:** `#ff8c00` (Orange)
- **Succès:** `#52c41a` (Vert)
- **Alerte:** `#fa8c16` (Orange clair)
- **Danger:** `#ff4d4f` (Rouge)

### Typographie:

- Police: `system-ui` (système)
- Responsive: Grid CSS avec breakpoints auto

### Composants réutilisables:

- Boutons avec hover effects
- Cartes avec shadow et hover animation
- Formulaires avec validation
- Alerts (success/error)

---

## 🚀 Flux utilisateur complet

```
1. Accueil (/)
   ↓
2. Authentification (/auth)
   ├─ Inscription → Post /v1/auth/register
   └─ Connexion → Post /v1/auth/login
   ↓
3. Catalogue (/catalog)
   ├─ Recherche & filtrage
   ├─ Ajouter au panier
   ├─ Voir profil (Get /v1/auth/me)
   └─ Tester OTP
   ↓
4. Détails pièce (/part-details)
   ├─ Lire les avis
   ├─ Sélectionner quantité
   └─ Ajouter au panier
   ↓
5. Panier (overlay dans /catalog)
   ├─ Revoir les articles
   └─ Passer la commande
   ↓
6. Checkout (/checkout)
   ├─ Infos personnelles
   ├─ Adresse livraison
   ├─ Paiement
   └─ Confirmation
   ↓
7. Dashboard (/dashboard)
   ├─ Voir profil
   ├─ Historique commandes
   └─ Statistiques
```

---

## 🧪 Tester les fonctionnalités

### Test complet:

```bash
# 1. Aller à l'accueil
http://localhost:3000

# 2. S'inscrire (Authentification)
Email: test@alove.com
Password: Test123456!

# 3. Ajouter des pièces au panier
http://localhost:3000/catalog

# 4. Passer une commande
http://localhost:3000/checkout

# 5. Voir l'historique
http://localhost:3000/dashboard

# 6. Tester OTP
http://localhost:3000/otp-test
Phone: +22500000000
```

---

## 📝 Notes pour le développement

- **Mock data:** Les avis clients et l'historique de commandes sont des données fictives
- **Appels API:** La plupart des endpoints matériel sont connectés à l'API NestJS
- **Panier:** Entièrement géré en localStorage (pas d'appel API pour le moment)
- **Validation:** Email et password sont validés côté client et serveur
- **Erreurs:** Affichées dans des alertes ou panels d'erreur

---

## 🔗 Endpoints API utilisés

| Méthode | Endpoint            | Page                     | Authentification |
| ------- | ------------------- | ------------------------ | ---------------- |
| POST    | `/v1/auth/register` | `/auth`                  | ❌               |
| POST    | `/v1/auth/login`    | `/auth`                  | ❌               |
| GET     | `/v1/auth/me`       | `/catalog`, `/dashboard` | ✅               |
| GET     | `/v1/v1/parts`      | `/catalog`               | ❌               |
| POST    | `/v1/otp/generate`  | `/otp-test`              | ✅               |
| POST    | `/v1/otp/verify`    | `/otp-test`              | ✅               |

---

## 🐛 Troubleshooting

### Le panier ne persiste pas

→ Vérifier que `localStorage` est activé dans le navigateur

### Les appels API échouent

→ Vérifier que l'API NestJS fonctionne: http://localhost:3001/v1/health

### Redirection vers /auth

→ Token JWT expiré ou absent, se reconnecter

### Erreur CORS

→ Vérifier que `NEXT_PUBLIC_API_BASE` pointe vers `http://localhost:3001`

---

## 📞 Support

Pour tester l'ensemble de l'application:

1. Assurer que l'API (`http://localhost:3001`) est fonctionnelle
2. Assurer que le frontend (`http://localhost:3000`) est lancé
3. Suivre le flux utilisateur décrit ci-dessus
4. Utiliser les données de test fournies

**Bon shopping ! 🛍️**
