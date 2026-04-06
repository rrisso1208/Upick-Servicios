
import { prisma } from '../src/lib/db';
import { calculateAndSaveOrderCommission } from '../src/lib/restaurant-commission';

async function main() {
    console.log('Finding order with missing commission...');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const order = await prisma.order.findFirst({
        where: {
            createdAt: {
                gte: startOfDay,
            },
            status: 'paid',
            platformCommissionAmount: null,
        },
        include: {
            restaurant: true,
        },
    });

    if (!order) {
        console.log('No order found with missing commission.');
        return;
    }

    console.log(`Found order: ${order.id}`);
    console.log(`Restaurant: ${order.restaurant.name}`);
    console.log(`Commission Percentage: ${order.restaurant.commissionPercentage}`);
    console.log(`Order Total: ${order.totalAmount}`);

    console.log('Attempting to calculate commission...');
    try {
        await calculateAndSaveOrderCommission(order.id);
        console.log('Commission calculation successful!');

        // Verify result
        const updatedOrder = await prisma.order.findUnique({
            where: { id: order.id },
        });
        console.log(`Updated Commission: ${updatedOrder?.platformCommissionAmount}`);
    } catch (error) {
        console.error('Commission calculation failed:', error);
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
