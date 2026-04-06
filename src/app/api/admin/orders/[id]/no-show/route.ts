/**
 * POST /api/admin/orders/:id/no-show
 * Mark order as no-show (customer didn't pick up)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import logger from '../../../../../../lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get order
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Verify order is in ready status
    if (order.status !== 'ready') {
      return NextResponse.json(
        {
          success: false,
          error: `Solo se pueden marcar como "no se presentó" pedidos que están en estado "listo". Estado actual: ${order.status}`,
        },
        { status: 400 }
      );
    }

    // Verify at least 20 minutes have passed since readyAt
    if (!order.readyAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede determinar cuándo fue marcado como listo',
        },
        { status: 400 }
      );
    }

    const readyAt = new Date(order.readyAt);
    const now = new Date();
    const minutesSinceReady = (now.getTime() - readyAt.getTime()) / (1000 * 60);

    if (minutesSinceReady < 20) {
      return NextResponse.json(
        {
          success: false,
          error: `Deben pasar al menos 20 minutos desde que el pedido fue marcado como listo. Tiempo transcurrido: ${Math.floor(minutesSinceReady)} minutos`,
        },
        { status: 400 }
      );
    }

    // Mark as cancelled with a note (or we could create a new status, but cancelled works)
    // We'll add a note to indicate it was a no-show
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: order.notes
          ? `${order.notes}\n[Marcado como no se presentó el ${now.toLocaleString('es-CO')}]`
          : `[Marcado como no se presentó el ${now.toLocaleString('es-CO')}]`,
      },
    });

    logger.info(
      {
        orderId: id,
        restaurantId,
        readyAt: order.readyAt,
        minutesSinceReady: Math.floor(minutesSinceReady),
      },
      'Order marked as no-show'
    );

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Pedido marcado como "no se presentó"',
    });
  } catch (error) {
    logger.error(
      { error, orderId: (await params).id },
      'Error marking order as no-show'
    );
    return NextResponse.json(
      { success: false, error: 'Error al marcar pedido como no se presentó' },
      { status: 500 }
    );
  }
}
