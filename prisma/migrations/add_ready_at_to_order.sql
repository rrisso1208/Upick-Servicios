-- Add readyAt field to Order table to track when order was marked as ready
ALTER TABLE "Order" ADD COLUMN "readyAt" TIMESTAMP(3);

-- Create index for efficient queries
CREATE INDEX "Order_readyAt_idx" ON "Order"("readyAt");

