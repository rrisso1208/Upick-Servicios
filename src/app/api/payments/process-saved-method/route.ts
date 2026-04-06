/**
 * POST /api/payments/process-saved-method
 * Process payment using a saved payment method (payment_source_id)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import { createPaymentSession } from '../../../../lib/payments/wompi';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, paymentMethodId } = body;

    if (!orderId || !paymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'orderId y paymentMethodId son requeridos' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        student: true,
        restaurant: true,
      },
    });

    if (!order || order.studentId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Get saved payment method
    const savedMethod = await prisma.savedPaymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: user.id,
        wompiPaymentSourceId: { not: null },
      },
    });

    if (!savedMethod || !savedMethod.wompiPaymentSourceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Método de pago guardado no encontrado o inválido',
        },
        { status: 404 }
      );
    }

    // Calculate amount (subtracting credits used)
    // order.totalAmount is the full amount, so we must subtract creditsUsed
    const creditDeduction = order.creditsUsed || 0;
    const amountInCents = Math.max(0, order.totalAmount - creditDeduction);

    if (amountInCents <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El monto del pedido debe ser mayor a cero',
        },
        { status: 400 }
      );
    }

    const paymentMethod =
      savedMethod.method === 'CARD' || savedMethod.method === 'PSE'
        ? savedMethod.method
        : null;

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Método de pago no soportado',
        },
        { status: 400 }
      );
    }

    // Create transaction with payment_source_id
    const wompiResponse = await createPaymentSession(
      orderId,
      amountInCents,
      order.student.email,
      paymentMethod,
      undefined, // No paymentData needed when using payment_source_id
      undefined, // No integrity signature needed for direct transactions
      savedMethod.wompiPaymentSourceId
    );

    // Update saved method last used
    await prisma.savedPaymentMethod.update({
      where: { id: savedMethod.id },
      data: { lastUsedAt: new Date() },
    });

    logger.info(
      {
        orderId,
        paymentMethodId,
        transactionId: wompiResponse.data.id,
        status: wompiResponse.data.status,
      },
      'Payment processed with saved method'
    );

    return NextResponse.json({
      success: true,
      data: {
        transaction: wompiResponse.data,
        orderId,
      },
    });
  } catch (error: any) {
    logger.error(
      { error, errorMessage: error?.message },
      'Error processing payment with saved method'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el pago',
        details: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
