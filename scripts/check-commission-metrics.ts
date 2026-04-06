
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Checking commission metrics...');

    // Get restaurants with orders today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
        where: {
            createdAt: {
                gte: startOfDay,
            },
            status: {
                in: ['paid', 'in_progress', 'ready', 'delivered'],
            },
        },
        include: {
            restaurant: true,
        },
    });

    console.log(`Found ${orders.length} orders today.`);

    const restaurantStats = new Map();

    for (const order of orders) {
        const restId = order.restaurantId;
        if (!restaurantStats.has(restId)) {
            restaurantStats.set(restId, {
                name: order.restaurant.name,
                commissionPercentage: order.restaurant.commissionPercentage,
                orders: [],
                totalRevenue: 0,
                totalCommission: 0,
            });
        }

        const stats = restaurantStats.get(restId);
        stats.orders.push({
            id: order.id,
            total: order.totalAmount,
            commission: order.platformCommissionAmount,
            net: order.netAmountForRestaurant,
            status: order.status,
        });
        stats.totalRevenue += order.totalAmount;
        stats.totalCommission += (order.platformCommissionAmount || 0);
    }

    for (const [id, stats] of restaurantStats) {
        console.log(`TOTAL_COMMISSION:${stats.totalCommission}`);
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
