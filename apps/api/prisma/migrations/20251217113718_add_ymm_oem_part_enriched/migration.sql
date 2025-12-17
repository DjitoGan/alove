-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OUT_OF_STOCK', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartCondition" AS ENUM ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR', 'REFURBISHED');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "city" TEXT,
ADD COLUMN     "condition" "PartCondition" NOT NULL DEFAULT 'USED_GOOD',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'TG',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "oemRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "PartStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'XOF',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactWhatsapp" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'TG',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineSpec" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fuel" TEXT,
    "capacityL" DOUBLE PRECISION,
    "powerHp" INTEGER,
    "yearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartFitment" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartFitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "partId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMake_name_key" ON "VehicleMake"("name");

-- CreateIndex
CREATE INDEX "VehicleModel_makeId_idx" ON "VehicleModel"("makeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_makeId_name_key" ON "VehicleModel"("makeId", "name");

-- CreateIndex
CREATE INDEX "VehicleYear_modelId_idx" ON "VehicleYear"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleYear_modelId_year_key" ON "VehicleYear"("modelId", "year");

-- CreateIndex
CREATE INDEX "EngineSpec_yearId_idx" ON "EngineSpec"("yearId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineSpec_yearId_code_key" ON "EngineSpec"("yearId", "code");

-- CreateIndex
CREATE INDEX "PartFitment_partId_idx" ON "PartFitment"("partId");

-- CreateIndex
CREATE INDEX "PartFitment_engineId_idx" ON "PartFitment"("engineId");

-- CreateIndex
CREATE UNIQUE INDEX "PartFitment_partId_engineId_key" ON "PartFitment"("partId", "engineId");

-- CreateIndex
CREATE INDEX "PartImage_partId_idx" ON "PartImage"("partId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_partId_idx" ON "Favorite"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_partId_key" ON "Favorite"("userId", "partId");

-- CreateIndex
CREATE INDEX "Part_status_idx" ON "Part"("status");

-- CreateIndex
CREATE INDEX "Part_condition_idx" ON "Part"("condition");

-- CreateIndex
CREATE INDEX "Part_country_idx" ON "Part"("country");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleYear" ADD CONSTRAINT "VehicleYear_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineSpec" ADD CONSTRAINT "EngineSpec_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "VehicleYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartFitment" ADD CONSTRAINT "PartFitment_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartFitment" ADD CONSTRAINT "PartFitment_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "EngineSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartImage" ADD CONSTRAINT "PartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
