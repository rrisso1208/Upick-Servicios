/**
 * API: Get real-time superadmin dashboard stats with date filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    let user = await getAuthUser();
    if (!user) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        user = await getAuthUserFromHeader(authHeader);
      }
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom'); // Format: YYYY-MM-DD
    const dateTo = searchParams.get('dateTo'); // Format: YYYY-MM-DD

    // Build date filter for createdAt
    const dateFilter: any = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    // Count places (always total, not filtered by date)
    const universities = await prisma.place.count({
      where: { isActive: true },
    });

    // Count restaurants (always total, not filtered by date)
    const restaurants = await prisma.restaurant.count({
      where: { isActive: true },
    });

    // Count total orders (paid or completed) with date filter
    const totalOrders = await prisma.order.count({
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        ...(Object.keys(dateFilter).length > 0
          ? {
            createdAt: dateFilter,
          }
          : {}),
      },
    });

    // Get total revenue and commission directly from Order
    // Calculate commission if not already stored, using restaurant commissionPercentage
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        ...(Object.keys(dateFilter).length > 0
          ? {
            createdAt: dateFilter,
          }
          : {}),
      },
      select: {
        id: true,
        totalAmount: true,
        serviceFeeAmount: true, // Service fee amount (100% Upi revenue)
        platformCommissionAmount: true,
        restaurant: {
          select: {
            commissionPercentage: true,
          },
        },
      } as any,
    }) as unknown as Array<{
      id: string;
      totalAmount: number;
      serviceFeeAmount: number;
      platformCommissionAmount: number | null;
      restaurant: {
        commissionPercentage: number | null;
      };
    }>;

    // Calculate service fee revenue (100% Upi revenue, not included in restaurant revenue)
    const totalServiceFeeRevenue = orders.reduce(
      (sum, order) => sum + (order.serviceFeeAmount || 0),
      0
    );

    // Total revenue EXCLUDES service fee (service fee is separate Upi revenue)
    const totalRevenue = orders.reduce(
      (sum, order) => {
        // Subtract service fee from total to get restaurant revenue only
        const restaurantRevenue = order.totalAmount - (order.serviceFeeAmount || 0);
        return sum + restaurantRevenue;
      },
      0
    );

    // Calculate commission: use stored value or calculate on the fly
    const totalCommission = orders.reduce((sum, order) => {
      if (
        order.platformCommissionAmount !== null &&
        order.platformCommissionAmount > 0
      ) {
        return sum + order.platformCommissionAmount;
      }
      // Calculate commission if not stored (for older orders)
      // Use default 5% if commissionPercentage is null or 0
      const commissionPercentage = order.restaurant.commissionPercentage;
      const commissionRate =
        commissionPercentage && commissionPercentage > 0
          ? commissionPercentage / 100
          : 0.05; // Default 5%
      const commissionAmount = Math.round(order.totalAmount * commissionRate);
      return sum + commissionAmount;
    }, 0);

    // Get comparison period stats (previous period of same length)
    let comparisonStats = null;
    let comparisonServiceFeeRevenue = 0; // Initialize outside if block
    if (
      Object.keys(dateFilter).length > 0 &&
      dateFilter.gte &&
      dateFilter.lte
    ) {
      const periodStart = new Date(dateFilter.gte);
      const periodEnd = new Date(dateFilter.lte);
      const periodLength = periodEnd.getTime() - periodStart.getTime();

      const comparisonStart = new Date(periodStart);
      comparisonStart.setTime(comparisonStart.getTime() - periodLength - 1);
      const comparisonEnd = new Date(periodStart);
      comparisonEnd.setTime(comparisonEnd.getTime() - 1);

      const comparisonOrdersCount = await prisma.order.count({
        where: {
          status: {
            in: ['paid', 'in_progress', 'ready', 'delivered'],
          },
          createdAt: {
            gte: comparisonStart,
            lte: comparisonEnd,
          },
        },
      });

      const comparisonOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['paid', 'in_progress', 'ready', 'delivered'],
          },
          createdAt: {
            gte: comparisonStart,
            lte: comparisonEnd,
          },
        },
        select: {
          id: true,
          totalAmount: true,
          serviceFeeAmount: true, // Service fee amount (100% Upi revenue)
          platformCommissionAmount: true,
          restaurant: {
            select: {
              commissionPercentage: true,
            },
          },
        } as any,
      }) as unknown as Array<{
        id: string;
        totalAmount: number;
        serviceFeeAmount: number;
        platformCommissionAmount: number | null;
        restaurant: {
          commissionPercentage: number | null;
        };
      }>;

      comparisonServiceFeeRevenue = comparisonOrders.reduce(
        (sum, order) => sum + (order.serviceFeeAmount || 0),
        0
      );

      // Comparison revenue EXCLUDES service fee
      const comparisonRevenue = comparisonOrders.reduce(
        (sum, order) => {
          // Subtract service fee from total to get restaurant revenue only
          const restaurantRevenue = order.totalAmount - (order.serviceFeeAmount || 0);
          return sum + restaurantRevenue;
        },
        0
      );
      const comparisonCommission = comparisonOrders.reduce((sum, order) => {
        if (
          order.platformCommissionAmount !== null &&
          order.platformCommissionAmount > 0
        ) {
          return sum + order.platformCommissionAmount;
        }
        // Calculate commission if not stored
        const commissionPercentage = order.restaurant.commissionPercentage;
        const commissionRate =
          commissionPercentage && commissionPercentage > 0
            ? commissionPercentage / 100
            : 0.05; // Default 5%
        const commissionAmount = Math.round(order.totalAmount * commissionRate);
        return sum + commissionAmount;
      }, 0);

      comparisonStats = {
        totalOrders: comparisonOrdersCount,
        totalRevenue: comparisonRevenue,
        totalCommission: comparisonCommission,
        ordersGrowth:
          comparisonOrdersCount > 0
            ? ((totalOrders - comparisonOrdersCount) / comparisonOrdersCount) *
            100
            : totalOrders > 0
              ? 100
              : 0,
        revenueGrowth:
          comparisonRevenue > 0
            ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
            : totalRevenue > 0
              ? 100
              : 0,
        commissionGrowth:
          comparisonCommission > 0
            ? ((totalCommission - comparisonCommission) /
              comparisonCommission) *
            100
            : totalCommission > 0
              ? 100
              : 0,
      };
    }

    // Get recent orders (last 10)
    const recentOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
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
        restaurant: {
          select: {
            name: true,
          },
        },
        place: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Get top 5 restaurants by revenue directly from Order
    const restaurantOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        ...(Object.keys(dateFilter).length > 0
          ? {
            createdAt: dateFilter,
          }
          : {}),
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by restaurant and sum revenue
    const restaurantRevenueMap = new Map<
      string,
      { name: string; revenue: number }
    >();
    restaurantOrders.forEach((order) => {
      const existing = restaurantRevenueMap.get(order.restaurantId);
      if (existing) {
        existing.revenue += order.totalAmount || 0;
      } else {
        restaurantRevenueMap.set(order.restaurantId, {
          name: order.restaurant.name,
          revenue: order.totalAmount || 0,
        });
      }
    });

    const top5Restaurants = Array.from(restaurantRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Get top 5 universities by order count
    const topUniversities = await prisma.order.groupBy({
      by: ['placeId'],
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
        ...(Object.keys(dateFilter).length > 0
          ? {
            createdAt: dateFilter,
          }
          : {}),
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const top5Universities = await Promise.all(
      topUniversities.map(async (item) => {
        const place = await prisma.place.findUnique({
          where: { id: item.placeId },
          select: {
            name: true,
          },
        });
        return {
          name: place?.name || 'Desconocida',
          orderCount: item._count.id,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        universities,
        restaurants,
        totalOrders,
        totalRevenue,
        totalServiceFeeRevenue, // Revenue from service fees (100% Upi)
        totalCommission,
        comparisonStats: comparisonStats ? {
          ...comparisonStats,
          totalServiceFeeRevenue: comparisonServiceFeeRevenue, // Add service fee to comparison
        } : null,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          pickupCode: order.pickupCode,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          student: order.student,
          restaurant: order.restaurant,
          university: order.place,
        })),
        topRestaurants: top5Restaurants,
        topUniversities: top5Universities,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estadísticas',
      },
      { status: 500 }
    );
  }
}
