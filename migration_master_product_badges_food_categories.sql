-- Migration: Add MasterProductBadge and MasterProductFoodCategory tables
-- These tables store badges and food categories for MasterProducts (Central level)

-- Create MasterProductBadge table
CREATE TABLE IF NOT EXISTS "MasterProductBadge" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterProductBadge_pkey" PRIMARY KEY ("id")
);

-- Create MasterProductFoodCategory table
CREATE TABLE IF NOT EXISTS "MasterProductFoodCategory" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "foodCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterProductFoodCategory_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "MasterProductBadge" ADD CONSTRAINT "MasterProductBadge_masterProductId_fkey" 
    FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MasterProductBadge" ADD CONSTRAINT "MasterProductBadge_badgeId_fkey" 
    FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MasterProductFoodCategory" ADD CONSTRAINT "MasterProductFoodCategory_masterProductId_fkey" 
    FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MasterProductFoodCategory" ADD CONSTRAINT "MasterProductFoodCategory_foodCategoryId_fkey" 
    FOREIGN KEY ("foodCategoryId") REFERENCES "FoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "MasterProductBadge_masterProductId_badgeId_key" ON "MasterProductBadge"("masterProductId", "badgeId");
CREATE UNIQUE INDEX IF NOT EXISTS "MasterProductFoodCategory_masterProductId_foodCategoryId_key" ON "MasterProductFoodCategory"("masterProductId", "foodCategoryId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "MasterProductBadge_masterProductId_idx" ON "MasterProductBadge"("masterProductId");
CREATE INDEX IF NOT EXISTS "MasterProductBadge_badgeId_idx" ON "MasterProductBadge"("badgeId");
CREATE INDEX IF NOT EXISTS "MasterProductFoodCategory_masterProductId_idx" ON "MasterProductFoodCategory"("masterProductId");
CREATE INDEX IF NOT EXISTS "MasterProductFoodCategory_foodCategoryId_idx" ON "MasterProductFoodCategory"("foodCategoryId");

