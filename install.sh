#!/bin/bash
# Script d'installation et démarrage rapide du Sprint 0

set -e

echo "🚀 ALOVE - Sprint 0 - Installation"
echo "===================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier les prérequis
info "Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose n'est pas installé"
    exit 1
fi

success "Prérequis OK"
echo ""

# Installation des dépendances API
info "Installation des dépendances API..."
cd apps/api
npm install
success "Dépendances API installées"
echo ""

# Installation des dépendances Web
info "Installation des dépendances Web..."
cd ../web
npm install
success "Dépendances Web installées"
echo ""

# Retour à la racine
cd ../..

# Démarrage Docker
info "Démarrage de l'infrastructure Docker..."
cd infra
docker compose up -d
success "Docker démarré"
echo ""

# Attendre que les services soient prêts
info "Attente du démarrage des services (30s)..."
sleep 30

# Générer le client Prisma
info "Génération du client Prisma..."
docker compose exec -T api npx prisma generate
success "Client Prisma généré"
echo ""

# Migrations
info "Exécution des migrations..."
docker compose exec -T api npx prisma migrate deploy
success "Migrations appliquées"
echo ""

# Seed
info "Seed de la base de données..."
docker compose exec -T api npm run seed
success "Données de seed insérées"
echo ""

echo ""
echo "🎉 Installation terminée avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "  - Frontend: http://localhost:3000"
echo "  - API: http://localhost:3001/v1/health"
echo "  - MinIO Console: http://localhost:9001 (alove / alovealove)"
echo ""
echo "🧪 Pour lancer les tests:"
echo "  cd apps/api"
echo "  npm run test:e2e"
echo ""
echo "📖 Documentation complète: ./SPRINT0_SETUP.md"
