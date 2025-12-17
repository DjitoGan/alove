/**
 * 🌱 ALOVE Seed Script (v2)
 * - 4 users (Togolese names)
 * - 1 vendor (Garage AutoLomé)
 * - 5 real car parts
 * - Order #1 (Akoua) + 2 items + 1 shipment
 * - Order #2 (random user ≠ Akoua) + 3 random items + 1 shipment
 */

import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

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
  console.log('🌱 Starting full seed (v2)...\n');

  // ========== CLEAN ==========
  await prisma.shipment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.part.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});

  // ========== USERS ==========
  await prisma.user.createMany({
    data: [
      { email: 'kossi.adjaho@example.com',  password: 'hashKossi' },
      { email: 'akoua.tetteh@example.com',  password: 'hashAkoua' },
      { email: 'yawovi.agbo@example.com',   password: 'hashYawovi' },
      { email: 'amadou.kodjo@example.com',  password: 'hashAmadou' },
    ],
    skipDuplicates: true,
  });
  const [kossi, akoua, yawovi, amadou] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'kossi.adjaho@example.com' } }),
    prisma.user.findUnique({ where: { email: 'akoua.tetteh@example.com' } }),
    prisma.user.findUnique({ where: { email: 'yawovi.agbo@example.com' } }),
    prisma.user.findUnique({ where: { email: 'amadou.kodjo@example.com' } }),
  ]);
  if (!kossi || !akoua || !yawovi || !amadou) throw new Error('Users not found');

  // ========== VENDOR ==========
  const vendor = await prisma.vendor.create({
    data: { name: 'Garage AutoLomé', userId: kossi.id },
  });

  // ========== PARTS ==========
  await prisma.part.createMany({
    data: [
      { title: 'Plaquettes de frein avant Toyota Corolla 2018', price: 29.99, stock: 40, vendorId: vendor.id },
      { title: 'Filtre à huile Bosch 0 986 AFO 250',            price: 8.50,  stock:120, vendorId: vendor.id },
      { title: 'Batterie 12V 60Ah VARTA Blue Dynamic',          price: 89.00, stock: 15, vendorId: vendor.id },
      { title: 'Amortisseur avant Monroe Renault Clio 3',       price: 74.90, stock: 10, vendorId: vendor.id },
      { title: 'Courroie de distribution Gates PowerGrip 206',  price: 49.99, stock: 25, vendorId: vendor.id },
    ],
  });
  const parts = await prisma.part.findMany({
    where: { vendorId: vendor.id },
    select: { id: true, title: true, price: true, stock: true },
  });

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
  const p1 = parts.find(p => p.title.includes('Plaquettes'))!;
  const p2 = parts.find(p => p.title.includes('Filtre à huile'))!;
  const total1 = dec(p1.price).add(p2.price);
  const order1 = await prisma.order.create({
    data: { userId: akoua.id, status: 'CONFIRMED', total: total1 },
  });
  await prisma.orderItem.createMany({
    data: [
      { orderId: order1.id, partId: p1.id, vendorId: vendor.id, quantity: 1, unitPrice: dec(p1.price) },
      { orderId: order1.id, partId: p2.id, vendorId: vendor.id, quantity: 2, unitPrice: dec(p2.price) },
    ],
  });
  await prisma.shipment.create({
    data: { orderId: order1.id, vendorId: vendor.id, status: 'IN_TRANSIT' },
  });

  // ========== ORDER #2 (random user ≠ Akoua) ==========
  const customer2 = Math.random() < 0.5 ? yawovi : amadou; // choisit un autre user
  const chosen = pickRandomParts(3);
  const items2 = chosen.map((p) => {
    const qty = randomInt(1, 3);
    return {
      part: p,
      quantity: qty,
      lineTotal: dec(p.price).mul(qty),
    };
  });
  // total as Decimal
  const total2 = items2.reduce(
    (acc, it) => sumDec(acc, it.lineTotal),
    new Prisma.Decimal(0),
  );
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

  // (optionnel) décrémenter les stocks localement
  for (const it of items2) {
    await prisma.part.update({
      where: { id: it.part.id },
      data: { stock: { decrement: it.quantity } },
    });
  }

  // ========== SUMMARY ==========
  const [uC, vC, paC, oC, oiC, sC] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.part.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.shipment.count(),
  ]);

  console.log(`
🎉 Seed v2 done!
👤 Users:       ${uC}
🏪 Vendors:     ${vC}
🔧 Parts:       ${paC}
🧾 Orders:      ${oC}
📦 OrderItems:  ${oiC}
🚚 Shipments:   ${sC}
  `);
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });