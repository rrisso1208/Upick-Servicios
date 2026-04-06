
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Payouts & Invoices Test...');

    try {
        // 1. Setup Data
        console.log('\n--- Setup ---');

        // Create Place
        const place = await prisma.place.create({
            data: {
                name: 'Test Place Payouts',
                slug: 'test-place-payouts-' + Date.now(),
            },
        });

        // Create Restaurant
        const restaurant = await prisma.restaurant.create({
            data: {
                name: 'Test Restaurant Payouts',
                slug: 'test-restaurant-payouts-' + Date.now(),
                placeId: place.id,
                commissionPercentage: 5.0,
            },
        });

        // Create User (Student)
        const student = await prisma.user.create({
            data: {
                email: `student-payouts-${Date.now()}@test.com`,
                role: 'student',
            },
        });

        // Create Order 1 (Delivered)
        const order1 = await prisma.order.create({
            data: {
                placeId: place.id,
                restaurantId: restaurant.id,
                studentId: student.id,
                status: 'delivered',
                totalAmount: 2000000, // $20,000
                pickupSlotStart: new Date(),
                pickupSlotEnd: new Date(),
                pickupCode: '111111',
            },
        });

        // Create OrderFinance for Order 1
        await prisma.orderFinance.create({
            data: {
                orderId: order1.id,
                baseAmount: 1800000,
                taxAmount: 200000,
                tipAmount: 0,
                commissionRateApplied: 0.05,
                commissionAmount: 100000, // 5% of 2,000,000
                gatewayFeeAmount: 50000,
                netForRestaurant: 1850000,
                policyIdApplied: 'default',
            },
        });

        console.log(`✅ Created Test Data: Restaurant ${restaurant.name}, Order ${order1.pickupCode}`);

        // 2. Test Close Payout Cycle
        console.log('\n--- Testing Close Payout Cycle ---');

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // Aggregate (Simulating API logic)
        const aggregates = await prisma.orderFinance.aggregate({
            where: {
                order: {
                    restaurantId: restaurant.id,
                    status: { in: ['delivered', 'paid', 'ready'] },
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            },
            _sum: {
                baseAmount: true,
                taxAmount: true,
                commissionAmount: true,
                netForRestaurant: true,
            },
        });

        const payoutCycle = await prisma.payoutCycle.create({
            data: {
                restaurantId: restaurant.id,
                periodStart: startDate,
                periodEnd: endDate,
                status: 'closed',
                grossSales: (aggregates._sum.baseAmount || 0) + (aggregates._sum.taxAmount || 0),
                commissionTotal: aggregates._sum.commissionAmount || 0,
                netToRestaurant: aggregates._sum.netForRestaurant || 0,
            },
        });

        console.log(`✅ Closed Payout Cycle: ${payoutCycle.id}`);
        console.log(`   Gross Sales: $${payoutCycle.grossSales / 100}`);
        console.log(`   Commission: $${payoutCycle.commissionTotal / 100}`);

        if (payoutCycle.commissionTotal !== 100000) {
            throw new Error(`Expected commission 100000, got ${payoutCycle.commissionTotal}`);
        }

        // 3. Test Create Invoice
        console.log('\n--- Testing Create Invoice ---');

        const invoiceNumber = `TEST-INV-${Date.now()}`;
        const invoice = await prisma.invoice.create({
            data: {
                payoutCycleId: payoutCycle.id,
                number: invoiceNumber,
                issueDate: new Date(),
                dueDate: new Date(),
                amount: payoutCycle.commissionTotal,
                status: 'issued',
                pdfUrl: 'https://example.com/invoice.pdf',
            },
        });

        // Update Payout Status
        await prisma.payoutCycle.update({
            where: { id: payoutCycle.id },
            data: { status: 'invoiced' },
        });

        console.log(`✅ Created Invoice: ${invoice.number}`);

        const updatedPayout = await prisma.payoutCycle.findUnique({
            where: { id: payoutCycle.id },
        });

        if (updatedPayout?.status !== 'invoiced') {
            throw new Error('Payout status was not updated to invoiced');
        }
        console.log('✅ Payout status updated to "invoiced"');

        // 4. Cleanup
        console.log('\n--- Cleanup ---');
        await prisma.invoice.delete({ where: { id: invoice.id } });
        await prisma.payoutCycle.delete({ where: { id: payoutCycle.id } });
        await prisma.orderFinance.delete({ where: { orderId: order1.id } });
        await prisma.order.delete({ where: { id: order1.id } });
        await prisma.user.delete({ where: { id: student.id } });
        await prisma.restaurant.delete({ where: { id: restaurant.id } });
        await prisma.place.delete({ where: { id: place.id } });

        console.log('✅ Cleanup completed');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
