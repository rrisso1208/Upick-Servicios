-- Migration: Add orderTypeMode to Restaurant table
-- This allows restaurant admins to configure if they offer both order types, only takeout, or only eat_in

-- Step 1: Create the OrderTypeMode enum
CREATE TYPE "OrderTypeMode" AS ENUM ('BOTH', 'TAKEOUT_ONLY', 'EAT_IN_ONLY');

-- Step 2: Add the orderTypeMode column to Restaurant table with default value BOTH
ALTER TABLE "Restaurant" 
ADD COLUMN "orderTypeMode" "OrderTypeMode" NOT NULL DEFAULT 'BOTH';

-- Step 3: Add a comment to document the field
COMMENT ON COLUMN "Restaurant"."orderTypeMode" IS 'Configures which order types are available: BOTH (eat_in and takeout), TAKEOUT_ONLY (only takeout), or EAT_IN_ONLY (only eat_in)';

