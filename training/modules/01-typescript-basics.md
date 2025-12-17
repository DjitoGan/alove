# 📘 Module 1: TypeScript - Les Bases

## 🎯 Objectifs du Module

À la fin de ce module, vous serez capable de:

- ✅ Comprendre ce qu'est TypeScript et pourquoi on l'utilise
- ✅ Lire et écrire du code TypeScript
- ✅ Utiliser les types, interfaces et classes
- ✅ Comprendre les DTOs dans ALOVE

**Durée estimée**: 2 jours (4-6 heures)

---

## 📖 Partie 1: Qu'est-ce que TypeScript ?

### TypeScript vs JavaScript

**JavaScript** (que vous connaissez peut-être) est un langage à **typage dynamique**:

```javascript
let age = 25; // C'est un nombre
age = "vingt-cinq"; // Maintenant c'est une chaîne - PAS D'ERREUR !
```

**TypeScript** est un langage à **typage statique** (comme Java !):

```typescript
let age: number = 25;
age = "vingt-cinq"; // ❌ ERREUR ! TypeScript vous empêche de faire cette erreur
```

### Pourquoi TypeScript ?

1. **Détection d'erreurs tôt** (pendant que vous codez, pas en production)
2. **Auto-complétion** (VS Code vous aide)
3. **Documentation intégrée** (les types sont une documentation)
4. **Refactoring sûr** (changez du code sans tout casser)

> 💡 **Analogie Java**: Si vous connaissez Java, TypeScript est comme JavaScript + les types de Java !

---

## 📖 Partie 2: Les Types de Base

### Types Primitifs

```typescript
// Nombres (comme int, double en Java)
let age: number = 25;
let price: number = 29.99;

// Chaînes de caractères (comme String en Java)
let name: string = "Kossi";
let email: string = "kossi@example.com";

// Booléens (comme boolean en Java)
let isActive: boolean = true;
let isAdmin: boolean = false;

// Tableaux (comme ArrayList en Java)
let numbers: number[] = [1, 2, 3, 4, 5];
let names: string[] = ["Akoua", "Kossi", "Yawovi"];

// Alternative pour les tableaux
let scores: Array<number> = [85, 90, 78];
```

### Type Spéciaux

```typescript
// any - À ÉVITER ! (comme Object en Java, accepte tout)
let anything: any = "Hello";
anything = 42; // Pas d'erreur, mais dangereux !

// void - Fonction qui ne retourne rien (comme void en Java)
function sayHello(): void {
  console.log("Hello!");
}

// null et undefined
let value: string | null = null; // Peut être string OU null
let optional: number | undefined = undefined;
```

---

## 📖 Partie 3: Interfaces (Contrats de Structure)

### Qu'est-ce qu'une Interface ?

> 💡 **Analogie Java**: Exactement comme les interfaces Java, mais utilisées aussi pour décrire des objets !

```typescript
// Définir la structure d'un objet User
interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Utiliser l'interface
const user: User = {
  id: "abc123",
  email: "kossi@example.com",
  password: "hashed_password",
  createdAt: new Date(),
};

// ❌ ERREUR si on oublie un champ
const badUser: User = {
  id: "xyz",
  email: "test@test.com",
  // Manque password et createdAt !
};
```

### Propriétés Optionnelles

```typescript
interface UserProfile {
  id: string;
  email: string;
  phone?: string; // Le ? signifie "optionnel"
  address?: string;
}

// ✅ Valide sans phone et address
const profile: UserProfile = {
  id: "123",
  email: "test@example.com",
};
```

### 🔍 Application dans ALOVE

Dans `apps/api/src/modules/auth/dto/register.dto.ts`:

```typescript
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
```

**Explication**:

- `RegisterDto` = un contrat pour les données d'inscription
- `@IsEmail()` = décorateur qui valide que c'est un email
- Les types assurent que email est toujours une string

---

## 📖 Partie 4: Classes (Comme en Java !)

### Syntaxe de Base

```typescript
class Person {
  // Propriétés (attributs)
  name: string;
  age: number;

  // Constructeur
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // Méthode
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }
}

// Utilisation
const person = new Person("Kossi", 30);
console.log(person.greet()); // "Hello, I'm Kossi"
```

### Modificateurs d'Accès

```typescript
class BankAccount {
  public owner: string; // Accessible partout
  private balance: number; // Accessible seulement dans la classe
  protected accountNumber: string; // Accessible dans la classe et ses enfants

  constructor(owner: string, initialBalance: number) {
    this.owner = owner;
    this.balance = initialBalance;
    this.accountNumber = this.generateAccountNumber();
  }

  // Méthode publique
  public getBalance(): number {
    return this.balance;
  }

  // Méthode privée
  private generateAccountNumber(): string {
    return `ACC${Math.random().toString().substr(2, 8)}`;
  }
}
```

