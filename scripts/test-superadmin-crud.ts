
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Superadmin CRUD Test...');

    try {
        // 1. Test University CRUD
        console.log('\n--- Testing University CRUD ---');

        // Create
        const university = await prisma.place.create({
            data: {
                name: 'Test University',
                slug: 'test-university-' + Date.now(),
                isActive: true,
            },
        });
        console.log(`✅ Created University: ${university.name} (${university.id})`);

        // Update
        const updatedUniversity = await prisma.place.update({
            where: { id: university.id },
            data: { name: 'Updated Test University' },
        });
        console.log(`✅ Updated University: ${updatedUniversity.name}`);

        // 2. Test Restaurant CRUD
        console.log('\n--- Testing Restaurant CRUD ---');

        // Create
        const restaurant = await prisma.restaurant.create({
            data: {
                name: 'Test Restaurant',
                slug: 'test-restaurant-' + Date.now(),
                placeId: university.id,
                isActive: true,
                commissionPercentage: 5.0,
            },
        });
        console.log(`✅ Created Restaurant: ${restaurant.name} (${restaurant.id})`);

        // Update
        const updatedRestaurant = await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: { name: 'Updated Test Restaurant' },
        });
        console.log(`✅ Updated Restaurant: ${updatedRestaurant.name}`);

        // 3. Cleanup
        console.log('\n--- Cleanup ---');
        await prisma.restaurant.delete({ where: { id: restaurant.id } });
        console.log('✅ Deleted Test Restaurant');

        await prisma.place.delete({ where: { id: university.id } });
        console.log('✅ Deleted Test University');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
