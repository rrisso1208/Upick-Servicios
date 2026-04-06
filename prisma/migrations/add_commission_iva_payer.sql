DO $$ BEGIN
CREATE TYPE "CommissionIvaPayer" AS ENUM ('RESTAURANT', 'PLATFORM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Restaurant"
    ADD COLUMN IF NOT EXISTS "commissionIvaPayer" "CommissionIvaPayer" NOT NULL DEFAULT 'RESTAURANT';
