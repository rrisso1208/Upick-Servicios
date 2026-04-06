
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const badges = await prisma.badge.findMany();
        console.log('Total badges found:', badges.length);
        if (badges.length > 0) {
            console.log('Badges:', JSON.stringify(badges, null, 2));
        } else {
            console.log('No badges found in the database.');
        }
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
