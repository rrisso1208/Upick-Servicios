-- Create NotificationType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM (
            'ORDER_CANCELLATION',
            'REFUND_REQUEST',
            'CREDIT_ADJUSTMENT',
            'SYSTEM_ALERT'
        );
    END IF;
END $$;

