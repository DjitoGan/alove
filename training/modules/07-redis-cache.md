# 📘 Module 7: Redis - Cache et Sessions

## 🎯 Objectifs

Après ce module, vous saurez:

- Qu'est-ce que Redis et pourquoi l'utiliser
- Structures de données Redis (String, List, Hash, Set, Sorted Set)
- Implémentation de cache avec Redis
- Intégration Redis + OTP dans ALOVE

---

## 1️⃣ Qu'est-ce que Redis ?

### Analogie

**Base de données normale** (PostgreSQL):

```
Disque dur (lent)
  ├─ Table User (10 000 lignes)
  ├─ Table Order (50 000 lignes)
  └─ ...

Requête: SELECT * FROM User WHERE id = 'abc123'
  1. Cherche dans l'index
  2. Lit depuis le disque
  3. Retourne le résultat
  Temps: ~5-10ms
```

**Redis** (cache en mémoire):

```
RAM (ultra rapide)
  ├─ user:abc123 → { id: 'abc123', email: '...', ... }
  ├─ session:xyz → { userId: 'abc123', ... }
  └─ ...

Get: redis.get('user:abc123')
  1. Cherche en RAM
  2. Retourne
  Temps: ~0.1ms (100x plus rapide!)
```

### Redis = In-Memory Data Store

```
Redis
├─ Stockage en RAM (ultra rapide)
├─ Persiste sur disque (optional)
├─ Expiration automatique (TTL)
├─ Structures de données riches (String, List, Hash, Set, etc.)
└─ Atomicité (transactions, scripts)
```

---

## 2️⃣ Structures de Données Redis

### 1. String (Chaîne)

```typescript
// SET: Stocker une valeur
await redis.set("username:alice", "Alice Smith");
await redis.set("otp:registration:alice@example.com", "123456", 300); // TTL 300s

// GET: Récupérer
const name = await redis.get("username:alice");
// Résultat: 'Alice Smith'

// APPEND: Ajouter à la fin
await redis.append("notes", " - important");

// INCR: Incrémenter (pour les compteurs)
await redis.incr("page:views"); // Premiere fois: 1
await redis.incr("page:views"); // Deuxième fois: 2

// DECR: Décrémenter
await redis.decr("stock:item123");
```

### 2. List (Listes Ordonnées)

```typescript
// LPUSH: Ajouter à gauche
await redis.lpush("messages:alice", "Bonjour");
await redis.lpush("messages:alice", "Salut");
// List: ['Salut', 'Bonjour']

// RPUSH: Ajouter à droite
await redis.rpush("queue:jobs", "job1", "job2", "job3");
// List: ['job1', 'job2', 'job3']

// LPOP: Retirer et récupérer de gauche (FIFO)
const msg = await redis.lpop("queue:jobs"); // 'job1'

// RPOP: Retirer et récupérer de droite (LIFO)
const msg = await redis.rpop("messages:alice"); // 'Bonjour'

// LRANGE: Obtenir une plage
const all = await redis.lrange("queue:jobs", 0, -1); // Tous les éléments
// Résultat: ['job2', 'job3']
```

### 3. Hash (Dictionnaires)

```typescript
// HSET: Définir un champ
await redis.hset("user:alice", "email", "alice@example.com");
await redis.hset("user:alice", "name", "Alice");
await redis.hset("user:alice", "age", "30");

// HGET: Récupérer un champ
const email = await redis.hget("user:alice", "email");
// Résultat: 'alice@example.com'

// HGETALL: Récupérer tous les champs
const user = await redis.hgetall("user:alice");
// Résultat: { email: 'alice@example.com', name: 'Alice', age: '30' }

// HDEL: Supprimer un champ
await redis.hdel("user:alice", "age");
```

### 4. Set (Ensembles Uniques)

```typescript
// SADD: Ajouter à l'ensemble
await redis.sadd("tags:article1", "javascript", "nodejs", "typescript");

// SMEMBERS: Obtenir tous les éléments
const tags = await redis.smembers("tags:article1");
// Résultat: ['javascript', 'nodejs', 'typescript'] (ordre aléatoire)

// SISMEMBER: Vérifier l'appartenance
const has = await redis.sismember("tags:article1", "javascript");
// Résultat: 1 (true)

// SREM: Retirer un élément
await redis.srem("tags:article1", "nodejs");

// SCARD: Compter les éléments
const count = await redis.scard("tags:article1");
// Résultat: 2
```

