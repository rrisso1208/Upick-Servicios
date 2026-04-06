/**
 * POST /api/admin/orders/:id/status - Change order status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import { sendOrderReadyWhatsApp } from '../../../../../../lib/notifications/whatsapp';
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
    const body = await req.json();
    const { status } = body;

    // Get order with student and restaurant info before updating
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId,
      },
      include: {
        student: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });


    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Prevent marking as ready too early (only allow 10 minutes before pickup)
    if (status === 'ready') {
      if (!order.pickupSlotStart) {
        return NextResponse.json(
          { success: false, error: 'El pedido no tiene hora de entrega definida' },
          { status: 400 }
        );
      }

      const pickupTime = new Date(order.pickupSlotStart);
      const now = new Date();

      const diffMinutes =
        (pickupTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMinutes > 10) {
        return NextResponse.json(
          {
            success: false,
            error: `Este pedido solo se puede marcar como listo 10 minutos antes de la entrega`,
          },
          { status: 400 }
        );
      }
    }

    // Store old status before updating
    const oldStatus = order.status;

    // Update order status
    // If marking as ready, also set readyAt timestamp
    const updateData: any = { status };
    if (status === 'ready' && oldStatus !== 'ready') {
      updateData.readyAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Send WhatsApp notification if order is now ready (status changed to ready)
    if (status === 'ready' && oldStatus !== 'ready') {
      try {
        if (order.student.phoneNumber) {
          await sendOrderReadyWhatsApp(
            order.student.phoneNumber,
            order.restaurant.name,
            order.restaurant.location
          );
          logger.info(
            {
              orderId: order.id,
              phoneNumber: order.student.phoneNumber,
            },
            'WhatsApp notification sent: Order ready'
          );
        } else {
          logger.warn(
            {
              orderId: order.id,
              studentEmail: order.student.email,
            },
            'Cannot send WhatsApp notification: Student has no phone number'
          );
        }
      } catch (error) {
        // Don't fail the status update if notification fails
        logger.error(
          {
            error,
            orderId: order.id,
            phoneNumber: order.student.phoneNumber,
          },
          'Failed to send WhatsApp notification for ready order'
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    logger.error(
      { error, orderId: (await params).id },
      'Error updating order status'
    );
    return NextResponse.json(
      { success: false, error: 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}
