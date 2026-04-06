
import 'dotenv/config';
import { getTransactionStatus } from '../src/lib/payments/wompi';

async function main() {
    const transactionId = process.argv[2];

    if (!transactionId) {
        console.error('Please provide a transaction ID as an argument');
        console.error('Usage: npx tsx scripts/check-wompi-transaction.ts <transaction_id>');
        process.exit(1);
    }

    console.log(`Checking transaction ${transactionId}...`);

    try {
        const response = await getTransactionStatus(transactionId);
        const transaction = response.data;

        console.log('------------------------------------------------');
        console.log(`ID: ${transaction.id}`);
        console.log(`Status: ${transaction.status}`);
        console.log(`Reference: ${transaction.reference}`);
        console.log(`Amount: ${transaction.amount_in_cents}`);
        console.log(`Payment Method: ${transaction.payment_method_type}`);
        console.log(`Payment Source ID: ${transaction.payment_source_id || 'NULL'}`);
        console.log('------------------------------------------------');
        console.log('Full Response:', JSON.stringify(transaction, null, 2));

    } catch (error) {
        console.error('Error fetching transaction:', error);
    }
}

main();
