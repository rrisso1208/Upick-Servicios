/**
 * GET /api/superadmin/restaurants/[id]/commission-metrics
 * Get commission metrics for a specific restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import logger from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

function parseLocalDate(dateStr: string, endOfDay = false) {
  const [y, m, d] = dateStr.split('-').map(Number);

  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
  }

  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Try getting user from header first, then from cookies
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get date range from query params
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
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

    // Get metrics for orders - Include all statuses EXCEPT awaiting_payment
    // For cancelled orders, we'll subtract their values
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: id,
        status: {
          in: ['paid', 'delivered', 'in_progress', 'ready'],
        },
        createdAt: dateFilter,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        serviceFeeAmount: true,
        platformCommissionAmount: true,
        netAmountForRestaurant: true,
      },
    });

    // Recalculate commission for all non-cancelled orders using the restaurant's current commission percentage
    // This ensures that if the commission percentage was changed, all orders use the correct percentage
    const { calculateRestaurantCommission } = await import(
      '../../../../../../lib/restaurant-commission'
    );

    // Filter out cancelled orders completely (como estabas haciendo)
    const nonCancelledOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded'
    );

    // Get the restaurant's current commission percentage
    const currentCommissionPercentage = restaurant.commissionPercentage || 5.0; // Default 5% if null

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

        // Solo actualizar en memoria
        order.platformCommissionAmount = platformCommissionAmount;
        order.netAmountForRestaurant = netAmountForRestaurant;

      } catch (error) {
        logger.error(
          { error, orderId: order.id },
          'Failed to calculate commission for order in metrics query'
        );
      }
    }

    // Calculate totals
    // Formula:
    // 1. Ventas Brutas = totalAmount (SOLO pedidos NO cancelados)
    // 2. Comisión de la Plataforma = platformCommissionAmount (SOLO sobre pedidos NO cancelados)
    // 3. IVA sobre la Comisión = Comisión de la Plataforma * 0.19
    // 4. Total a Transferir = Ventas Brutas - Comisión - IVA
    // IMPORTANTE: Los pedidos cancelados se EXCLUYEN completamente de todos los cálculos
    // Note: totalAmount includes the full order value, regardless of payment method
    // (credits, Wompi, or combination). This ensures accurate revenue tracking.
    
    // Filter out cancelled orders completely


    const totalGrossSales = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    const totalServiceFee = nonCancelledOrders.reduce(
      (sum, o) => sum + (o.serviceFeeAmount || 0),
      0
    );

    const totalRestaurantSales = Math.max(0, totalGrossSales - totalServiceFee);

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
