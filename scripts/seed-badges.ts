/**
 * Seed script to populate initial badges
 * Run with: tsx scripts/seed-badges.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  {
    name: 'Vegano',
    icon: 'leaf',
    color: 'green',
    description: 'Producto 100% vegano, sin ingredientes de origen animal',
    sort: 1,
  },
  {
    name: 'Vegetariano',
    icon: 'leaf',
    color: 'green',
    description: 'Producto vegetariano, sin carne',
    sort: 2,
  },
  {
    name: 'Sin Gluten',
    icon: 'wheat',
    color: 'blue',
    description: 'Producto libre de gluten',
    sort: 3,
  },
  {
    name: 'Bajo en Grasas',
    icon: 'heart',
    color: 'green',
    description: 'Producto bajo en grasas saturadas',
    sort: 4,
  },
  {
    name: 'Contiene Nueces',
    icon: 'alert-triangle',
    color: 'yellow',
    description: 'Este producto contiene nueces o frutos secos',
    sort: 5,
  },
  {
    name: 'Contiene Camarones',
    icon: 'fish',
    color: 'red',
    description: 'Este producto contiene camarones o mariscos',
    sort: 6,
  },
  {
    name: 'Contiene Lácteos',
    icon: 'milk',
    color: 'blue',
    description: 'Este producto contiene lácteos',
    sort: 7,
  },
  {
    name: 'Contiene Huevo',
    icon: 'egg',
    color: 'yellow',
    description: 'Este producto contiene huevo',
    sort: 8,
  },
  {
    name: 'Picante',
    icon: 'flame',
    color: 'red',
    description: 'Producto picante o con especias fuertes',
    sort: 9,
  },
  {
    name: 'Sin Azúcar',
    icon: 'ban',
    color: 'green',
    description: 'Producto sin azúcar añadida',
    sort: 10,
  },
  {
    name: 'Alto en Proteína',
    icon: 'dumbbell',
    color: 'blue',
    description: 'Producto rico en proteínas',
    sort: 11,
  },
  {
    name: 'Rico en Fibra',
    icon: 'grain',
    color: 'green',
    description: 'Producto con alto contenido de fibra',
    sort: 12,
  },
];

async function main() {
  console.log('🌱 Seeding badges...');

  for (const badgeData of badges) {
    try {
      const badge = await prisma.badge.upsert({
        where: { name: badgeData.name },
        update: {
          icon: badgeData.icon,
          color: badgeData.color,
          description: badgeData.description,
          sort: badgeData.sort,
          isActive: true,
        },
        create: badgeData,
      });
      console.log(`✅ ${badge.name} (${badge.color})`);
    } catch (error) {
      console.error(`❌ Error creating badge ${badgeData.name}:`, error);
    }
  }

  console.log('✨ Badges seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding badges:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
