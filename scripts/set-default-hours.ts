/**
 * Script para configurar horarios por defecto a todos los restaurantes
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const defaultOpenHours = {
  monday: { open: '08:00', close: '20:00' },
  tuesday: { open: '08:00', close: '20:00' },
  wednesday: { open: '08:00', close: '20:00' },
  thursday: { open: '08:00', close: '20:00' },
  friday: { open: '08:00', close: '20:00' },
  saturday: { open: '09:00', close: '15:00' },
  sunday: { open: '00:00', close: '00:00' }, // Cerrado
};

async function main() {
  console.log('Configurando horarios por defecto...');

  const restaurants = await prisma.restaurant.findMany({
    where: {
      openHours: { equals: Prisma.JsonNull },
    },
  });

  console.log(`Encontrados ${restaurants.length} restaurantes sin horarios`);

  for (const restaurant of restaurants) {
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        openHours: defaultOpenHours,
      },
    });
    console.log(`✓ Horarios configurados para: ${restaurant.name}`);
  }

  console.log('¡Listo!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
