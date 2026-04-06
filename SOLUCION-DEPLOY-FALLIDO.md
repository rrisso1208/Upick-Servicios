# 🔧 Solución: Deploy Fallido por Prisma

## ❌ Problema

El deploy falla porque Prisma muestra una advertencia sobre actualización mayor (5.22.0 → 7.0.0) y esto puede estar causando que el build falle.

## ✅ Solución Aplicada

### 1. Ocultar mensaje de actualización

Se agregó la variable de entorno `PRISMA_HIDE_UPDATE_MESSAGE=true` al comando de build para ocultar la advertencia.

**Archivos modificados:**

- `vercel.json`: Build command actualizado
- `package.json`: Script de build actualizado

### 2. Verificar migraciones SQL pendientes

**IMPORTANTE:** Las siguientes migraciones SQL deben ejecutarse manualmente en tu base de datos de producción (Supabase) ANTES del deploy:

#### Migración 1: `wompiPaymentSourceId`

```sql
-- Archivo: prisma/migrations/add_wompi_payment_source_id.sql
ALTER TABLE "SavedPaymentMethod"
ADD COLUMN IF NOT EXISTS "wompiPaymentSourceId" TEXT;

CREATE INDEX IF NOT EXISTS "SavedPaymentMethod_wompiPaymentSourceId_idx"
ON "SavedPaymentMethod"("wompiPaymentSourceId");
```

#### Migración 2: `consentToSavePaymentMethod`

```sql
-- Archivo: prisma/migrations/add_consent_to_save_payment_method.sql
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "consentToSavePaymentMethod" BOOLEAN NOT NULL DEFAULT false;
```

## 📋 Pasos para Ejecutar Migraciones en Supabase

1. **Ir a Supabase Dashboard:**
   - https://app.supabase.com
   - Seleccionar tu proyecto
   - Ir a "SQL Editor"

2. **Ejecutar cada migración:**
   - Copiar y pegar el SQL de cada archivo
   - Ejecutar una por una
   - Verificar que no haya errores

3. **Verificar que las columnas existen:**

   ```sql
   -- Verificar SavedPaymentMethod
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'SavedPaymentMethod'
   AND column_name = 'wompiPaymentSourceId';

   -- Verificar Order
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Order'
   AND column_name = 'consentToSavePaymentMethod';
   ```

## 🚀 Después de Ejecutar Migraciones

1. **Hacer commit y push:**

   ```bash
   git add vercel.json package.json SOLUCION-DEPLOY-FALLIDO.md
   git commit -m "Ocultar advertencia de Prisma en build"
   git push
   ```

2. **El deploy debería funcionar ahora**

## 🔍 Si el Deploy Sigue Fallando

### Verificar logs de Vercel:

1. Ir a Vercel Dashboard
2. Seleccionar el deploy fallido
3. Revisar los logs del build
4. Buscar errores específicos de Prisma

### Posibles problemas adicionales:

- **Error de conexión a DB:** Verificar `DATABASE_URL` en Vercel
- **Error de migraciones:** Asegurarse de que todas las migraciones SQL se ejecutaron
- **Error de tipos:** Ejecutar `pnpm db:generate` localmente y verificar

## 📚 Referencias

- Prisma Update Guide: https://pris.ly/d/major-version-upgrade
- Vercel Build Logs: https://vercel.com/docs/concepts/deployments/build-logs
