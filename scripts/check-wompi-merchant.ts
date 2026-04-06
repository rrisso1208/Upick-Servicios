
async function checkMerchant() {
    const publicKey = 'pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb';
    const url = `https://api-sandbox.wompi.co/v1/merchants/${publicKey}`;
    console.log(`Checking URL: ${url}`);

    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Merchant Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('Error Body:', await response.text());
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

checkMerchant();
