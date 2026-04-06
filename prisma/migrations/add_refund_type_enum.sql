-- Create RefundType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RefundType" AS ENUM ('REFUND_TO_PAYMENT_METHOD', 'CONVERT_TO_CREDITS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CreditTransactionType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "CreditTransactionType" AS ENUM ('REFUND_TO_CREDITS', 'CREDIT_USED', 'MANUAL_ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

