/**
 * GET /api/orders/my-orders
 * Get orders for logged in student
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import logger from '../../../../lib/logger';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
        'Using Authorization header for authentication in my-orders'
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
          'Successfully authenticated via Authorization header in my-orders'
        );
      }
    } else {
      // Use cookie-based auth (for server-side requests)
      logger.info(
        {
          hasAuthHeader: !!authHeader,
        },
        'No Authorization header found, using cookie-based authentication in my-orders'
      );
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      logger.warn(
        { userId: user?.id, role: user?.role },
        'Unauthorized access to my-orders endpoint'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(
      { userId: user.id, userEmail: user.email },
      'Fetching orders for student'
    );

    // First, let's check if there are any orders at all for debugging
    const allOrdersCount = await prisma.order.count();
    const userOrdersCount = await prisma.order.count({
      where: {
        studentId: user.id,
      },
    });

    logger.info(
      {
        userId: user.id,
        allOrdersCount,
        userOrdersCount,
      },
      'Order counts for debugging'
    );

    const orders = await prisma.order.findMany({
      where: {
        studentId: user.id,
      },
      select: {
        id: true,
        pickupCode: true,
        pickupSlotStart: true,
        pickupSlotEnd: true,
        status: true,
        totalAmount: true,
        type: true, // Include order type (eat_in or takeout) - deprecated
        serviceMode: true, // Service mode (eat_in, takeaway, internal_delivery)
        deliveryCost: true, // Delivery cost in cents
        createdAt: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            name: true,
            slug: true,
            location: true,
          },
        },
        deliveryPoint: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Increased from 50 to 100 to show more orders
    });

    logger.info(
      {
        userId: user.id,
        orderCount: orders.length,
        orderIds: orders.map((o) => o.id),
        orderStatuses: orders.map((o) => ({ id: o.id, status: o.status })),
      },
      'Orders fetched with details'
    );

    logger.info(
      { userId: user.id, orderCount: orders.length },
      'Orders fetched successfully'
    );

    return NextResponse.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error fetching orders for student'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      },
      { status: 500 }
    );
  }
}
