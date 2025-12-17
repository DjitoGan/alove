import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Note: Use process.env here so `prisma generate` doesn't fail if DATABASE_URL is missing
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node ./prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
