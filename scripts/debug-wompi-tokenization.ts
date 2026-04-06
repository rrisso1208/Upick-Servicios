
import { prisma } from '../src/lib/db';
import { POST } from '../src/app/api/payments/verify-transaction/route';
import { NextRequest } from 'next/server';

// Mock NextRequest
function createMockRequest(body: any) {
    return {
        json: async () => body,
        headers: new Map(),
    } as unknown as NextRequest;
}

async function main() {
    console.log('Debugging Wompi Tokenization...');

    // 1. Get the most recent order that has consent to save payment method
    const order = await prisma.order.findFirst({
        where: {
            consentToSavePaymentMethod: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            student: true,
        },
    });

    if (!order) {
        console.log('No order found with consentToSavePaymentMethod = true');
        return;
    }

    console.log(`Found order ${order.id} with consent = true`);
    console.log(`Student: ${order.student.email}`);

    // 2. Simulate a Wompi transaction response with payment_source_id
    // We need to mock the Wompi API response that verify-transaction fetches
    // Since we can't easily mock the external fetch inside the route without a library,
    // we will instead inspect the code logic or try to call the internal logic if possible.

    // However, since we can't mock the external fetch easily in this script without modifying the code,
    // let's just check the database state and maybe manually create a saved payment method to verify the DB constraint/logic.

    console.log('Checking if any saved payment methods exist for this user...');
    const methods = await prisma.savedPaymentMethod.findMany({
        where: {
            userId: order.studentId,
        },
    });

    console.log(`Found ${methods.length} saved methods.`);
    console.log(JSON.stringify(methods, null, 2));

    // 3. Create a dummy saved payment method to verify DB works
    const dummySourceId = `tok_test_${Date.now()}`;
    console.log(`Attempting to create a dummy saved payment method with ID ${dummySourceId}...`);

    try {
        const saved = await prisma.savedPaymentMethod.create({
            data: {
                userId: order.studentId,
                method: 'CARD',
                wompiPaymentSourceId: dummySourceId,
                brand: 'VISA',
                last4Digits: '4242',
                bankName: null,
                isDefault: false,
            },
        });
        console.log('Successfully created dummy payment method:', saved.id);

        // Clean up
        await prisma.savedPaymentMethod.delete({
            where: { id: saved.id },
        });
        console.log('Cleaned up dummy payment method.');

    } catch (error) {
        console.error('Failed to create dummy payment method:', error);
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
