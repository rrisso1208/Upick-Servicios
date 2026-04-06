-- Migration: Add SavedPaymentMethod and Favorite models
-- Run this SQL manually in your Supabase SQL editor or via psql

-- Create FavoriteType enum (if not exists)
DO $$ BEGIN
 CREATE TYPE "FavoriteType" AS ENUM('restaurant', 'product');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create SavedPaymentMethod table
CREATE TABLE IF NOT EXISTS "SavedPaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "last4Digits" TEXT,
    "brand" TEXT,
    "bankName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- Create Favorite table
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FavoriteType" NOT NULL,
    "restaurantId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "SavedPaymentMethod_userId_idx" ON "SavedPaymentMethod"("userId");
CREATE INDEX IF NOT EXISTS "SavedPaymentMethod_isDefault_idx" ON "SavedPaymentMethod"("isDefault");
CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId");
CREATE INDEX IF NOT EXISTS "Favorite_restaurantId_idx" ON "Favorite"("restaurantId");
CREATE INDEX IF NOT EXISTS "Favorite_productId_idx" ON "Favorite"("productId");

-- Create unique constraint for Favorite
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_restaurantId_productId_key" ON "Favorite"("userId", "restaurantId", "productId");

-- Add foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SavedPaymentMethod_userId_fkey'
    ) THEN
        ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_userId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_restaurantId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_restaurantId_fkey" 
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_productId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add trigger for updatedAt on SavedPaymentMethod
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_SavedPaymentMethod_updated_at ON "SavedPaymentMethod";
CREATE TRIGGER update_SavedPaymentMethod_updated_at
    BEFORE UPDATE ON "SavedPaymentMethod"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migration: Add imageUrl column to University table
-- Run this SQL manually in your Supabase SQL editor if the column doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'University' AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE "University" ADD COLUMN "imageUrl" TEXT;
        RAISE NOTICE 'Column imageUrl added to University table';
    ELSE
        RAISE NOTICE 'Column imageUrl already exists in University table';
    END IF;
END $$;

-- Migration: Add isFeatured and promotionPrice to Product table
-- Run this SQL manually in your Supabase SQL editor
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'isFeatured'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Column isFeatured added to Product table';
    ELSE
        RAISE NOTICE 'Column isFeatured already exists in Product table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'promotionPrice'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "promotionPrice" INTEGER;
        RAISE NOTICE 'Column promotionPrice added to Product table';
    ELSE
        RAISE NOTICE 'Column promotionPrice already exists in Product table';
    END IF;
END $$;

-- Migration: Add isOverloaded and overloadUntil to Restaurant table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Restaurant' AND column_name = 'isOverloaded'
    ) THEN
        ALTER TABLE "Restaurant" ADD COLUMN "isOverloaded" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Column isOverloaded added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column isOverloaded already exists in Restaurant table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Restaurant' AND column_name = 'overloadUntil'
    ) THEN
        ALTER TABLE "Restaurant" ADD COLUMN "overloadUntil" TIMESTAMP(3);
        RAISE NOTICE 'Column overloadUntil added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column overloadUntil already exists in Restaurant table';
    END IF;
END $$;

-- Migration: Create ProductCapacity table
CREATE TABLE IF NOT EXISTS "ProductCapacity" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCapacity_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCapacity_restaurantId_productId_hour_key" 
ON "ProductCapacity"("restaurantId", "productId", "hour");

-- Create indexes
CREATE INDEX IF NOT EXISTS "ProductCapacity_restaurantId_idx" ON "ProductCapacity"("restaurantId");
CREATE INDEX IF NOT EXISTS "ProductCapacity_productId_idx" ON "ProductCapacity"("productId");
CREATE INDEX IF NOT EXISTS "ProductCapacity_hour_idx" ON "ProductCapacity"("hour");

-- Add foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductCapacity_restaurantId_fkey'
    ) THEN
        ALTER TABLE "ProductCapacity" ADD CONSTRAINT "ProductCapacity_restaurantId_fkey" 
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductCapacity_productId_fkey'
    ) THEN
        ALTER TABLE "ProductCapacity" ADD CONSTRAINT "ProductCapacity_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add trigger for updatedAt
