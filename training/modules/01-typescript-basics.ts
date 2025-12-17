/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ALOVE TRAINING — Module 1: TypeScript Basics                                   ║
 * ║  Duration: 2-3 days | Level: Beginner                                                             ║
 * ║  Concepts: Types, Interfaces, Classes, Generics                                                   ║
 * ║  Application: ALOVE DTOs, Services, Controllers                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 1: TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// [1.1] BASIC TYPES
type Email = string;
type PhoneNumber = string;
type Decimal = number;

const userEmail: Email = "user@alove.com";
const userPhone: PhoneNumber = "+212612345678";
const price: Decimal = 99.99;

// [1.2] TYPE ALIASES VS INTERFACES
// Type Alias: Can represent anything (union, tuple, primitive)
// Interface: Only for object shapes, supports inheritance

interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

interface Customer extends User {
  phone?: string; // Optional field
  address?: string;
}

// [1.3] UNION TYPES
type PaymentMethod = "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER";
type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

const paymentMethod: PaymentMethod = "MOBILE_MONEY"; // ✅ Valid
// const invalidPayment: PaymentMethod = 'CRYPTO'; // ❌ Error!

// [1.4] LITERAL TYPES
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Role = "ADMIN" | "VENDOR" | "CUSTOMER" | "SUPPORT";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 2: FUNCTIONS & GENERICS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// [2.1] FUNCTION TYPES
function createUser(email: string, password: string): User {
  return {
    id: "user-1",
    email,
    password,
    createdAt: new Date(),
  };
}

// Arrow function with explicit return type
const getUser = (id: string): User | null => {
  if (id === "user-1") {
    return {
      id,
      email: "user@alove.com",
      password: "hash",
      createdAt: new Date(),
    };
  }
  return null;
};

// [2.2] OPTIONAL PARAMETERS
function sendEmail(to: string, subject: string, body?: string): void {
  console.log(`Email sent to ${to}: ${subject}`);
  if (body) console.log(`Body: ${body}`);
}

sendEmail("user@alove.com", "Welcome"); // ✅ body is optional
sendEmail("user@alove.com", "Welcome", "Welcome to ALOVE!"); // ✅ body provided

// [2.3] GENERICS (REUSABLE LOGIC)
interface Response<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function apiResponse<T>(data: T): Response<T> {
  return { success: true, data };
}

// Usage
const userResponse: Response<User> = apiResponse(
  createUser("test@alove.com", "pass")
);
const usersResponse: Response<User[]> = apiResponse([
  createUser("user1@alove.com", "pass1"),
  createUser("user2@alove.com", "pass2"),
]);

// [2.4] GENERIC CONSTRAINTS
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = createUser("user@alove.com", "password");
const email = getProperty(user, "email"); // ✅ 'email' is a valid key
// const invalid = getProperty(user, 'invalidKey'); // ❌ Error!

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 3: CLASSES & INHERITANCE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// [3.1] BASIC CLASS
class Product {
  id: string;
  title: string;
  price: number;

  constructor(id: string, title: string, price: number) {
    this.id = id;
    this.title = title;
    this.price = price;
  }

  getPriceWithTax(taxRate: number): number {
    return this.price * (1 + taxRate);
  }
}

// [3.2] INHERITANCE
class DigitalProduct extends Product {
  downloadUrl: string;

  constructor(id: string, title: string, price: number, downloadUrl: string) {
    super(id, title, price); // Call parent constructor
    this.downloadUrl = downloadUrl;
  }

  // Override parent method
  getPriceWithTax(taxRate: number): number {
    // Digital products might have different tax rules
    return this.price * (1 + taxRate * 0.5); // Half tax for digital
  }
}

// [3.3] ACCESS MODIFIERS
class BankAccount {
  private balance: number = 0; // Private: only accessible within class
  protected accountNumber: string; // Protected: accessible in subclasses
  public accountHolder: string; // Public: accessible everywhere

  constructor(accountHolder: string, accountNumber: string) {
    this.accountHolder = accountHolder;
    this.accountNumber = accountNumber;
  }

  public deposit(amount: number): void {
    this.balance += amount;
    console.log(`Deposited: ${amount}. New balance: ${this.balance}`);
  }

  // Private method - only accessible within this class
  private calculateInterest(): number {
    return this.balance * 0.05;
  }
}

// [3.4] ABSTRACT CLASSES
abstract class PaymentProcessor {
  abstract processPayment(amount: number): Promise<boolean>;

  logTransaction(amount: number, status: string): void {
    console.log(`Payment of ${amount} - Status: ${status}`);
  }
}

class StripePayment extends PaymentProcessor {
  async processPayment(amount: number): Promise<boolean> {
    // Stripe API call
    console.log(`Processing ${amount} via Stripe...`);
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 4: ENUMS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// [4.1] STRING ENUM
enum OrderStatusEnum {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

// [4.2] NUMERIC ENUM
enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
}

const orderStatus: OrderStatusEnum = OrderStatusEnum.PENDING;
const taskPriority: Priority = Priority.HIGH;

// [4.3] HETEROGENEOUS ENUM (MIX OF TYPES)
enum Status {
  SUCCESS = "SUCCESS",
  FAILURE = 0,
  PENDING = "PENDING",
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 5: ALOVE REAL EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// [5.1] ORDER DTO (From ALOVE)
interface OrderDto {
  items: Array<{
    partId: string;
    quantity: number;
  }>;
}

// [5.2] PAYMENT DTO (From ALOVE)
interface PaymentDto {
  orderId: string;
  amount: number;
  currency: "XOF" | "USD" | "EUR";
  method: PaymentMethod;
  mobileMoneyPhone?: string;
}

// [5.3] ADMIN SERVICE EXAMPLE
class AdminService {
  private users: User[] = [];

  createUser(email: string, password: string, role: Role): User {
    const user = {
      id: `user-${Date.now()}`,
      email,
      password,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  listUsers(): User[] {
    return [...this.users]; // Return copy to prevent external mutation
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTION 6: EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * EXERCISE 1: Create a Product DTO interface
 *
 * Requirements:
 * - id: string
 * - title: string
 * - description: string
 * - price: number
 * - stock: number (optional)
 * - vendor: { id: string; name: string }
 *
 * TODO: Define this interface
 */

/**
 * EXERCISE 2: Create a generic Repository class
 *
 * Requirements:
 * - create(item: T): T
 * - getById(id: string): T | null
 * - update(id: string, item: Partial<T>): T
 * - delete(id: string): boolean
 *
 * TODO: Implement this class
 */

/**
 * EXERCISE 3: Create Order status validation
 *
 * Requirements:
 * - Accept order status (string)
 * - Return true if valid (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 * - Return false otherwise
 *
 * TODO: Write this function
 */

export {
  User,
  Customer,
  PaymentMethod,
  OrderStatus,
  Product,
  DigitalProduct,
  AdminService,
  OrderDto,
  PaymentDto,
};
