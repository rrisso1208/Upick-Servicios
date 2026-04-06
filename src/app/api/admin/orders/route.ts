/**
 * GET /api/admin/orders - Get restaurant orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom'); // Format: YYYY-MM-DD
    const dateTo = searchParams.get('dateTo'); // Format: YYYY-MM-DD
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const statusList = statusFilter ? statusFilter.split(',') : undefined;

    // Build date filter for pickupSlotStart
    const dateFilter: any = {};
    if (dateFrom) {
      // Interpretar dateFrom como inicio del día en Colombia (UTC-05:00)
      const fromDate = new Date(`${dateFrom}T00:00:00.000-05:00`);
      dateFilter.gte = fromDate;
    }
    if (dateTo) {
      // Interpretar dateTo como fin del día en Colombia (UTC-05:00)
      const toDate = new Date(`${dateTo}T23:59:59.999-05:00`);
      dateFilter.lte = toDate;
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        // CRITICAL: Exclude unpaid orders from restaurant panel
        // Only show orders that have been paid or are in progress
        status: {
          notIn: ['awaiting_payment', 'payment_failed'],
        },
        ...(statusList
          ? {
            status: { in: statusList as any },
          }
          : {}),
        ...(Object.keys(dateFilter).length > 0
          ? {
            pickupSlotStart: dateFilter,
          }
          : {}),
      },
      select: {
        id: true,
        pickupCode: true,
        pickupSlotStart: true,
        pickupSlotEnd: true,
        status: true,
        totalAmount: true,
        discountAmount: true,
        readyAt: true,
        createdAt: true,
        type: true, // Add order type (deprecated)
        serviceMode: true, // Service mode (eat_in, takeaway, internal_delivery)
        deliveryPointId: true,
        deliveryCost: true,
        customerPhone: true,
        needsInvoice: true,
        serviceFeeAmount: true,
        tableId: true,
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryPoint: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
        invoiceData: {
          select: {
            id: true,
            email: true,
            documentNumber: true,
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            notes: true,
            product: {
              select: {
                name: true,
                price: true,
                promotionPrice: true,
              },
            },
            options: {
              select: {
                id: true,
                priceDelta: true,
                productOption: {
                  select: {
                    name: true,
                    group: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(limit ? { take: parseInt(limit) } : {}),
      ...(offset ? { skip: parseInt(offset) } : {}),
    });

    const total = await prisma.order.count({
      where: {
        restaurantId,
        // CRITICAL: Exclude unpaid orders from count
        status: {
          notIn: ['awaiting_payment', 'payment_failed'],
        },
        ...(statusList
          ? {
            status: { in: statusList as any },
          }
          : {}),
        ...(Object.keys(dateFilter).length > 0
          ? {
            pickupSlotStart: dateFilter,
          }
          : {}),
      },
    });

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
