
import 'dotenv/config';
import { getTransactionByReference } from '../src/lib/payments/wompi';

async function main() {
    const reference = process.argv[2];

    if (!reference) {
        console.error('Please provide a reference (Order ID) as an argument');
        process.exit(1);
    }

    console.log(`Checking transaction for reference ${reference}...`);

    try {
        const response = await getTransactionByReference(reference);

        if (!response || !response.data) {
            console.log('No transaction found for this reference.');
            return;
        }

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
