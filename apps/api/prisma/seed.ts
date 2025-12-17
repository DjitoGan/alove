/**
 * 🌱 ALOVE Seed Script (v3 - US-CAT-301)
 * - 4 users (Togolese names)
 * - 1 vendor (Garage AutoLomé)
 * - YMM Hierarchy: Makes → Models → Years → Engines
 * - 5 real car parts with OEM refs and YMM fitments
 * - Order #1 (Akoua) + 2 items + 1 shipment
 * - Order #2 (random user ≠ Akoua) + 3 random items + 1 shipment
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Prisma v7 requires adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function dec(v: number | Prisma.Decimal) {
  return v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
}
function sumDec(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.add(b);
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Starting full seed (v3 - US-CAT-301)...\n');

  // ========== CLEAN ==========
  console.log('🧹 Cleaning database...');
  await prisma.favorite.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.partImage.deleteMany({});
  await prisma.partFitment.deleteMany({});
  await prisma.part.deleteMany({});
  await prisma.engineSpec.deleteMany({});
  await prisma.vehicleYear.deleteMany({});
  await prisma.vehicleModel.deleteMany({});
  await prisma.vehicleMake.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});

  // ========== USERS ==========
  console.log('👤 Creating users with roles...');

  // Hash test passwords
  const hashedTestPassword = await bcrypt.hash('Test@123', 10);
  const hashedCustomerPassword = await bcrypt.hash('Customer@123', 10);
  const hashedMerchantPassword = await bcrypt.hash('Merchant@123', 10);
  const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);

  // Create test user with fixed ID for cart testing
  await prisma.user.upsert({
    where: { id: 'test-user-id' },
    update: {},
    create: {
      id: 'test-user-id',
      email: 'tester1@email.com',
      password: hashedTestPassword,
      name: 'Test User',
      role: 'CUSTOMER',
    },
  });

  // Create users with proper roles
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@alove.tg',
        password: hashedAdminPassword,
        name: 'Admin Alove',
        role: 'ADMIN',
      },
      {
        email: 'kossi.adjaho@example.com',
        password: hashedMerchantPassword,
        name: 'Kossi Adjaho',
        role: 'MERCHANT',
      },
      {
        email: 'akoua.tetteh@example.com',
        password: hashedCustomerPassword,
        name: 'Akoua Tetteh',
        role: 'CUSTOMER',
      },
      {
        email: 'yawovi.agbo@example.com',
        password: hashedCustomerPassword,
        name: 'Yawovi Agbo',
        role: 'CUSTOMER',
      },
      {
        email: 'amadou.kodjo@example.com',
        password: hashedCustomerPassword,
        name: 'Amadou Kodjo',
        role: 'CUSTOMER',
      },
    ],
    skipDuplicates: true,
  });
  const [testUser, admin, kossi, akoua, yawovi, amadou] = await Promise.all([
    prisma.user.findUnique({ where: { id: 'test-user-id' } }),
    prisma.user.findUnique({ where: { email: 'admin@alove.tg' } }),
    prisma.user.findUnique({ where: { email: 'kossi.adjaho@example.com' } }),
    prisma.user.findUnique({ where: { email: 'akoua.tetteh@example.com' } }),
    prisma.user.findUnique({ where: { email: 'yawovi.agbo@example.com' } }),
    prisma.user.findUnique({ where: { email: 'amadou.kodjo@example.com' } }),
  ]);
  if (!testUser || !admin || !kossi || !akoua || !yawovi || !amadou)
    throw new Error('Users not found');

  console.log('✅ Test credentials:');
  console.log('  ADMIN: admin@alove.tg / Admin@123');
  console.log('  MERCHANT: kossi.adjaho@example.com / Merchant@123');
  console.log('  CUSTOMER: akoua.tetteh@example.com / Customer@123');
  console.log('  TEST USER: tester1@email.com / Test@123\n');

  // ========== VENDOR ==========
  console.log('🏪 Creating vendor...');
  const vendor = await prisma.vendor.create({
    data: {
      name: 'Garage AutoLomé',
      description: 'Spécialiste pièces auto neuves et occasion à Lomé',
      contactPhone: '+228 90 12 34 56',
      contactWhatsapp: '+228 90 12 34 56',
      whatsappEnabled: true,
      city: 'Lomé',
      country: 'TG',
      userId: kossi.id,
    },
  });

  // ========== YMM HIERARCHY ==========
  console.log('🚗 Creating YMM hierarchy (Makes → Models → Years → Engines)...');

  // TOYOTA
  const toyota = await prisma.vehicleMake.create({
    data: { name: 'Toyota' },
  });
  const corolla = await prisma.vehicleModel.create({
    data: { name: 'Corolla', makeId: toyota.id },
  });
  const corolla2018 = await prisma.vehicleYear.create({
    data: { year: 2018, modelId: corolla.id },
  });
  const corolla2019 = await prisma.vehicleYear.create({
    data: { year: 2019, modelId: corolla.id },
  });
  const corolla18_1_8 = await prisma.engineSpec.create({
    data: { code: '1.8L', fuel: 'PETROL', capacityL: 1.8, powerHp: 140, yearId: corolla2018.id },
  });
  const corolla19_1_8 = await prisma.engineSpec.create({
    data: { code: '1.8L', fuel: 'PETROL', capacityL: 1.8, powerHp: 140, yearId: corolla2019.id },
  });

  const camry = await prisma.vehicleModel.create({
    data: { name: 'Camry', makeId: toyota.id },
  });
  const camry2020 = await prisma.vehicleYear.create({
    data: { year: 2020, modelId: camry.id },
  });
  const camry20_2_5 = await prisma.engineSpec.create({
    data: { code: '2.5L', fuel: 'PETROL', capacityL: 2.5, powerHp: 203, yearId: camry2020.id },
  });

  // HONDA
  const honda = await prisma.vehicleMake.create({
    data: { name: 'Honda' },
  });
  const civic = await prisma.vehicleModel.create({
    data: { name: 'Civic', makeId: honda.id },
  });
  const civic2017 = await prisma.vehicleYear.create({
    data: { year: 2017, modelId: civic.id },
  });
  const civic17_1_5T = await prisma.engineSpec.create({
    data: { code: '1.5T', fuel: 'PETROL', capacityL: 1.5, powerHp: 174, yearId: civic2017.id },
  });

  // PEUGEOT
  const peugeot = await prisma.vehicleMake.create({
    data: { name: 'Peugeot' },
  });
  const p206 = await prisma.vehicleModel.create({
    data: { name: '206', makeId: peugeot.id },
  });
  const p206_2005 = await prisma.vehicleYear.create({
    data: { year: 2005, modelId: p206.id },
  });
  const p206_1_4 = await prisma.engineSpec.create({
    data: { code: '1.4 HDI', fuel: 'DIESEL', capacityL: 1.4, powerHp: 68, yearId: p206_2005.id },
  });

  // RENAULT
  const renault = await prisma.vehicleMake.create({
    data: { name: 'Renault' },
  });
  const clio = await prisma.vehicleModel.create({
    data: { name: 'Clio 3', makeId: renault.id },
  });
  const clio2008 = await prisma.vehicleYear.create({
    data: { year: 2008, modelId: clio.id },
  });
  const clio_1_5dci = await prisma.engineSpec.create({
    data: { code: '1.5 dCi', fuel: 'DIESEL', capacityL: 1.5, powerHp: 86, yearId: clio2008.id },
  });

  // ========== PARTS (with OEM refs and fitments) ==========
  console.log('🔧 Creating parts with OEM refs and YMM fitments...');

  // Part 1: Plaquettes de frein Toyota
  const part1 = await prisma.part.create({
    data: {
      title: 'Plaquettes de frein avant Toyota Corolla 2018-2019',
      description:
        'Plaquettes de frein de qualité OEM pour Toyota Corolla. Compatible avec moteurs 1.8L essence.',
      price: 29990, // 29,990 XOF
      currency: 'XOF',
      stock: 40,
      condition: 'NEW',
      status: 'PUBLISHED',
      oemRefs: ['04465-02220', '04465-02230'],
      city: 'Lomé',
      country: 'TG',
      vendorId: vendor.id,
      fitments: {
        create: [{ engineId: corolla18_1_8.id }, { engineId: corolla19_1_8.id }],
      },
    },
  });

  // Part 2: Filtre à huile Bosch (multi-marque)
  const part2 = await prisma.part.create({
    data: {
      title: 'Filtre à huile Bosch 0986AF0250',
      description: 'Filtre à huile universel Bosch. Compatible Toyota, Honda, et autres.',
      price: 8500, // 8,500 XOF
      currency: 'XOF',
      stock: 120,
      condition: 'NEW',
      status: 'PUBLISHED',
      oemRefs: ['0986AF0250', '15400-PLM-A01', '90915-YZZD4'],
      city: 'Lomé',
      country: 'TG',
      vendorId: vendor.id,
      fitments: {
        create: [
          { engineId: corolla18_1_8.id },
          { engineId: corolla19_1_8.id },
          { engineId: camry20_2_5.id },
          { engineId: civic17_1_5T.id },
        ],
      },
    },
  });

  // Part 3: Batterie VARTA (universel)
  const part3 = await prisma.part.create({
    data: {
      title: 'Batterie 12V 60Ah VARTA Blue Dynamic',
      description: 'Batterie auto VARTA Blue Dynamic. Idéale pour climat tropical.',
      price: 89000, // 89,000 XOF
      currency: 'XOF',
      stock: 15,
      condition: 'NEW',
      status: 'PUBLISHED',
      oemRefs: ['5604080543132', 'D59'],
      city: 'Lomé',
      country: 'TG',
      vendorId: vendor.id,
      fitments: {
        create: [
          { engineId: corolla18_1_8.id },
          { engineId: camry20_2_5.id },
          { engineId: civic17_1_5T.id },
          { engineId: clio_1_5dci.id },
        ],
      },
    },
  });

  // Part 4: Amortisseur Renault Clio
  const part4 = await prisma.part.create({
    data: {
      title: 'Amortisseur avant Monroe Renault Clio 3',
      description: 'Amortisseur Monroe pour Renault Clio 3. État occasion très bon.',
      price: 74900, // 74,900 XOF
      currency: 'XOF',
      stock: 10,
      condition: 'USED_LIKE_NEW',
      status: 'PUBLISHED',
      oemRefs: ['G8802', '8200676025'],
      city: 'Lomé',
      country: 'TG',
      vendorId: vendor.id,
      fitments: {
        create: [{ engineId: clio_1_5dci.id }],
      },
    },
  });

  // Part 5: Courroie de distribution Peugeot 206
  const part5 = await prisma.part.create({
    data: {
      title: 'Courroie de distribution Gates PowerGrip Peugeot 206',
      description: 'Kit courroie de distribution Gates pour Peugeot 206 1.4 HDI.',
      price: 49990, // 49,990 XOF
      currency: 'XOF',
      stock: 25,
      condition: 'NEW',
      status: 'PUBLISHED',
      oemRefs: ['K015603XS', '0831T5'],
      city: 'Lomé',
      country: 'TG',
      vendorId: vendor.id,
      fitments: {
        create: [{ engineId: p206_1_4.id }],
      },
    },
  });

  const parts = [part1, part2, part3, part4, part5];

  // Helper to pick N distinct random parts
  function pickRandomParts(n: number) {
    const copy = [...parts];
    const chosen: typeof parts = [];
    for (let i = 0; i < n && copy.length; i++) {
      const idx = randomInt(0, copy.length - 1);
      chosen.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return chosen;
  }

  // ========== ORDER #1 (Akoua) ==========
  console.log('🧾 Creating orders...');
  const total1 = dec(part1.price).add(part2.price);
  const order1 = await prisma.order.create({
    data: { userId: akoua.id, status: 'CONFIRMED', total: total1 },
  });
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        partId: part1.id,
        vendorId: vendor.id,
        quantity: 1,
        unitPrice: dec(part1.price),
      },
      {
        orderId: order1.id,
        partId: part2.id,
        vendorId: vendor.id,
        quantity: 2,
        unitPrice: dec(part2.price),
      },
    ],
  });
  await prisma.shipment.create({
    data: { orderId: order1.id, vendorId: vendor.id, status: 'IN_TRANSIT' },
  });

  // ========== ORDER #2 (random user ≠ Akoua) ==========
  const customer2 = Math.random() < 0.5 ? yawovi : amadou;
  const chosen = pickRandomParts(3);
  const items2 = chosen.map((p) => {
    const qty = randomInt(1, 3);
    return {
      part: p,
      quantity: qty,
      lineTotal: dec(p.price).mul(qty),
    };
  });
  const total2 = items2.reduce((acc, it) => sumDec(acc, it.lineTotal), new Prisma.Decimal(0));
  const order2 = await prisma.order.create({
    data: { userId: customer2.id, status: 'CONFIRMED', total: total2 },
  });
  await prisma.orderItem.createMany({
    data: items2.map((it) => ({
      orderId: order2.id,
      partId: it.part.id,
      vendorId: vendor.id,
      quantity: it.quantity,
      unitPrice: dec(it.part.price),
    })),
  });
  await prisma.shipment.create({
    data: { orderId: order2.id, vendorId: vendor.id, status: 'CREATED' },
  });

  // ========== SUMMARY ==========
  const [uC, vC, makeC, modelC, yearC, engineC, paC, fitC, oC, oiC, sC] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.vehicleMake.count(),
    prisma.vehicleModel.count(),
    prisma.vehicleYear.count(),
    prisma.engineSpec.count(),
    prisma.part.count(),
    prisma.partFitment.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.shipment.count(),
  ]);

  console.log(`
🎉 Seed v3 (US-CAT-301) done!
👤 Users:         ${uC}
🏪 Vendors:       ${vC}
🚗 Makes:         ${makeC}
🚙 Models:        ${modelC}
📅 Years:         ${yearC}
⚙️  Engines:       ${engineC}
🔧 Parts:         ${paC}
🔗 Fitments:      ${fitC}
🧾 Orders:        ${oC}
📦 OrderItems:    ${oiC}
🚚 Shipments:     ${sC}
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
