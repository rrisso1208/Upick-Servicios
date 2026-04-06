/**
 * Database seeder for UPIC
 * Creates sample data: 1 university, 3 restaurants, commission policy, products
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Place (University)
  console.log('Creating place...');
  const place = await prisma.place.upsert({
    where: { slug: 'universidad-nacional' },
    update: {},
    create: {
      name: 'Universidad Nacional de Colombia',
      slug: 'universidad-nacional',
      isActive: true,
    },
  });
  console.log(`✅ Place created: ${place.name}`);

  // 2. Create Restaurants (SKIPPED for clean DB)
  /*
  console.log('Creating restaurants...');
  const restaurants = await Promise.all([
    // ... (restaurants code commented out)
  ]);
  */

  // 3. Create Categories and Products (SKIPPED)
  /*
  console.log('Creating menu items...');
  // ... (products code commented out)
  */

  // 4. Create Global Commission Policy
  console.log('Creating commission policy...');
  await prisma.commissionPolicy.upsert({
    where: {
      id: 'global-default-policy',
    },
    update: {},
    create: {
      id: 'global-default-policy',
      scope: 'global',
      type: 'fixed',
      rateFixed: new Decimal('0.04'), // 4%
      effectiveFrom: new Date('2024-01-01'),
      isActive: true,
    },
  });
  console.log('✅ Commission policy created (4% global)');

  // 5. Create Superadmin User
  console.log('Creating superadmin user...');
  await prisma.user.upsert({
    where: { email: 'u.pickcompany@gmail.com' },
    update: {},
    create: {
      email: 'u.pickcompany@gmail.com',
      role: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log('✅ Superadmin user created: u.pickcompany@gmail.com');

  console.log('');
  console.log('🎉 Clean seed completed successfully!');
  console.log('');
  console.log('Superadmin: u.pickcompany@gmail.com');
  console.log('Note: Password is managed by Supabase Auth, not set here.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