### Syntaxe Raccourcie (TypeScript Magic!)

```typescript
// Version longue
class User {
  private id: string;
  private email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }
}

// Version courte (équivalent!)
class User {
  constructor(private id: string, private email: string) {}
}
```

### 🔍 Application dans ALOVE

Dans `apps/api/src/modules/auth/auth.service.ts`:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, // Injection de dépendances
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async register(email: string, password: string) {
    // ...
  }
}
```

**Explication**:

- `@Injectable()` = décorateur NestJS (on verra ça au Module 3)
- `private prisma` = propriété privée créée automatiquement
- Le constructeur reçoit des dépendances (comme Spring en Java)

---

## 📖 Partie 5: Fonctions et Promises

### Fonctions Typées

```typescript
// Fonction simple
function add(a: number, b: number): number {
  return a + b;
}

// Fonction fléchée (arrow function) - comme les lambdas Java !
const multiply = (a: number, b: number): number => {
  return a * b;
};

// Version ultra-courte
const divide = (a: number, b: number): number => a / b;
```

### Async/Await (Très Important!)

> 💡 **Analogie Java**: Comme les CompletableFuture en Java, mais en plus simple !

```typescript
// Promise = promesse d'un résultat futur
function fetchUser(id: string): Promise<User> {
  // Simule un appel base de données
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        email: "test@example.com",
        password: "hashed",
        createdAt: new Date(),
      });
    }, 1000);
  });
}

// Utilisation avec async/await
async function getUser() {
  console.log("Fetching user...");
  const user = await fetchUser("123"); // Attend le résultat
  console.log("Got user:", user.email);
  return user;
}

// ⚠️ Sans await, vous obtenez une Promise, pas le résultat !
const wrong = fetchUser("123"); // wrong est une Promise<User>
const correct = await fetchUser("123"); // correct est un User
```

### 🔍 Application dans ALOVE

Dans `apps/api/src/modules/auth/auth.service.ts`:

```typescript
async register(email: string, password: string) {
  // await attend que la base de données réponde
  const existingUser = await this.prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictException('User already exists');
  }

  // await attend que le hash soit calculé
  const hashedPassword = await bcrypt.hash(password, 10);

  // await attend que l'utilisateur soit créé
  const user = await this.prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return user;
}
```

---

## 📖 Partie 6: Génériques (Generics)

> 💡 **Analogie Java**: Exactement comme les génériques Java `<T>` !

```typescript
// Fonction générique
function getFirst<T>(array: T[]): T {
  return array[0];
}

// Utilisation
const firstNumber = getFirst<number>([1, 2, 3]); // Type: number
const firstName = getFirst<string>(["A", "B", "C"]); // Type: string

// TypeScript peut souvent inférer le type
const first = getFirst([10, 20, 30]); // Inféré: number
```

### 🔍 Application dans ALOVE

Dans Prisma:

```typescript
// findUnique retourne Promise<User | null>
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
});

// findMany retourne Promise<User[]>
const users = await prisma.user.findMany();
```

---

## 📖 Partie 7: Types Utilitaires

### Union Types (OU)

```typescript
// Une variable qui peut être de plusieurs types
type Status = "PENDING" | "CONFIRMED" | "CANCELLED";

let orderStatus: Status = "PENDING"; // ✅ OK
orderStatus = "CONFIRMED"; // ✅ OK
orderStatus = "PROCESSING"; // ❌ ERREUR !
```

### Intersection Types (ET)

```typescript
interface Person {
  name: string;
  age: number;
}

interface Employee {
  employeeId: string;
  salary: number;
}

// Combine les deux interfaces
type Worker = Person & Employee;

const worker: Worker = {
  name: "Kossi",
  age: 30,
  employeeId: "EMP001",
  salary: 50000,
};
```

### Utility Types

```typescript
interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial = tous les champs optionnels
type PartialUser = Partial<User>;
// { id?: string; email?: string; password?: string; createdAt?: Date; }

// Pick = sélectionner certains champs
type UserPublic = Pick<User, "id" | "email">;
// { id: string; email: string; }

// Omit = exclure certains champs
type UserWithoutPassword = Omit<User, "password">;
// { id: string; email: string; createdAt: Date; }
```

---

## ✏️ Exercices Pratiques

### Exercice 1: Types de Base

Créez un fichier `training/exercises/ex1-types.ts`:

```typescript
// TODO: Déclarez les variables suivantes avec les bons types
// 1. Un prénom
// 2. Un âge
// 3. Un tableau de notes (nombres)
// 4. Un booléen indiquant si l'étudiant est inscrit
// 5. Une fonction qui calcule la moyenne des notes
```

<details>
<summary>Solution</summary>

```typescript
const firstName: string = "Akoua";
const age: number = 22;
const grades: number[] = [85, 90, 78, 92];
const isEnrolled: boolean = true;

