/**
 * GET /api/superadmin/orders - Get all orders with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const restaurantId = searchParams.get('restaurantId');
    const placeId = searchParams.get('placeId'); // University/Place ID
    const dateFrom = searchParams.get('dateFrom'); // Format: YYYY-MM-DD
    const dateTo = searchParams.get('dateTo'); // Format: YYYY-MM-DD
    const search = searchParams.get('search'); // Search by pickupCode or email
    const minAmount = searchParams.get('minAmount'); // Minimum amount in cents
    const maxAmount = searchParams.get('maxAmount'); // Maximum amount in cents
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const statusList = statusFilter ? statusFilter.split(',') : undefined;

    // Build where clause
    const where: any = {
      // Exclude unpaid orders
      status: {
        notIn: ['awaiting_payment', 'payment_failed'],
      },
    };

    if (statusList) {
      where.status = { in: statusList };
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (placeId) {
      where.placeId = placeId;
    }

    // Date filter for createdAt
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Amount filter
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) {
        where.totalAmount.gte = parseInt(minAmount);
      }
      if (maxAmount) {
        where.totalAmount.lte = parseInt(maxAmount);
      }
    }

    // Search filter (by pickupCode or student email)
    if (search) {
      where.OR = [
        { pickupCode: { contains: search, mode: 'insensitive' } },
        {
          student: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            method: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(limit ? { take: parseInt(limit) } : {}),
      ...(offset ? { skip: parseInt(offset) } : {}),
    });

    const total = await prisma.order.count({ where });

    return NextResponse.json({
      success: true,
      data: { orders, total },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener pedidos' },
      { status: 500 }
    );
  }
}
