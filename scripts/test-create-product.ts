
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Get a valid restaurant admin and their restaurant
        const admin = await prisma.user.findFirst({
            where: {
                role: 'restaurant_admin',
                restaurantId: { not: null },
            },
        });

        if (!admin || !admin.restaurantId) {
            console.log('No restaurant admin found.');
            return;
        }

        console.log('Found admin:', admin.email, 'Restaurant ID:', admin.restaurantId);

        // 2. Get a valid category for this restaurant
        const category = await prisma.category.findFirst({
            where: {
                restaurantId: admin.restaurantId,
            },
        });

        if (!category) {
            console.log('No category found for this restaurant. Creating one...');
            // Create a dummy category if none exists
            const newCategory = await prisma.category.create({
                data: {
                    name: 'Test Category',
                    restaurantId: admin.restaurantId,
                    sort: 0,
                    isActive: true,
                },
            });
            console.log('Created category:', newCategory.id);
            return runTest(admin.restaurantId, newCategory.id);
        }

        console.log('Found category:', category.id, category.name);
        return runTest(admin.restaurantId, category.id);

    } catch (error) {
        console.error('Setup error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function runTest(restaurantId: string, categoryId: string) {
    try {
        console.log('Attempting to create product...');

        // Payload similar to user's
        const payload = {
            name: 'Hamburguesa Clasica Test',
            description: 'Cheese burguer 180gr. Angus.',
            price: 23000, // stored as cents in DB usually? No, code says: Math.round(priceNum * 100)
            // Wait, the API receives "23000" and multiplies by 100? 
            // If the user inputs 23000, does the API expect that to be the final price or does it multiply?
            // In route.ts: price: Math.round(priceNum * 100)
            // So if user sends 23000, it becomes 2300000.

            promotionPrice: null,
            categoryId: categoryId,
            prepMinutes: 10,
            imageUrl: null,
            imagePosition: 'center',
            imageScale: 1.0,
            isActive: true,
            isFeatured: false,
            inventoryEnabled: false,
            inventoryQuantity: null,
            inventoryAlertThreshold: null,
            restaurantId: restaurantId, // This is added by the API, but we need it here for direct prisma call
            sort: 1
        };

        const product = await prisma.product.create({
            data: payload,
        });

        console.log('Product created successfully:', product.id);

        // Clean up
        await prisma.product.delete({ where: { id: product.id } });
        console.log('Test product deleted.');

    } catch (error) {
        console.error('Error creating product:', error);
    }
}

main();