### 5. Sorted Set (Ensembles Triés par Score)

```typescript
// ZADD: Ajouter avec un score
await redis.zadd("leaderboard", 100, "alice");
await redis.zadd("leaderboard", 85, "bob");
await redis.zadd("leaderboard", 120, "charlie");

// ZRANGE: Obtenir par rang (ascendant)
const top = await redis.zrange("leaderboard", 0, -1);
// Résultat: ['bob', 'alice', 'charlie']

// ZREVRANGE: Obtenir par rang (descendant)
const top = await redis.zrevrange("leaderboard", 0, 2);
// Résultat: ['charlie', 'alice', 'bob']

// ZSCORE: Obtenir le score
const score = await redis.zscore("leaderboard", "alice");
// Résultat: 100

// ZCARD: Compter les éléments
const count = await redis.zcard("leaderboard");
// Résultat: 3
```

---

## 3️⃣ Expiration (TTL)

### Time To Live

**Problème**: Les données Redis restent en mémoire indéfiniment!

**Solution**: Définir une expiration.

```typescript
// SET avec expiration (secondes)
await redis.set("session:user123", JSON.stringify(sessionData), "EX", 3600);
// Expire après 1h (3600 secondes)

// OU avec EX (expire seconds)
await redis.set("otp:123456", "code", "EX", 300);
// Expire après 5 min

// OU avec PX (milliseconds)
await redis.set("temp:abc", "data", "PX", 30000);
// Expire après 30 secondes

// Vérifier le TTL restant
const ttl = await redis.ttl("session:user123");
// Résultat: 3599 (1 seconde a passé)

// Renouveler l'expiration
await redis.expire("session:user123", 3600);
// Expire à nouveau après 1h
```

---

## 4️⃣ Redis dans ALOVE

### redis.service.ts (Wrapper)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    // Connexion au démarrage
    this.client = new Redis({
      host: process.env.REDIS_HOST || "redis",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on("error", (err) => console.error("Redis error:", err));
    console.log("✅ Redis connected");
  }

  async onModuleDestroy() {
    // Ferme la connexion à l'arrêt
    await this.client.quit();
    console.log("❌ Redis disconnected");
  }

  // ===== OPÉRATIONS DE BASE =====

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string | object,
    ttlSeconds?: number
  ): Promise<void> {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, strValue);
    } else {
      await this.client.set(key, strValue);
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.client.del(...key);
    }
    return this.client.del(key);
  }

  // ===== INCR/DECR =====

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  // ===== TTL =====

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  // ===== HASH =====

  async hset(key: string, field: string, value: any): Promise<number> {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    return this.client.hset(key, field, strValue);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }
}
```

### OTP avec Redis (Exemple Complet)

```typescript
// otp.service.ts

