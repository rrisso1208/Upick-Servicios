/**
 * GET /api/payments/integrity-signature
 * Generate integrity signature for Wompi widget
 * This endpoint is called after order creation to get the signature for the widget
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { generateIntegritySignature } from '../../../../lib/payments/wompi-signature';
import { prisma } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or expired token' },
          { status: 401 }
        );
      }
    } else {
      try {
        user = await getAuthUser();
      } catch {
        return NextResponse.json(
          { error: 'Unauthorized - No valid authentication found' },
          { status: 401 }
        );
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get order ID and amount from query params
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const amountInCents = searchParams.get('amountInCents');

    if (!orderId || !amountInCents) {
      return NextResponse.json(
        { error: 'orderId and amountInCents are required' },
        { status: 400 }
      );
    }

    // Verify order belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        studentId: true,
        totalAmount: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (user.role === 'student' && order.studentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate amount
    const amount = parseInt(amountInCents, 10);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amountInCents value' },
        { status: 400 }
      );
    }

    // Check if WOMPI_INTEGRITY_SECRET is configured before attempting to generate signature
    // Try multiple environment variable names for compatibility
    const integritySecret =
      process.env.WOMPI_INTEGRITY_SECRET ||
      process.env.WOMPI_WEBHOOK_SECRET ||
      process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET ||
      '';

    logger.info(
      {
        orderId,
        amount,
        hasIntegritySecret: !!process.env.WOMPI_INTEGRITY_SECRET,
        hasWebhookSecret: !!process.env.WOMPI_WEBHOOK_SECRET,
        integritySecretLength: integritySecret.length,
        envKeys: Object.keys(process.env).filter((k) => k.includes('WOMPI')),
      },
      'Checking Wompi environment variables'
    );

    if (!integritySecret) {
      logger.error(
        {
          orderId,
          amount,
          envKeys: Object.keys(process.env).filter((k) => k.includes('WOMPI')),
        },
        'WOMPI_INTEGRITY_SECRET and WOMPI_WEBHOOK_SECRET are not configured'
      );
      return NextResponse.json(
        {
          error: 'Error de configuración del sistema de pagos',
          details:
            'WOMPI_INTEGRITY_SECRET no está configurado en las variables de entorno de Vercel. Por favor configura esta variable.',
          code: 'MISSING_INTEGRITY_SECRET',
          help: 'Ve a Vercel → Settings → Environment Variables y agrega WOMPI_INTEGRITY_SECRET',
        },
        { status: 500 }
      );
    }

    // Generate integrity signature
    let signature: string;
    try {
      signature = generateIntegritySignature(orderId, amount, 'COP');
    } catch (sigError: any) {
      logger.error(
        { error: sigError, orderId, amount, errorMessage: sigError?.message },
        'Failed to generate integrity signature'
      );
      return NextResponse.json(
        {
          error: 'Error al generar la firma de pago',
          details: sigError?.message || 'Error desconocido al generar la firma',
          code: 'SIGNATURE_GENERATION_ERROR',
        },
        { status: 500 }
      );
    }

    logger.info(
      { orderId, amountInCents: amount },
      'Generated integrity signature for order'
    );

    return NextResponse.json({
      success: true,
      data: {
        integritySignature: signature,
        orderId,
        amountInCents: amount,
      },
    });
  } catch (error: any) {
    logger.error(
      { error, errorMessage: error?.message, stack: error?.stack },
      'Failed to generate integrity signature'
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
