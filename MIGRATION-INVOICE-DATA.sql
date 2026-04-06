-- MIGRACIÓN: Crear tablas para datos de facturación electrónica
-- Ejecuta este script en Supabase SQL Editor

-- Paso 1: Crear enums
CREATE TYPE "PersonType" AS ENUM ('natural', 'juridica');
CREATE TYPE "DocumentType" AS ENUM ('NIT', 'CC', 'CE', 'PP', 'TI');

-- Paso 2: Crear tabla InvoiceData
CREATE TABLE IF NOT EXISTS "InvoiceData" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "personType" "PersonType" NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT NOT NULL,
  "regime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvoiceData_pkey" PRIMARY KEY ("id")
);

-- Crear índice único para userId
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceData_userId_key" ON "InvoiceData"("userId");

-- Crear índices
CREATE INDEX IF NOT EXISTS "InvoiceData_userId_idx" ON "InvoiceData"("userId");
CREATE INDEX IF NOT EXISTS "InvoiceData_documentNumber_idx" ON "InvoiceData"("documentNumber");

-- Crear foreign key
ALTER TABLE "InvoiceData" 
  ADD CONSTRAINT "InvoiceData_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paso 3: Agregar columnas a Order
ALTER TABLE "Order" 
  ADD COLUMN IF NOT EXISTS "needsInvoice" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order" 
  ADD COLUMN IF NOT EXISTS "invoiceDataId" TEXT;

-- Crear índice para invoiceDataId
CREATE INDEX IF NOT EXISTS "Order_invoiceDataId_idx" ON "Order"("invoiceDataId");
CREATE INDEX IF NOT EXISTS "Order_needsInvoice_idx" ON "Order"("needsInvoice");

-- Crear foreign key
ALTER TABLE "Order" 
  ADD CONSTRAINT "Order_invoiceDataId_fkey" 
  FOREIGN KEY ("invoiceDataId") REFERENCES "InvoiceData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verificar creación
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'InvoiceData'
ORDER BY column_name;