@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  constructor(private redis: RedisService) {}

  // ===== GÉNÉRER OTP =====
  async generateOtp(email: string, purpose: string) {
    // Génère 6 chiffres aléatoires
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clé unique
    const key = `otp:${purpose}:${email}`;
    const attemptsKey = `${key}:attempts`;

    // Stocke dans Redis avec expiration
    await this.redis.set(key, otp, this.OTP_TTL);
    await this.redis.set(attemptsKey, "0", this.OTP_TTL);

    console.log(`📧 OTP générée pour ${email}: ${otp}`);

    return {
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
      expiresIn: this.OTP_TTL,
    };
  }

  // ===== VÉRIFIER OTP =====
  async verifyOtp(email: string, otp: string, purpose: string) {
    const key = `otp:${purpose}:${email}`;
    const attemptsKey = `${key}:attempts`;

    // Récupère les tentatives échouées
    const attempts = parseInt((await this.redis.get(attemptsKey)) || "0", 10);

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new UnauthorizedException("Too many failed attempts");
    }

    // Récupère l'OTP stockée
    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      throw new UnauthorizedException("OTP expired or not found");
    }

    // Vérifie
    if (storedOtp !== otp) {
      // Incrémente les tentatives
      const newAttempts = await this.redis.incr(attemptsKey);

      if (newAttempts >= this.MAX_ATTEMPTS) {
        await this.redis.del(key); // Supprime après trop de tentatives
      }

      throw new UnauthorizedException("Invalid OTP");
    }

    // Succès: supprime l'OTP
    await this.redis.del([key, attemptsKey]);

    return true;
  }
}
```

---

## 5️⃣ Cas d'Usage Courants

### 1. Cache de Requêtes

```typescript
@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getPart(id: string) {
    const cacheKey = `part:${id}`;

    // [1] Vérifie le cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached); // Retourne du cache
    }

    // [2] Si pas en cache, requête DB
    const part = await this.prisma.part.findUnique({ where: { id } });

    if (!part) {
      throw new NotFoundException();
    }

    // [3] Stocke dans le cache (1 heure)
    await this.redis.set(cacheKey, part, 3600);

    return part;
  }

  // Invalide le cache quand on modifie
  async updatePart(id: string, data: any) {
    const part = await this.prisma.part.update({
      where: { id },
      data,
    });

    // Supprime du cache
    await this.redis.del(`part:${id}`);

    return part;
  }
}
```

### 2. Sessions Utilisateur

```typescript
async setSession(userId: string, sessionData: any) {
  const key = `session:${userId}`;
  const ttl = 24 * 3600;  // 24 heures

  await this.redis.set(key, sessionData, ttl);
}

async getSession(userId: string) {
  const key = `session:${userId}`;
  const data = await this.redis.get(key);

  if (!data) return null;
  return JSON.parse(data);
}

async destroySession(userId: string) {
  await this.redis.del(`session:${userId}`);
}
```

### 3. Compteurs

```typescript
// Compteur de vue de page
async incrementPageViews(pageId: string) {
  const key = `page:views:${pageId}`;
  const views = await this.redis.incr(key);

  // Expire après 1 jour
  await this.redis.expire(key, 86400);

  return views;
}

// Rate limiting (limiter les requêtes)
async checkRateLimit(userId: string, limit: number, window: number) {
  const key = `rate-limit:${userId}`;
  const count = await this.redis.incr(key);

  if (count === 1) {
    await this.redis.expire(key, window);  // Première fois, set expiration
  }

  return count <= limit;  // true si sous la limite
}
```

---

## 6️⃣ Exercices

### Exercice 1: Implémenter un Cache

**Énoncé**: Créez une fonction `getCategoryCached()` qui:

1. Cherche en Redis
2. Si pas trouvé, requête DB
3. Stocke en cache (1h)

**Solution**:

```typescript
async getCategoryCached(categoryId: string) {
  const key = `category:${categoryId}`;
  const cached = await this.redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const category = await this.prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (category) {
    await this.redis.set(key, category, 3600);
  }

  return category;
}
```

### Exercice 2: Incrémenter un Compteur

**Énoncé**: Comptez le nombre d'accès à `/api/parts` par utilisateur, limite 100/heure.

**Solution**:

```typescript
async getParts(@CurrentUser() user: any) {
  const key = `api-calls:${user.sub}`;
  const count = await this.redis.incr(key);

  if (count === 1) {
    await this.redis.expire(key, 3600);  // 1 heure
  }

  if (count > 100) {
    throw new TooManyRequestsException();
  }

  return this.partsService.findAll();
}
```

---

## 7️⃣ Résumé

| Type           | Cas d'Usage                |
| -------------- | -------------------------- |
| **String**     | Sessions, OTP, flags       |
| **List**       | Files d'attente, messages  |
| **Hash**       | Objets (utilisateur, page) |
| **Set**        | Appartenance, tags         |
| **Sorted Set** | Classements, scores        |

---

## 🎓 Checkpoint

1. Quelle structure Redis pour stocker un panier d'achat?
2. Comment expirer une clé après 30 minutes?
3. Pourquoi utiliser Redis au lieu de PostgreSQL?
4. Comment invalider le cache?

**Réponses**:

1. Hash (`hset 'cart:user123' 'item1' '2'`)
2. `redis.set(key, value, 1800)` ou `redis.expire(key, 1800)`
3. Reqêtes ultra-rapides (RAM vs disque)
4. `redis.del(cacheKey)`

---

**Prochainement: Testing E2E!** 🧪
