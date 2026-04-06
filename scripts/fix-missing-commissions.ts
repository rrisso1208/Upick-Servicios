
import { prisma } from '../src/lib/db';
import { calculateAndSaveOrderCommission } from '../src/lib/restaurant-commission';

async function main() {
    console.log('Fixing missing commissions...');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
        where: {
            createdAt: {
                gte: startOfDay,
            },
            status: 'paid',
            platformCommissionAmount: null,
        },
    });

    console.log(`Found ${orders.length} orders to fix.`);

    let successCount = 0;
    let failCount = 0;

    for (const order of orders) {
        try {
            await calculateAndSaveOrderCommission(order.id);
            successCount++;
        } catch (error) {
            console.error(`Failed to fix order ${order.id}:`, error);
            failCount++;
        }
    }

    console.log(`FINISHED: Success=${successCount}, Fail=${failCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
