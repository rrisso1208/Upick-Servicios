
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Checking notifications...');

    const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    console.log(`Found ${notifications.length} notifications.`);

    for (const n of notifications) {
        console.log('------------------------------------------------');
        console.log(`ID: ${n.id}`);
        console.log(`Type: ${n.type}`);
        console.log(`Title: ${n.title}`);
        console.log(`Message: ${n.message}`);
        console.log(`User ID: ${n.userId}`);
        console.log(`Is Read: ${n.isRead}`);
        console.log(`Metadata:`, JSON.stringify(n.metadata, null, 2));
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
