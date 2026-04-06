
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting Review System Test...');

  try {
    // 1. Setup: Get a restaurant and a student
    const restaurant = await prisma.restaurant.findFirst({
      include: { products: true },
    });
    
    if (!restaurant) throw new Error('No restaurant found. Run seed first.');
    
    const student = await prisma.user.findFirst({
      where: { role: 'student' },
    });

    if (!student) throw new Error('No student found. Run seed first.');

    console.log(`📍 Using Restaurant: ${restaurant.name}`);
    console.log(`👤 Using Student: ${student.email}`);

    // 2. Create a test order (delivered)
    const order = await prisma.order.create({
      data: {
        placeId: restaurant.placeId,
        restaurantId: restaurant.id,
        studentId: student.id,
        status: 'delivered',
        totalAmount: 15000,
        pickupSlotStart: new Date(),
        pickupSlotEnd: new Date(Date.now() + 1000 * 60 * 15),
        pickupCode: Math.floor(100000 + Math.random() * 900000).toString(),
        items: {
          create: {
            productId: restaurant.products[0].id,
            quantity: 1,
            unitPrice: restaurant.products[0].price,
          },
        },
      },
    });

    console.log(`✅ Created Test Order: ${order.id}`);

    // 3. Simulate POST /api/reviews (Logic only, not actual HTTP call)
    // We are testing the logic that would be in the API handler
    console.log('📝 Creating Review...');
    
    const rating = 5;
    const comment = 'Test review from script';

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        restaurantId: restaurant.id,
        userId: student.id,
        rating,
        comment,
      },
    });

    console.log(`✅ Review Created: ${review.id}`);

    // 4. Verify Restaurant Stats Update
    // In the actual API, this is done manually. Let's verify if we can update it.
    const restaurantReviews = await prisma.review.findMany({
      where: { restaurantId: restaurant.id },
      select: { rating: true },
    });

    const averageRating =
      restaurantReviews.reduce((sum, r) => sum + r.rating, 0) /
      restaurantReviews.length;

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        averageRating,
        reviewCount: restaurantReviews.length,
      },
    });

    console.log(`✅ Updated Restaurant Stats: ${averageRating.toFixed(1)} stars (${restaurantReviews.length} reviews)`);

    // 5. Verify GET logic
    const fetchedReviews = await prisma.review.findMany({
      where: { restaurantId: restaurant.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`✅ Fetched ${fetchedReviews.length} reviews for restaurant`);

    // Cleanup
    await prisma.review.delete({ where: { id: review.id } });
    await prisma.order.delete({ where: { id: order.id } });
    console.log('🧹 Cleanup completed');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
