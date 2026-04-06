import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { getTransactionByReference } from '../src/lib/payments/wompi';

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Please provide an Order ID');
    process.exit(1);
  }

  console.log(`Checking order ${orderId}...`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { student: true },
  });

  if (!order) {
    console.error('Order not found');
    return;
  }

  console.log('Order Details:');
  console.log(`- ID: ${order.id}`);
  console.log(`- Student: ${order.student.email}`);
  console.log(`- Consent to Save: ${order.consentToSavePaymentMethod}`);
  console.log(`- Status: ${order.status}`);

  console.log('\nChecking Wompi Transaction...');
  try {
    const response = await getTransactionByReference(orderId);
    if (response?.data) {
      const tx = response.data;
      console.log(`- Transaction ID: ${tx.id}`);
      console.log(`- Status: ${tx.status}`);
      console.log(`- Payment Source ID: ${tx.payment_source_id}`);
      console.log(`- Payment Method Type: ${tx.payment_method_type}`);
      // payment_method is not returned in this endpoint; log type only
    } else {
      console.log('No Wompi transaction found.');
    }
  } catch (e) {
    console.error('Error fetching transaction:', e);
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
