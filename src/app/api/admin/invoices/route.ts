/**
 * GET /api/admin/invoices
 * Get all orders with invoice data for the restaurant admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'restaurant_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not assigned' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    // Get all orders with invoice data for this restaurant
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: user.restaurantId,
        needsInvoice: true,
        invoiceDataId: { not: null },
        ...(search && {
          OR: [
            { pickupCode: { contains: search, mode: 'insensitive' } },
            {
              student: {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
            {
              invoiceData: {
                OR: [
                  {
                    businessName: { contains: search, mode: 'insensitive' },
                  },
                  {
                    documentNumber: { contains: search, mode: 'insensitive' },
                  },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        invoiceData: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info(
      {
        restaurantId: user.restaurantId,
        orderCount: orders.length,
      },
      'Fetched invoice orders for admin'
    );

    return NextResponse.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch invoice orders');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

