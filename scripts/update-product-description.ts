
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const product = await prisma.product.findFirst({
            where: {
                name: 'Hamburguesa Clasica',
            },
        });

        if (product) {
            console.log('Updating description for:', product.name);
            const updated = await prisma.product.update({
                where: { id: product.id },
                data: {
                    description: 'Cheese burguer 180gr. Angus.',
                },
            });
            console.log('Updated description:', updated.description);
        } else {
            console.log('Product "Hamburguesa Clasica" not found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
