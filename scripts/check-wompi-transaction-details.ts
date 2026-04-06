
import dotenv from 'dotenv';
dotenv.config();

// Override URL for testing if needed - MUST be before import
process.env.WOMPI_API_URL = 'https://api-sandbox.wompi.co/v1';

import { getTransactionStatus } from '../src/lib/payments/wompi';

async function checkTransaction() {
    const transactionId = '11995260-1764886886-62026';
    const key = process.env.WOMPI_PRIVATE_KEY || '';
    console.log(`Checking transaction ${transactionId}...`);
    console.log('WOMPI_PRIVATE_KEY prefix:', key.substring(0, 10) + '...');
    console.log('WOMPI_API_URL:', process.env.WOMPI_API_URL);

    try {
        const response = await getTransactionStatus(transactionId);
        console.log('Transaction Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error fetching transaction:', error);
    }
}

checkTransaction();
