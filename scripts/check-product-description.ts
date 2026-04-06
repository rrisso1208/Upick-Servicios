
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const product = await prisma.product.findFirst({
            where: {
                name: 'Hamburguesa Clasica',
            },
        });

        let output = '';
        if (product) {
            output += `Product found: ${product.name}\n`;
            output += `Description value: ${product.description}\n`;
            output += `Description type: ${typeof product.description}\n`;
        } else {
            output += 'Product "Hamburguesa Clasica" not found.\n';
        }

        fs.writeFileSync('product-description.txt', output);
        console.log('Output written to product-description.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
