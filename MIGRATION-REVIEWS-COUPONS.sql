-- ============================================
-- MIGRACIÓN: SISTEMA DE RESEÑAS Y CUPONES
-- ============================================
-- Ejecuta este SQL en Supabase SQL Editor
-- Copia y pega todo este contenido

-- ============================================
-- REVIEWS & RATINGS SYSTEM
-- ============================================

-- Add review fields to Restaurant
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'averageRating') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "averageRating" DOUBLE PRECISION DEFAULT 0;
        RAISE NOTICE 'Column averageRating added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column averageRating already exists in Restaurant table';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'reviewCount') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "reviewCount" INTEGER DEFAULT 0;
        RAISE NOTICE 'Column reviewCount added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column reviewCount already exists in Restaurant table';
    END IF;
END $$;

-- Create Review table
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Review
CREATE INDEX IF NOT EXISTS "Review_restaurantId_idx" ON "Review"("restaurantId");
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");
CREATE INDEX IF NOT EXISTS "Review_rating_idx" ON "Review"("rating");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

-- Add foreign keys for Review
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Review_orderId_fkey'
    ) THEN
        ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Review_restaurantId_fkey'
    ) THEN
        ALTER TABLE "Review" ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Review_productId_fkey'
    ) THEN
        ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Review_userId_fkey'
    ) THEN
        ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Unique constraint: one review per order
CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_key" ON "Review"("orderId");

-- ============================================
-- COUPONS & DISCOUNTS SYSTEM
-- ============================================

-- Add coupon fields to Order
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'couponId') THEN
        ALTER TABLE "Order" ADD COLUMN "couponId" TEXT;
        RAISE NOTICE 'Column couponId added to Order table';
    ELSE
        RAISE NOTICE 'Column couponId already exists in Order table';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'discountAmount') THEN
        ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER DEFAULT 0;
        RAISE NOTICE 'Column discountAmount added to Order table';
    ELSE
        RAISE NOTICE 'Column discountAmount already exists in Order table';
    END IF;
END $$;

-- Create DiscountType enum
DO $$ BEGIN
 CREATE TYPE "DiscountType" AS ENUM('percentage', 'fixed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create Coupon table
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "restaurantId" TEXT,
    "universityId" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minOrderAmount" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Coupon
CREATE INDEX IF NOT EXISTS "Coupon_restaurantId_idx" ON "Coupon"("restaurantId");
CREATE INDEX IF NOT EXISTS "Coupon_universityId_idx" ON "Coupon"("universityId");
CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_isActive_idx" ON "Coupon"("isActive");
CREATE INDEX IF NOT EXISTS "Coupon_validFrom_idx" ON "Coupon"("validFrom");
CREATE INDEX IF NOT EXISTS "Coupon_validUntil_idx" ON "Coupon"("validUntil");

-- Unique constraint: unique coupon code
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

-- Add foreign keys for Coupon
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Coupon_restaurantId_fkey'
    ) THEN
        ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Coupon_universityId_fkey'
    ) THEN
        ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create CouponRedemption table
CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- Create indexes for CouponRedemption
CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_orderId_idx" ON "CouponRedemption"("orderId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_createdAt_idx" ON "CouponRedemption"("createdAt");

-- Unique constraint: one redemption per order
CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- Add foreign keys for CouponRedemption
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'CouponRedemption_couponId_fkey'
    ) THEN
        ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'CouponRedemption_orderId_fkey'
    ) THEN
        ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'CouponRedemption_userId_fkey'
    ) THEN
        ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for Order.couponId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Order_couponId_fkey'
    ) THEN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for Order.couponId
CREATE INDEX IF NOT EXISTS "Order_couponId_idx" ON "Order"("couponId");

-- ============================================
-- MIGRACIÓN COMPLETADA
-- ============================================
-- Verifica que todo esté bien ejecutando:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('Review', 'Coupon', 'CouponRedemption');

