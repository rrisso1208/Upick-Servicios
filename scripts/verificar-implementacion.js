/**
 * Script de verificación rápida de la implementación
 * Verifica que las tablas y columnas necesarias existan
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificar() {
  console.log('🔍 Verificando implementación...\n');

  try {
    // Verificar tablas
    console.log('1. Verificando tablas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Review', 'Coupon', 'CouponRedemption')
      ORDER BY table_name;
    `;

    const expectedTables = ['Review', 'Coupon', 'CouponRedemption'];
    const foundTables = tables.map((t) => t.table_name);

    expectedTables.forEach((table) => {
      if (foundTables.includes(table)) {
        console.log(`   ✅ Tabla "${table}" existe`);
      } else {
        console.log(
          `   ❌ Tabla "${table}" NO existe - Ejecuta MIGRATION-SQL.sql`
        );
      }
    });

    // Verificar columnas de Restaurant
    console.log('\n2. Verificando columnas de Restaurant...');
    const restaurantColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Restaurant' 
      AND column_name IN ('averageRating', 'reviewCount');
    `;

    const foundRestaurantCols = restaurantColumns.map((c) => c.column_name);
    ['averageRating', 'reviewCount'].forEach((col) => {
      if (foundRestaurantCols.includes(col)) {
        console.log(`   ✅ Columna "Restaurant.${col}" existe`);
      } else {
        console.log(`   ❌ Columna "Restaurant.${col}" NO existe`);
      }
    });

    // Verificar columnas de Order
    console.log('\n3. Verificando columnas de Order...');
    const orderColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Order' 
      AND column_name IN ('couponId', 'discountAmount');
    `;

    const foundOrderCols = orderColumns.map((c) => c.column_name);
    ['couponId', 'discountAmount'].forEach((col) => {
      if (foundOrderCols.includes(col)) {
        console.log(`   ✅ Columna "Order.${col}" existe`);
      } else {
        console.log(`   ❌ Columna "Order.${col}" NO existe`);
      }
    });

    // Verificar enum DiscountType
    console.log('\n4. Verificando enum DiscountType...');
    try {
      const enumCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'DiscountType'
        ) as exists;
      `;
      if (enumCheck[0].exists) {
        console.log('   ✅ Enum "DiscountType" existe');
      } else {
        console.log('   ❌ Enum "DiscountType" NO existe');
      }
    } catch (e) {
      console.log('   ⚠️  No se pudo verificar enum');
    }

    // Contar datos existentes
    console.log('\n5. Datos existentes:');
    try {
      const reviewCount = await prisma.review.count();
      const couponCount = await prisma.coupon.count();
      const redemptionCount = await prisma.couponRedemption.count();

      console.log(`   📊 Reseñas: ${reviewCount}`);
      console.log(`   🎟️  Cupones: ${couponCount}`);
      console.log(`   💰 Canjes: ${redemptionCount}`);
    } catch (e) {
      console.log('   ⚠️  Error al contar datos:', e.message);
    }

    console.log('\n✅ Verificación completada!\n');
  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.log('\n💡 Asegúrate de:');
    console.log('   1. Ejecutar MIGRATION-SQL.sql en tu base de datos');
    console.log('   2. Ejecutar "pnpm prisma generate"');
    console.log('   3. Verificar que DATABASE_URL esté configurado');
  } finally {
    await prisma.$disconnect();
  }
}

verificar();
