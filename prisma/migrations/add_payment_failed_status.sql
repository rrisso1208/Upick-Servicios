-- Add payment_failed status to OrderStatus enum
DO $$ 
BEGIN
    -- Check if payment_failed value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'payment_failed' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
    ) THEN
        -- Add payment_failed to OrderStatus enum
        ALTER TYPE "OrderStatus" ADD VALUE 'payment_failed' AFTER 'awaiting_payment';
    END IF;
END $$;

