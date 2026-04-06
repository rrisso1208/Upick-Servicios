/**
 * GET /api/admin/crm - Get CRM data for restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user;

    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'restaurant_admin' || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // ✅ Only count orders in these statuses
    const VALID_STATUSES = ['paid', 'delivered', 'ready', 'in_progress'];

    // Get all orders for this restaurant with customer and invoice data
    const where: any = {
      restaurantId: user.restaurantId,
      status: {
        in: VALID_STATUSES,
      },
    };

    if (search) {
      where.OR = [
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        {
          invoiceData: {
            businessName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          invoiceData: {
            documentNumber: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              invoiceData: true, // Include user's saved invoice data
            },
          },
          invoiceData: true, // Include order-specific invoice data
          items: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          payment: {
            select: {
              status: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Group by customer (student)
    const customerMap = new Map<
      string,
      {
        userId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phoneNumber: string | null;
        invoiceData: any;
        orders: any[];
        totalSpent: number;
        orderCount: number;
        lastOrderDate: Date | null;
      }
    >();

    orders.forEach((order) => {
      const userId = order.studentId;
      if (!customerMap.has(userId)) {
        // Prefer order-specific invoice data, fallback to user's saved invoice data
        const invoiceData = order.invoiceData || order.student.invoiceData;

        customerMap.set(userId, {
          userId,
          email: order.student.email,
          firstName: order.student.firstName,
          lastName: order.student.lastName,
          phoneNumber: order.student.phoneNumber,
          invoiceData: invoiceData,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: null,
        });
      }

      const customer = customerMap.get(userId)!;

      customer.orders.push(order);

      // ✅ Total gastado SIN fee (y opcionalmente sin delivery)
      const serviceFee = Number((order as any).serviceFeeAmount ?? 0);
      const deliveryFee = Number((order as any).deliveryFeeAmount ?? 0);

      // Quita fee + delivery (si lo quieres así):
      const net =
        Number((order as any).totalAmount ?? 0) - serviceFee - deliveryFee;

      customer.totalSpent += Math.max(0, net);
      customer.orderCount += 1;

      // ✅ Keep previous date so we can compare for "most recent invoice data"
      const prevLastOrderDate = customer.lastOrderDate;

      if (!customer.lastOrderDate || order.createdAt > customer.lastOrderDate) {
        customer.lastOrderDate = order.createdAt;
      }

      // ✅ Update invoice data if this order is newer than the invoice we have
      if (
        order.invoiceData &&
        (!prevLastOrderDate || order.createdAt > prevLastOrderDate)
      ) {
        customer.invoiceData = order.invoiceData;
      }
    });

    const customers = Array.from(customerMap.values());

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching CRM data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos del CRM',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
