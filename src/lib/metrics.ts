/**
 * Metrics and Analytics Queries
 * Optimized SQL queries for restaurant and global metrics
 */

import { prisma } from './db';
import { Prisma } from '@prisma/client';

export interface RestaurantMetrics {
  totalOrders: number;
  totalSales: number;
  totalTax: number;
  totalTips: number;
  totalCommission: number;
  totalGatewayFees: number;
  netRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByHour: Array<{ hour: number; count: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Get comprehensive metrics for a restaurant
 */
export async function getRestaurantMetrics(
  restaurantId: string,
  dateRange: DateRange
): Promise<RestaurantMetrics> {
  // Main financial metrics
  const financialMetrics = await prisma.orderFinance.aggregate({
    where: {
      order: {
        restaurantId,
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    },
    _sum: {
      baseAmount: true,
      taxAmount: true,
      tipAmount: true,
      commissionAmount: true,
      gatewayFeeAmount: true,
      netForRestaurant: true,
    },
    _count: true,
  });

  const totalOrders = financialMetrics._count || 0;
  const totalSales = financialMetrics._sum.baseAmount || 0;
  const totalTax = financialMetrics._sum.taxAmount || 0;
  const totalTips = financialMetrics._sum.tipAmount || 0;
  const totalCommission = financialMetrics._sum.commissionAmount || 0;
  const totalGatewayFees = financialMetrics._sum.gatewayFeeAmount || 0;
  const netRevenue = financialMetrics._sum.netForRestaurant || 0;

  const avgOrderValue =
    totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  // Orders by status
  // IMPORTANT: Exclude cancelled/refunded orders from status counts
  const ordersByStatusRaw = await prisma.order.groupBy({
    by: ['status'],
    where: {
      restaurantId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
      status: {
        notIn: ['cancelled', 'refunded'],
      },
    },
    _count: true,
  });

  const ordersByStatus: Record<string, number> = {};
  ordersByStatusRaw.forEach((item) => {
    ordersByStatus[item.status] = item._count;
  });

  // Orders by hour of day
  // IMPORTANT: Exclude cancelled/refunded orders from hour analysis
  const ordersRaw = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
      status: {
        notIn: ['cancelled', 'refunded'],
      },
    },
    select: {
      createdAt: true,
    },
  });

  const ordersByHour: Array<{ hour: number; count: number }> = [];
  const hourCounts: Record<number, number> = {};

  ordersRaw.forEach((order) => {
    const hour = order.createdAt.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  for (let hour = 0; hour < 24; hour++) {
    ordersByHour.push({
      hour,
      count: hourCounts[hour] || 0,
    });
  }

  // Top products
  const topProductsRaw = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        restaurantId,
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    },
    _sum: {
      quantity: true,
      unitPrice: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 10,
  });

  const topProducts = await Promise.all(
    topProductsRaw.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true },
      });

      return {
        productId: item.productId,
        productName: product?.name || 'Producto eliminado',
        quantity: item._sum.quantity || 0,
        revenue: (item._sum.unitPrice || 0) * (item._sum.quantity || 0),
      };
    })
  );

  return {
    totalOrders,
    totalSales,
    totalTax,
    totalTips,
    totalCommission,
    totalGatewayFees,
    netRevenue,
    avgOrderValue,
    ordersByStatus,
    ordersByHour,
    topProducts,
  };
}

/**
 * Get metrics for superadmin (global or by university/restaurant)
 */
export async function getGlobalMetrics(
  dateRange: DateRange,
  filters?: {
    universityId?: string;
    restaurantId?: string;
  }
): Promise<{
  totalRevenue: number;
  totalCommission: number;
  totalOrders: number;
  totalRestaurants: number;
  revenueByRestaurant: Array<{
    restaurantId: string;
    restaurantName: string;
    revenue: number;
    commission: number;
    orders: number;
  }>;
}> {
  const where: Prisma.OrderWhereInput = {
    status: {
      in: ['paid', 'in_progress', 'ready', 'delivered'],
    },
    createdAt: {
      gte: dateRange.from,
      lte: dateRange.to,
    },
  };

  if (filters?.universityId) {
    where.placeId = filters.universityId;
  }

  if (filters?.restaurantId) {
    where.restaurantId = filters.restaurantId;
  }

  // Global totals
  const totals = await prisma.orderFinance.aggregate({
    where: {
      order: where,
    },
    _sum: {
      baseAmount: true,
      taxAmount: true,
      commissionAmount: true,
    },
    _count: true,
  });

  const totalRevenue =
    (totals._sum.baseAmount || 0) + (totals._sum.taxAmount || 0);
  const totalCommission = totals._sum.commissionAmount || 0;
  const totalOrders = totals._count || 0;

  // Revenue by restaurant
  const revenueByRestaurantRaw = await prisma.order.groupBy({
    by: ['restaurantId'],
    where,
    _count: true,
  });

  const revenueByRestaurant = await Promise.all(
    revenueByRestaurantRaw.map(async (item) => {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: item.restaurantId },
        select: { name: true },
      });

      const finance = await prisma.orderFinance.aggregate({
        where: {
          order: {
            restaurantId: item.restaurantId,
            ...where,
          },
        },
        _sum: {
          baseAmount: true,
          taxAmount: true,
          commissionAmount: true,
        },
      });

      return {
        restaurantId: item.restaurantId,
        restaurantName: restaurant?.name || 'Unknown',
        revenue: (finance._sum.baseAmount || 0) + (finance._sum.taxAmount || 0),
        commission: finance._sum.commissionAmount || 0,
        orders: item._count,
      };
    })
  );

  const totalRestaurants = revenueByRestaurant.length;

  return {
    totalRevenue,
    totalCommission,
    totalOrders,
    totalRestaurants,
    revenueByRestaurant,
  };
}

/**
 * Export data for CSV/Excel
 */
export async function getOrderDetailsForExport(
  restaurantId: string,
  dateRange: DateRange
) {
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
      status: {
        in: ['paid', 'in_progress', 'ready', 'delivered', 'cancelled'],
      },
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      finance: true,
      payment: {
        select: {
          method: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders.map((order) => ({
    orderId: order.id,
    fecha: order.createdAt.toISOString(),
    codigo: order.pickupCode,
    cliente:
      `${order.student.firstName || ''} ${order.student.lastName || ''}`.trim() ||
      order.student.email,
    email: order.student.email,
    productos: order.items
      .map((item) => `${item.quantity}x ${item.product.name}`)
      .join(', '),
    subtotal: order.finance?.baseAmount || 0,
    iva: order.finance?.taxAmount || 0,
    propina: order.finance?.tipAmount || 0,
    descuento: order.finance?.discountAmount || 0,
    total: order.totalAmount,
    comisionPorcentaje: order.finance?.commissionRateApplied.toString() || '0',
    comisionMonto: order.finance?.commissionAmount || 0,
    feePasarela: order.finance?.gatewayFeeAmount || 0,
    netoRestaurante: order.finance?.netForRestaurant || 0,
    metodoPago: order.payment?.method || 'N/A',
    estadoPago: order.payment?.status || 'N/A',
    estadoPedido: order.status,
    horaRecogida: order.pickupSlotStart.toISOString(),
  }));
}