DROP TRIGGER IF EXISTS update_ProductCapacity_updated_at ON "ProductCapacity";
CREATE TRIGGER update_ProductCapacity_updated_at
    BEFORE UPDATE ON "ProductCapacity"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migration: Create Badge and ProductBadge tables
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT 'green',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for Badge name
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_name_key" ON "Badge"("name");

-- Create indexes
CREATE INDEX IF NOT EXISTS "Badge_isActive_idx" ON "Badge"("isActive");
CREATE INDEX IF NOT EXISTS "Badge_sort_idx" ON "Badge"("sort");

-- Create ProductBadge table
CREATE TABLE IF NOT EXISTS "ProductBadge" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBadge_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "ProductBadge_productId_badgeId_key" 
ON "ProductBadge"("productId", "badgeId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "ProductBadge_productId_idx" ON "ProductBadge"("productId");
CREATE INDEX IF NOT EXISTS "ProductBadge_badgeId_idx" ON "ProductBadge"("badgeId");

-- Add foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductBadge_productId_fkey'
    ) THEN
        ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductBadge_badgeId_fkey'
    ) THEN
        ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_badgeId_fkey" 
        FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add trigger for updatedAt on Badge
DROP TRIGGER IF EXISTS update_Badge_updated_at ON "Badge";
CREATE TRIGGER update_Badge_updated_at
    BEFORE UPDATE ON "Badge"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default badges
INSERT INTO "Badge" ("id", "name", "icon", "color", "description", "isActive", "sort", "createdAt", "updatedAt")
VALUES 
    ('badge_vegetariano', 'Vegetariano', 'leaf', 'green', 'Producto vegetariano', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('badge_sin_gluten', 'Sin gluten', 'wheat', 'blue', 'Sin gluten', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('badge_recomendado', 'Recomendado del chef', 'chef-hat', 'red', 'Recomendado por el chef', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('badge_picante', 'Picante', 'flame', 'orange', 'Producto picante', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('badge_nuevo', 'Nuevo', 'sparkles', 'purple', 'Producto nuevo', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('badge_popular', 'Popular', 'trending-up', 'yellow', 'Producto popular', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Migration: Add imagePosition and imageScale to University table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'University' AND column_name = 'imagePosition'
    ) THEN
        ALTER TABLE "University" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
        RAISE NOTICE 'Column imagePosition added to University table';
    ELSE
        RAISE NOTICE 'Column imagePosition already exists in University table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'University' AND column_name = 'imageScale'
    ) THEN
        ALTER TABLE "University" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
        RAISE NOTICE 'Column imageScale added to University table';
    ELSE
        RAISE NOTICE 'Column imageScale already exists in University table';
    END IF;
END $$;

-- Migration: Add imagePosition and imageScale to Restaurant table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Restaurant' AND column_name = 'imagePosition'
    ) THEN
        ALTER TABLE "Restaurant" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
        RAISE NOTICE 'Column imagePosition added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column imagePosition already exists in Restaurant table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Restaurant' AND column_name = 'imageScale'
    ) THEN
        ALTER TABLE "Restaurant" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
        RAISE NOTICE 'Column imageScale added to Restaurant table';
    ELSE
        RAISE NOTICE 'Column imageScale already exists in Restaurant table';
    END IF;
END $$;

-- Migration: Add imagePosition and imageScale to Product table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'imagePosition'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
        RAISE NOTICE 'Column imagePosition added to Product table';
    ELSE
        RAISE NOTICE 'Column imagePosition already exists in Product table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'imageScale'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
        RAISE NOTICE 'Column imageScale added to Product table';
    ELSE
        RAISE NOTICE 'Column imageScale already exists in Product table';
    END IF;
END $$;

-- ============================================
-- REVIEWS & RATINGS SYSTEM
-- ============================================

-- Add review fields to Restaurant
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'averageRating') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "averageRating" DOUBLE PRECISION DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'reviewCount') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "reviewCount" INTEGER DEFAULT 0;
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
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'discountAmount') THEN
        ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER DEFAULT 0;
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


