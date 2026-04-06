
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Fetching latest order...');

    const order = await prisma.order.findFirst({
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            payment: true,
            student: true,
        },
    });

    if (!order) {
        console.log('No orders found.');
        return;
    }

    console.log('------------------------------------------------');
    console.log(`Order ID: ${order.id}`);
    console.log(`Created At: ${order.createdAt}`);
    console.log(`Status: ${order.status}`);
    console.log(`Student: ${order.student.email}`);
    console.log(`Consent to Save: ${order.consentToSavePaymentMethod}`);

    if (order.payment) {
        console.log(`Payment ID: ${order.payment.id}`);
        console.log(`Provider Ref (Transaction ID): ${order.payment.providerRef}`);
        console.log(`Payment Status: ${order.payment.status}`);
        console.log(`Payment Method: ${order.payment.method}`);
    } else {
        console.log('No payment record found for this order.');
    }
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
