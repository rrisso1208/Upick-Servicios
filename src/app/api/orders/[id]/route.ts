/**
 * GET /api/orders/:id - Get order details
 * DELETE /api/orders/:id - Delete order (only for awaiting_payment status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser } from '../../../../lib/auth';
import logger from '../../../../lib/logger';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        items: {
          include: {
            product: true,
            options: {
              include: {
                productOption: true,
              },
            },
          },
        },
        restaurant: true,
        place: true,
        payment: true,
        finance: true,
      },
      // Ensure pickupSlotStart is included (it's always in the model, but explicit is better)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization check
    if (user.role === 'student' && order.studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (
      user.role === 'restaurant_admin' &&
      order.restaurantId !== user.restaurantId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let orderId: string | undefined;
  try {
    const { id } = await params;
    orderId = id;

    // Try to get user from Authorization header first, then fallback to cookies
    let user = null;
    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
      const { getAuthUserFromHeader } = await import('../../../../lib/auth');
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth if header auth failed
    if (!user) {
      user = await getAuthUser();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Only students can delete their own orders
    if (user.role !== 'student') {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo los estudiantes pueden eliminar sus pedidos',
        },
        { status: 403 }
      );
    }

    // Get order to verify ownership and status
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.studentId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para eliminar este pedido',
        },
        { status: 403 }
      );
    }

    // Only allow deletion of orders with status "awaiting_payment"
    if (order.status !== 'awaiting_payment') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Solo se pueden eliminar pedidos en estado "Pendiente de pago"',
        },
        { status: 400 }
      );
    }

    // Delete order and related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete order items (cascade should handle this, but being explicit)
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      // Delete payment if exists
      if (order.payment) {
        await tx.payment.delete({
          where: { id: order.payment.id },
        });
      }

      // Delete order
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    logger.info(
      { orderId: orderId, userId: user.id },
      'Order deleted by student (awaiting_payment)'
    );

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado exitosamente',
    });
  } catch (error: any) {
    logger.error(
      { error: error?.message || String(error), orderId: orderId },
      'Error deleting order'
    );
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el pedido' },
      { status: 500 }
    );
  }
}
