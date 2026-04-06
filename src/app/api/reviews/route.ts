/**
 * POST /api/reviews
 * Create a review for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../lib/auth';
import { z } from 'zod';
import logger from '../../../lib/logger';

export const dynamic = 'force-dynamic';

const createReviewSchema = z.object({
  orderId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  productId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      logger.info(
        {
          tokenLength: authHeader.length,
          tokenPreview: authHeader.substring(0, 30) + '...',
        },
        'Using Authorization header for authentication in reviews'
      );
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        logger.warn(
          {
            authHeaderExists: !!authHeader,
            authHeaderStartsWithBearer: authHeader?.startsWith('Bearer '),
          },
          'getAuthUserFromHeader returned null - falling back to cookies'
        );
        // Fall back to cookie-based auth
        user = await getAuthUser();
      } else {
        logger.info(
          { userId: user.id, email: user.email },
          'Successfully authenticated via Authorization header in reviews'
        );
      }
    } else {
      // Use cookie-based auth (for server-side requests)
      logger.info(
        {
          hasAuthHeader: !!authHeader,
        },
        'No Authorization header found, using cookie-based authentication in reviews'
      );
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      logger.warn(
        { userId: user?.id, role: user?.role },
        'Unauthorized access to reviews endpoint'
      );
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createReviewSchema.parse(body);

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: validated.orderId },
      include: {
        restaurant: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.studentId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { orderId: validated.orderId },
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review already exists for this order' },
        { status: 400 }
      );
    }

    // Verify productId if provided
    if (validated.productId) {
      const productExists = order.items.some(
        (item) => item.productId === validated.productId
      );
      if (!productExists) {
        return NextResponse.json(
          { success: false, error: 'Product not found in order' },
          { status: 400 }
        );
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId: validated.orderId,
        restaurantId: order.restaurantId,
        productId: validated.productId || null,
        userId: user.id,
        rating: validated.rating,
        comment: validated.comment || null,
      },
    });

    // Update restaurant average rating and review count
    const restaurantReviews = await prisma.review.findMany({
      where: { restaurantId: order.restaurantId },
      select: { rating: true },
    });

    const averageRating =
      restaurantReviews.reduce((sum, r) => sum + r.rating, 0) /
      restaurantReviews.length;

    await prisma.restaurant.update({
      where: { id: order.restaurantId },
      data: {
        averageRating,
        reviewCount: restaurantReviews.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: { review },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
