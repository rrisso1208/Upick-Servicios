/**
 * POST /api/admin/orders/validate
 * Validate pickup code and get order details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { pickupCode } = body;

    if (!pickupCode || pickupCode.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Código inválido (debe ser 6 caracteres)' },
        { status: 400 }
      );
    }

    // Find order by pickup code and verify it belongs to admin's restaurant
    const order = await prisma.order.findFirst({
      where: {
        pickupCode: pickupCode.toUpperCase(),
        restaurantId,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        cancellation: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Código de recogida inválido' },
        { status: 404 }
      );
    }

    // Check if order is cancelled
    if (order.status === 'cancelled' || order.cancellation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido cancelado',
        },
        { status: 400 }
      );
    }

    // Check if order is ready (only ready orders can be delivered)
    if (order.status !== 'ready') {
      return NextResponse.json(
        {
          success: false,
          error: `Solo se pueden entregar pedidos que están en estado "listo". Estado actual: ${order.status}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error validating pickup code:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