function calculateAverage(grades: number[]): number {
  const sum = grades.reduce((acc, grade) => acc + grade, 0);
  return sum / grades.length;
}

console.log(calculateAverage(grades)); // 86.25
```

</details>

### Exercice 2: Interface

Créez une interface `Part` pour représenter une pièce auto:

```typescript
// TODO: Créez une interface Part avec:
// - id (string)
// - title (string)
// - price (number)
// - stock (number)
// - description (optionnel, string)

// TODO: Créez un objet qui respecte cette interface
```

<details>
<summary>Solution</summary>

```typescript
interface Part {
  id: string;
  title: string;
  price: number;
  stock: number;
  description?: string;
}

const part: Part = {
  id: "part123",
  title: "Plaquettes de frein",
  price: 29.99,
  stock: 15,
  // description est optionnel, on peut l'omettre
};
```

</details>

### Exercice 3: Classe

```typescript
// TODO: Créez une classe Order avec:
// - Propriétés: id, items (tableau de strings), total
// - Constructeur
// - Méthode calculateTotal() qui additionne le prix des items
// - Méthode addItem(item: string) qui ajoute un item
```

<details>
<summary>Solution</summary>

```typescript
class Order {
  constructor(
    private id: string,
    private items: string[] = [],
    private total: number = 0
  ) {}

  addItem(item: string): void {
    this.items.push(item);
  }

  calculateTotal(itemPrices: { [key: string]: number }): number {
    this.total = this.items.reduce((sum, item) => {
      return sum + (itemPrices[item] || 0);
    }, 0);
    return this.total;
  }

  getTotal(): number {
    return this.total;
  }
}
```

</details>

---

## 🎓 Quiz de Validation

1. **Quelle est la différence entre TypeScript et JavaScript ?**
2. **Que signifie `?` après un nom de propriété dans une interface ?**
3. **À quoi sert le mot-clé `await` ?**
4. **Quelle est la différence entre `private` et `public` ?**
5. **Qu'est-ce qu'une Promise ?**

<details>
<summary>Réponses</summary>

1. TypeScript ajoute un système de types statiques à JavaScript
2. Le `?` signifie que la propriété est optionnelle
3. `await` attend qu'une Promise soit résolue avant de continuer
4. `private` = accessible seulement dans la classe, `public` = accessible partout
5. Une Promise est un objet représentant une valeur qui sera disponible dans le futur
</details>

---

## 🔍 Analyse du Code ALOVE

### Exemple 1: DTO (Data Transfer Object)

Fichier: `apps/api/src/modules/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
```

**Explication ligne par ligne**:

1. `import { IsEmail, ... }` - On importe des décorateurs de validation
2. `export class RegisterDto` - On crée une classe et on l'exporte (pour l'utiliser ailleurs)
3. `@IsEmail()` - Décorateur qui vérifie que c'est un email valide
4. `email: string` - Propriété publique de type string
5. `@IsString()` - Vérifie que c'est une chaîne
6. `@MinLength(8)` - Minimum 8 caractères
7. `password: string` - Mot de passe typé

**Utilisation dans le contrôleur**:

```typescript
@Post('register')
async register(@Body() registerDto: RegisterDto) {
  // registerDto est automatiquement validé !
  // Si email n'est pas valide, erreur 400 automatique
  return this.authService.register(registerDto.email, registerDto.password);
}
```

---

## 📚 Points Clés à Retenir

✅ **TypeScript = JavaScript + Types** (comme Java)  
✅ **Interfaces** définissent la structure des objets  
✅ **Classes** pour la programmation orientée objet  
✅ **async/await** pour les opérations asynchrones  
✅ **Génériques** pour le code réutilisable  
✅ **DTOs** dans ALOVE = validation des données entrantes

---

## ➡️ Prochaine Étape

Passez au [Module 2: Node.js et npm](./02-nodejs-npm.md) une fois que vous êtes à l'aise avec TypeScript.

**Temps recommandé avant de passer au module suivant**: Avoir fait les 3 exercices et comprendre les concepts du quiz.

---

## 📖 Ressources Supplémentaires

- [TypeScript Official Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Cheat Sheet](https://www.typescriptlang.org/cheatsheets)
- [TypeScript Playground](https://www.typescriptlang.org/play) - Testez du code en ligne !
