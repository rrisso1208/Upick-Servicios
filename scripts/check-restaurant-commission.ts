
import { prisma } from '../src/lib/db';

async function main() {
    const restaurant = await prisma.restaurant.findFirst({
        where: {
            name: 'Prueba 1',
        },
    });

    if (restaurant) {
        console.log(`PERCENTAGE:${restaurant.commissionPercentage}`);
    } else {
        console.log('NOT_FOUND');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
