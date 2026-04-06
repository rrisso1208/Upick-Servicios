/**
 * POST /api/admin/orders/validate-qr
 * Validate QR code and return order info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';
import { prisma } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { qrData?: unknown } | null = null;
  try {
    // Verify user is restaurant admin
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No autorizado. Solo administradores de restaurante pueden escanear códigos QR.',
        },
        { status: 401 }
      );
    }

    body = await req.json();
    const { qrData } = body ?? {};

    if (!qrData) {
      return NextResponse.json(
        { success: false, error: 'Datos QR requeridos' },
        { status: 400 }
      );
    }

    // Parse QR data (should be JSON string)
    let parsedData: {
      orderId?: string;
      id?: string;
      pickupCode?: string;
    } | null = null;
    let orderId: string | undefined;
    let pickupCode: string | undefined;

    try {
      // Try to parse as JSON first (for QR codes)
      if (typeof qrData === 'string') {
        try {
          parsedData = JSON.parse(qrData);
          orderId = parsedData?.orderId || parsedData?.id;
          pickupCode = parsedData?.pickupCode;
        } catch {
          // If not JSON, treat as pickupCode directly (manual entry)
          // Pickup codes are typically 6 characters, orderIds are longer CUIDs
          const trimmedCode = qrData.trim().toUpperCase();
          if (trimmedCode.length === 6) {
            // Likely a pickup code
            pickupCode = trimmedCode;
          } else if (trimmedCode.length > 20) {
            // Likely an orderId (CUID format)
            orderId = trimmedCode;
          } else {
            // Try as pickup code anyway
            pickupCode = trimmedCode;
          }
        }
      } else {
        // Already an object
        parsedData = qrData as {
          orderId?: string;
          id?: string;
          pickupCode?: string;
        };
        orderId = parsedData.orderId || parsedData.id;
        pickupCode = parsedData.pickupCode;
      }
    } catch (error) {
      console.error('Error parsing QR data:', error);
      // Fallback: treat as pickup code
      pickupCode =
        typeof qrData === 'string' ? qrData.trim().toUpperCase() : undefined;
    }

    if (!orderId && !pickupCode) {
      return NextResponse.json(
        { success: false, error: 'Datos QR inválidos' },
        { status: 400 }
      );
    }

    // Find order by orderId or pickupCode and verify it belongs to admin's restaurant
    const order = await prisma.order.findFirst({
      where: {
        ...(orderId
          ? { id: orderId }
          : { pickupCode: pickupCode?.toUpperCase() }),
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
        {
          success: false,
          error:
            'Pedido no encontrado o no pertenece a tu restaurante. Solo puedes escanear QR de pedidos de tu restaurante.',
        },
        { status: 404 }
      );
    }

    // Double-check: Verify order belongs to admin's restaurant (extra security)
    if (order.restaurant.id !== restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Este pedido no pertenece a tu restaurante.',
        },
        { status: 403 }
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

    // Check if order is already delivered - IMPORTANT: Prevent duplicate claims
    if (order.status === 'delivered') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Este pedido ya fue entregado. El código QR no es válido para una segunda entrega.',
        },
        { status: 400 }
      );
    }

    // Check if order is ready or in_progress
    if (
      order.status !== 'ready' &&
      order.status !== 'in_progress' &&
      order.status !== 'paid'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Pedido no está listo para entregar (estado actual: ${order.status})`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        pickupCode: order.pickupCode,
        totalAmount: order.totalAmount,
        status: order.status,
        student: order.student,
        items: order.items,
        restaurant: order.restaurant,
      },
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        qrData:
          typeof body?.qrData === 'string'
            ? body.qrData.substring(0, 50)
            : body?.qrData,
      },
      'Error validating QR code'
    );
    return NextResponse.json(
      {
        success: false,
        error:
          'Error al validar código QR. Por favor, verifica el código e intenta nuevamente.',
      },
      { status: 500 }
    );
  }
}
