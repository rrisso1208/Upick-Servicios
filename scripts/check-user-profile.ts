
import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
    const email = 'jsrisso@gmail.com'; // User from previous logs
    console.log(`Checking profile for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            invoiceData: true,
        },
    });

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log('User Profile:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Name: ${user.firstName} ${user.lastName}`);
    console.log(`- Phone: ${user.phoneNumber}`);
    console.log(`- Invoice Data: ${user.invoiceData ? 'Present' : 'MISSING'}`);

    if (user.invoiceData) {
        console.log(`  - Doc Type: ${user.invoiceData.documentType}`);
        console.log(`  - Doc Number: ${user.invoiceData.documentNumber}`);
        console.log(`  - Phone: ${user.invoiceData.phone}`);
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
