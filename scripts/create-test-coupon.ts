
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Get a restaurant to associate the coupon with
        const restaurant = await prisma.restaurant.findFirst();

        if (!restaurant) {
            console.log('No restaurant found to create coupon for.');
            return;
        }

        const code = '123';
        console.log(`Creating/Updating coupon with code: ${code}`);

        const coupon = await prisma.coupon.upsert({
            where: { code: code },
            update: {
                isActive: true,
                validFrom: new Date(), // Now
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
            },
            create: {
                code: code,
                discountType: 'percentage',
                discountValue: 10, // 10%
                minOrderAmount: 0,
                maxUses: 100,
                oneTimePerUser: false,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                isActive: true,
                restaurantId: restaurant.id,
            },
        });

        console.log('Coupon created/updated:', coupon.code);
        console.log('Restaurant ID:', coupon.restaurantId);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
