/**
 * GET /api/reviews/[restaurantId]
 * Get reviews for a restaurant (PUBLIC - no comments, only ratings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;

    // Public API - only return ratings, no comments or user info
    const reviews = await prisma.review.findMany({
      where: { restaurantId },
      select: {
        id: true,
        rating: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
