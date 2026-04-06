-- Migration: Add commission fields to Restaurant and Order
-- Date: 2025-01-XX
-- Description: Adds commission_percentage to Restaurant and commission fields to Order

-- Add commission_percentage to Restaurant (default 5.0%)
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "commissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5.00;

-- Add platform_commission_amount to Order (nullable for historical orders)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformCommissionAmount" INTEGER;

-- Add net_amount_for_restaurant to Order (nullable for historical orders)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "netAmountForRestaurant" INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN "Restaurant"."commissionPercentage" IS 'Platform commission percentage (e.g., 5.00 for 5%). Default is 5.0%.';
COMMENT ON COLUMN "Order"."platformCommissionAmount" IS 'Platform commission amount in cents (calculated when order is paid). NULL for historical orders.';
COMMENT ON COLUMN "Order"."netAmountForRestaurant" IS 'Net amount for restaurant in cents (totalAmount - platformCommissionAmount). NULL for historical orders.';

-- Create index for filtering orders with commission data
CREATE INDEX IF NOT EXISTS "Order_platformCommissionAmount_idx" ON "Order"("platformCommissionAmount") WHERE "platformCommissionAmount" IS NOT NULL;

