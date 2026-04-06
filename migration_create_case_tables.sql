-- Migration: Create Case and CaseMessage tables
-- This migration creates the tables needed for the case management system

-- Step 1: Create CaseType enum (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "CaseType" AS ENUM ('REFUND_REQUEST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create CaseStatus enum (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create Case table
CREATE TABLE IF NOT EXISTS "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "isResolvedByUser" BOOLEAN NOT NULL DEFAULT false,
    "forceClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create CaseMessage table
CREATE TABLE IF NOT EXISTS "CaseMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create unique constraints
DO $$ BEGIN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_caseNumber_key" UNIQUE ("caseNumber");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_orderId_key" UNIQUE ("orderId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 6: Create foreign key constraints
DO $$ BEGIN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS "Case_orderId_idx" ON "Case"("orderId");
CREATE INDEX IF NOT EXISTS "Case_userId_idx" ON "Case"("userId");
CREATE INDEX IF NOT EXISTS "Case_restaurantId_idx" ON "Case"("restaurantId");
CREATE INDEX IF NOT EXISTS "Case_status_idx" ON "Case"("status");
CREATE INDEX IF NOT EXISTS "Case_type_idx" ON "Case"("type");
CREATE INDEX IF NOT EXISTS "Case_caseNumber_idx" ON "Case"("caseNumber");
CREATE INDEX IF NOT EXISTS "Case_createdAt_idx" ON "Case"("createdAt");

CREATE INDEX IF NOT EXISTS "CaseMessage_caseId_idx" ON "CaseMessage"("caseId");
CREATE INDEX IF NOT EXISTS "CaseMessage_userId_idx" ON "CaseMessage"("userId");
CREATE INDEX IF NOT EXISTS "CaseMessage_createdAt_idx" ON "CaseMessage"("createdAt");

-- Step 8: Add comments
COMMENT ON TABLE "Case" IS 'Cases for managing refund requests and customer support';
COMMENT ON TABLE "CaseMessage" IS 'Messages within a case for communication between users and support';

