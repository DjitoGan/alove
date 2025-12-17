FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Copier uniquement les manifestes pour bénéficier du cache Docker
COPY package.json package-lock.json ./

# Installation déterministe des deps (inclut dev pour générer Prisma)
RUN npm ci --legacy-peer-deps

# Copier le reste du code
COPY . .

# Génération Prisma Client et build TypeScript
RUN npx prisma generate && npm run build

# Retirer les devDependencies pour l'image finale
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

# Démarrage production (Node sur dist)
CMD ["npm", "run", "start"]
