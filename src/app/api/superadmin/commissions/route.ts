/**
 * GET /api/superadmin/commissions - Get consolidated commission data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom'); // Format: YYYY-MM-DD
    const dateTo = searchParams.get('dateTo'); // Format: YYYY-MM-DD
    const restaurantId = searchParams.get('restaurantId');
    const placeId = searchParams.get('placeId');

    // Build date filter - REQUIRED (default to last 30 days if not provided)
    const dateFilter: any = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    } else {
      // Default to last 30 days
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    } else {
      // Default to today
      const toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    // Build where clause for orders
    // Include all statuses EXCEPT awaiting_payment
    // For cancelled orders, we'll subtract their values
    const orderWhere: any = {
      status: {
        not: 'awaiting_payment',
      },
      createdAt: dateFilter,
    };

    if (restaurantId) {
      orderWhere.restaurantId = restaurantId;
    }

    if (placeId) {
      orderWhere.placeId = placeId;
    }

    // Get all orders directly (use Order fields instead of OrderFinance)
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            commissionPercentage: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate totals using Order fields
    // Formula:
    // 1. Ventas Brutas = totalAmount
    // 2. Comisión de la Plataforma = totalAmount * (commissionPercentage / 100)
    // 3. IVA sobre la Comisión = Comisión de la Plataforma * 0.19
    // 4. Total a Transferir = Ventas Brutas - Comisión - IVA
    let totalCommission = 0;
    let totalIvaOnCommission = 0;
    let totalRevenue = 0;
    const commissionsByRestaurant = new Map<
      string,
      {
        name: string;
        commissionPercentage: number;
        commission: number;
        ivaOnCommission: number;
        revenue: number;
        orderCount: number;
      }
    >();
    const commissionsByPlace = new Map<
      string,
      {
        name: string;
        commission: number;
        ivaOnCommission: number;
        revenue: number;
        orderCount: number;
      }
    >();

    // Import commission calculation function
    const { calculateRestaurantCommission } = await import(
      '../../../../lib/restaurant-commission'
    );

    // IMPORTANTE: Los pedidos cancelados se EXCLUYEN completamente de todos los cálculos
    // Solo procesamos pedidos NO cancelados para ventas brutas, comisiones, etc.
    orders.forEach((order) => {
      const isCancelled =
        order.status === 'cancelled' || order.status === 'refunded';

      // Skip cancelled orders completely - they are not included in any calculations
      if (isCancelled) {
        return;
      }

      // Always recalculate commission using the restaurant's current commission percentage
      // This ensures consistency even if the percentage was changed after orders were created
      // Get the restaurant's current commission percentage
      const commissionPercentage = order.restaurant.commissionPercentage || 5.0; // Default 5% if null

      // Calculate commission using the standardized function
      const commissionResult = calculateRestaurantCommission(
        order.totalAmount,
        commissionPercentage
      );

      const commission = commissionResult.platformCommissionAmount;
      const ivaOnCommission = commissionResult.ivaOnCommission;

      // Update the order in database if commission was not previously calculated or differs
      // This ensures future queries use the correct commission
      if (
        order.platformCommissionAmount === null ||
        order.platformCommissionAmount !== commission ||
        order.netAmountForRestaurant === null ||
        order.netAmountForRestaurant !== commissionResult.netAmountForRestaurant
      ) {
        // Update asynchronously (don't await to avoid blocking)
        prisma.order
          .update({
            where: { id: order.id },
            data: {
              platformCommissionAmount: commission,
              netAmountForRestaurant: commissionResult.netAmountForRestaurant,
            },
          })
          .catch((error) => {
            console.error(
              `Failed to update commission for order ${order.id}:`,
              error
            );
          });
      }

      // Use totalAmount from Order (only for non-cancelled orders)
      const revenue = order.totalAmount || 0;

      totalCommission += commission;
      totalIvaOnCommission += ivaOnCommission;
      totalRevenue += revenue;

      // By restaurant (only non-cancelled orders)
      if (order.restaurant) {
        const existing = commissionsByRestaurant.get(order.restaurant.id);
        const restaurantCommissionPercentage = Number(
          order.restaurant.commissionPercentage || 5.0
        );
        if (existing) {
          existing.commission += commission;
          existing.ivaOnCommission += ivaOnCommission;
          existing.revenue += revenue;
          // Update commission percentage if it changed (shouldn't happen, but ensure consistency)
          existing.commissionPercentage = restaurantCommissionPercentage;
          existing.orderCount += 1;
        } else {
          commissionsByRestaurant.set(order.restaurant.id, {
            name: order.restaurant.name,
            commissionPercentage: restaurantCommissionPercentage,
            commission,
            ivaOnCommission,
            revenue,
            orderCount: 1,
          });
        }
      }

      // By place/university (only non-cancelled orders)
      if (order.place) {
        const existing = commissionsByPlace.get(order.place.id);
        if (existing) {
          existing.commission += commission;
          existing.ivaOnCommission += ivaOnCommission;
          existing.revenue += revenue;
          existing.orderCount += 1;
        } else {
          commissionsByPlace.set(order.place.id, {
            name: order.place.name,
            commission,
            ivaOnCommission,
            revenue,
            orderCount: 1,
          });
        }
      }
    });

    // Convert maps to arrays and sort
    // Ensure commissionPercentage is always a number
    const topRestaurants = Array.from(commissionsByRestaurant.values())
      .map((r) => ({
        ...r,
        commissionPercentage:
          r.commissionPercentage != null ? Number(r.commissionPercentage) : 5.0,
      }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 10);

    const topPlaces = Array.from(commissionsByPlace.values()).sort(
      (a, b) => b.commission - a.commission
    );

    // Get comparison period stats
    let comparisonStats = null;
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

      const comparisonOrderWhere = {
        ...orderWhere,
        status: {
          not: 'awaiting_payment',
        },
        createdAt: {
          gte: comparisonStart,
          lte: comparisonEnd,
        },
      };

      const comparisonOrders = await prisma.order.findMany({
        where: comparisonOrderWhere,
        include: {
          restaurant: {
            select: {
              commissionPercentage: true,
            },
          },
        },
      });

      // Import commission calculation function for comparison period
      const { calculateRestaurantCommission: calcCommission } = await import(
        '../../../../lib/restaurant-commission'
      );

      // Filter out cancelled orders for comparison period
      const nonCancelledComparisonOrders = comparisonOrders.filter(
        (o) => o.status !== 'cancelled' && o.status !== 'refunded'
      );

      const comparisonCommission = nonCancelledComparisonOrders.reduce(
        (sum, order) => {
          // Use restaurant's commission percentage (consistent with main calculation)
          const commissionPercentage =
            order.restaurant.commissionPercentage || 5.0; // Default 5% if null
          const commissionResult = calcCommission(
            order.totalAmount,
            commissionPercentage
          );
          return sum + commissionResult.platformCommissionAmount;
        },
        0
      );

      // Calculate IVA on comparison commission (19%)
      const comparisonIvaOnCommission = Math.round(comparisonCommission * 0.19);

      const comparisonRevenue = nonCancelledComparisonOrders.reduce(
        (sum, order) => {
          return sum + (order.totalAmount || 0);
        },
        0
      );

      comparisonStats = {
        totalCommission: comparisonCommission,
        totalIvaOnCommission: comparisonIvaOnCommission,
        totalRevenue: comparisonRevenue,
        commissionGrowth:
          comparisonCommission > 0
            ? ((totalCommission - comparisonCommission) /
                comparisonCommission) *
              100
            : totalCommission > 0
              ? 100
              : 0,
        revenueGrowth:
          comparisonRevenue > 0
            ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
            : totalRevenue > 0
              ? 100
              : 0,
      };
    }

    // Calculate total net for restaurants (revenue - commission - IVA)
    const totalNetForRestaurants =
      totalRevenue - totalCommission - totalIvaOnCommission;

    return NextResponse.json({
      success: true,
      data: {
        totalCommission,
        totalIvaOnCommission,
        totalRevenue,
        totalNetForRestaurants,
        totalOrders: orders.length,
        topRestaurants,
        topPlaces,
        comparisonStats,
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener comisiones' },
      { status: 500 }
    );
  }
}
