
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Find a restaurant admin
        const admin = await prisma.user.findFirst({
            where: {
                role: 'restaurant_admin',
                restaurantId: { not: null },
            },
        });

        if (!admin || !admin.restaurantId) {
            console.log('No restaurant admin found.');
            return;
        }

        console.log('Found admin:', admin.email, 'Restaurant ID:', admin.restaurantId);

        // Query restaurant overload status
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: admin.restaurantId },
            select: {
                id: true,
                name: true,
                isOverloaded: true,
                overloadUntil: true,
            },
        });

        if (restaurant) {
            console.log('Restaurant found:', JSON.stringify(restaurant, null, 2));
        } else {
            console.log('Restaurant not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
