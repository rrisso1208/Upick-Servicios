/**
 * GET /api/admin/commission-metrics
 * Get commission metrics for the logged-in restaurant admin
 *
 * ✅ FIX: serviceFeeAmount NO pertenece al restaurante
 * - Se separa:
 *   - totalGrossSales: total cobrado al cliente (incluye fee)
 *   - totalServiceFee: fee de Upick
 *   - totalRestaurantSales: ventas reales del restaurante (sin fee)
 * - Comisión e IVA se calculan SOLO sobre totalRestaurantSales
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

function parseLocalDate(dateStr: string, endOfDay = false) {
  const [y, m, d] = dateStr.split('-').map(Number);

  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
  }

  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get date range from query params
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter - REQUIRED (default to last 30 days if not provided)
    const dateFilter: any = {};
    let fromDate: Date;
    let toDate: Date;

    if (dateFrom) {
      fromDate = parseLocalDate(dateFrom);
      dateFilter.gte = fromDate;
    } else {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    }

    if (dateTo) {
      toDate = parseLocalDate(dateTo, true);
      dateFilter.lte = toDate;
    } else {
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    // Get restaurant info
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        commissionPercentage: true,
        commissionIvaPayer: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    // Get orders - Include all statuses EXCEPT awaiting_payment (como estabas)
    // Luego excluimos cancelled/refunded completamente en cálculos
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          in: ['paid', 'delivered', 'in_progress', 'ready'],
        },
        createdAt: dateFilter,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        serviceFeeAmount: true, // ✅ NECESARIO para separar fee
        platformCommissionAmount: true,
        netAmountForRestaurant: true,
      },
    });

    // Filter out cancelled orders completely (como estabas haciendo)
    const nonCancelledOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded'
    );

    // ✅ Import commission calculator
    const { calculateRestaurantCommission } = await import(
      '../../../../lib/restaurant-commission'
      );

    const currentCommissionPercentage =
      restaurant.commissionPercentage ?? 5.0; // default 5% si null

    /**
     * ✅ Recalcular comisión/neto PERO usando base del restaurante (sin service fee)
     * baseRestaurant = totalAmount - serviceFeeAmount
     *
     * OJO: esto evita que el fee se “cuente como venta del restaurante”.
     */
    for (const order of nonCancelledOrders) {
      try {
        const serviceFee = order.serviceFeeAmount || 0;
        const baseRestaurant = Math.max(0, order.totalAmount - serviceFee);

        const { platformCommissionAmount, netAmountForRestaurant } =
          calculateRestaurantCommission(
            baseRestaurant,
            currentCommissionPercentage,
            restaurant.commissionIvaPayer
          );

        // Solo actualizar en memoria para cálculos
        order.platformCommissionAmount = platformCommissionAmount;
        order.netAmountForRestaurant = netAmountForRestaurant;

      } catch (error) {
        logger.error(
          { error, orderId: order.id },
          'Failed to calculate commission for order in metrics query'
        );
      }
    }
    // ✅ Totales correctos separando fee
    const totalGrossSales = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    const totalServiceFee = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.serviceFeeAmount || 0),
      0
    );

    // ✅ ventas reales del restaurante (sin fee)
    const totalRestaurantSales = Math.max(0, totalGrossSales - totalServiceFee);

    // Comisión (ya recalculada arriba sobre baseRestaurant)
    const totalCommission = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.platformCommissionAmount || 0),
      0
    );

    // IVA (19%) sobre comisión (para reporte)
    const totalIvaOnCommission = Math.round(totalCommission * 0.19);

    // Neto restaurante (ya recalculado sobre baseRestaurant)
    const totalNetForRestaurant = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.netAmountForRestaurant || 0),
      0
    );

    const totalOrders = nonCancelledOrders.length;

    return NextResponse.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          commissionPercentage: String(restaurant.commissionPercentage ?? currentCommissionPercentage),
          commissionIvaPayer: restaurant.commissionIvaPayer,
        },
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        metrics: {
          // ✅ Compatibilidad / claridad
          totalGrossSales,        // total cobrado al cliente (incluye fee)
          totalServiceFee,        // fee de Upick (NO restaurante)
          totalRestaurantSales,   // ventas restaurante (sin fee)

          totalCommission,        // comisión sobre ventas restaurante
          totalIvaOnCommission,   // 19% sobre comisión (reporte)
          totalNetForRestaurant,  // neto real restaurante (sin fee, - comisión, - IVA si aplica)
          totalOrders,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching commission metrics');
    return NextResponse.json(
      { success: false, error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}