/**
 * GET /api/admin/metrics - Get restaurant metrics
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
    const period = searchParams.get('period') || 'today';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date(); // Add end date for "today" filter
    let previousStartDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999); // Include entire day
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    }

    // Get current period orders
    // IMPORTANT: EXCLUDE cancelled and refunded orders completely from all calculations
    // Only include orders that are NOT cancelled, refunded, or awaiting_payment
    // IMPORTANT: Include OrderFinance relation to get commissionAmount
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: startDate,
          ...(period === 'today' ? { lte: endDate } : {}), // For "today", include end of day
        },
        status: {
          notIn: ['awaiting_payment', 'cancelled', 'refunded'],
        },
      },
      select: {
        id: true,
        totalAmount: true,
        serviceFeeAmount: true, // Service fee amount (excluded from restaurant revenue)
        platformCommissionAmount: true, // Keep for backward compatibility
        status: true,
        createdAt: true,
        finance: {
          select: {
            commissionAmount: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      } as any,
    }) as unknown as Array<{
      id: string;
      totalAmount: number;
      serviceFeeAmount: number;
      platformCommissionAmount: number | null;
      status: string;
      createdAt: Date;
      finance: { commissionAmount: number } | null;
      items: Array<{
        quantity: number;
        unitPrice: number;
        product: { id: string; name: string; price: number };
      }>;
    }>;

    // Get previous period orders for comparison
    // IMPORTANT: EXCLUDE cancelled and refunded orders completely from all calculations
    // Only include orders that are NOT cancelled, refunded, or awaiting_payment
    // IMPORTANT: Include OrderFinance relation to get commissionAmount
    const previousOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
        status: {
          notIn: ['awaiting_payment', 'cancelled', 'refunded'],
        },
      },
      select: {
        id: true,
        totalAmount: true,
        serviceFeeAmount: true, // Service fee amount (excluded from restaurant revenue)
        platformCommissionAmount: true, // Keep for backward compatibility
        status: true,
        createdAt: true,
        finance: {
          select: {
            commissionAmount: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      } as any,
    }) as unknown as Array<{
      id: string;
      totalAmount: number;
      serviceFeeAmount: number;
      platformCommissionAmount: number | null;
      status: string;
      createdAt: Date;
      finance: { commissionAmount: number } | null;
      items: Array<{
        quantity: number;
        unitPrice: number;
        product: { id: string; name: string; price: number };
      }>;
    }>;

    // Calculate metrics
    // IMPORTANT: Cancelled/refunded orders are already excluded from the query above
    // All orders in this array are valid (not cancelled, not refunded, not awaiting_payment)
    // IMPORTANT: totalRevenue for restaurant EXCLUDES serviceFeeAmount
    // Service fee is 100% Upi revenue and does not belong to the restaurant
    const totalRevenue = orders.reduce((sum, order) => {
      // Subtract service fee from total amount to get restaurant revenue
      const restaurantRevenue = order.totalAmount - (order.serviceFeeAmount || 0);
      return sum + restaurantRevenue;
    }, 0);
    
    // Use commissionAmount from OrderFinance if available, otherwise fallback to platformCommissionAmount
    const totalCommission = orders.reduce((sum, order) => {
      const commission = order.finance?.commissionAmount || order.platformCommissionAmount || 0;
      return sum + commission;
    }, 0);
    
    const totalOrders = orders.length;
    const averageTicket =
      totalOrders > 0 ? Math.max(0, Math.round(totalRevenue / totalOrders)) : 0;

    // IMPORTANT: Cancelled/refunded orders are already excluded from the query above
    // IMPORTANT: previousRevenue for restaurant EXCLUDES serviceFeeAmount
    const previousRevenue = previousOrders.reduce((sum, order) => {
      // Subtract service fee from total amount to get restaurant revenue
      const restaurantRevenue = order.totalAmount - (order.serviceFeeAmount || 0);
      return sum + restaurantRevenue;
    }, 0);
    
    // Use commissionAmount from OrderFinance if available, otherwise fallback to platformCommissionAmount
    const previousCommission = previousOrders.reduce((sum, order) => {
      const commission = order.finance?.commissionAmount || order.platformCommissionAmount || 0;
      return sum + commission;
    }, 0);
    
    const previousOrdersCount = previousOrders.length;
    const previousAverageTicket =
      previousOrdersCount > 0
        ? Math.max(0, Math.round(previousRevenue / previousOrdersCount))
        : 0;

    // Orders by status
    // IMPORTANT: Cancelled/refunded orders are already excluded from the query above
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((order) => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Top products
    // IMPORTANT: Cancelled/refunded orders are already excluded from the query above
    // All orders in this array are valid, so we can process all of them
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product.id;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.unitPrice * item.quantity;
      });
    });

    // Filter out products with zero or negative quantities/revenue and ensure minimum is 0
    const topProducts = Object.values(productSales)
      .map(product => ({
        ...product,
        quantity: Math.max(0, product.quantity),
        revenue: Math.max(0, product.revenue),
      }))
      .filter(product => product.quantity > 0 && product.revenue > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Orders by hour
    const ordersByHour: Record<number, number> = {};
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    // Peak hours (top 3)
    const peakHours = Object.entries(ordersByHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => `${h.hour}:00`);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalCommission,
        totalOrders,
        averageTicket,
        ordersByStatus,
        topProducts,
        peakHours,
        comparison: {
          revenueChange:
            previousRevenue > 0
              ? Math.round(
                ((totalRevenue - previousRevenue) / previousRevenue) * 100
              )
              : 0,
          commissionChange:
            previousCommission > 0
              ? Math.round(
                ((totalCommission - previousCommission) / previousCommission) * 100
              )
              : 0,
          ordersChange:
            previousOrdersCount > 0
              ? Math.round(
                ((totalOrders - previousOrdersCount) / previousOrdersCount) *
                100
              )
              : 0,
          ticketChange:
            previousAverageTicket > 0
              ? Math.round(
                ((averageTicket - previousAverageTicket) /
                  previousAverageTicket) *
                100
              )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}
