/**
 * POST /api/payments/session
 * Create a payment session/link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { Prisma } from '@prisma/client';
// import { createPaymentSessionSchema } from '../../../../lib/validations/payment'; // Not used anymore, creditsToUse is optional
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import {
  createPaymentSession,
  calculateGatewayFee,
} from '../../../../lib/payments/wompi';
import { generateIntegritySignature } from '../../../../lib/payments/wompi-signature';
import { reserveSlot } from '../../../../lib/slots';
import logger from '../../../../lib/logger';
import { rateLimiters } from '../../../../lib/rate-limit';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimiters.auth(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
        },
      }
    );
  }

  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader = req.headers.get('authorization');
    let user;

    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    } else {
      // Fallback to cookie-based auth (for server-side requests)
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, method, creditsToUse, paymentData } = body;

    logger.info(
      {
        orderId,
        orderIdType: typeof orderId,
        orderIdValue: orderId,
        method,
        creditsToUse,
        bodyKeys: Object.keys(body),
        bodyStringified: JSON.stringify(body),
      },
      'Payment session request received'
    );

    // Validate orderId - must be a non-empty string
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      logger.error(
        {
          body,
          orderId,
          orderIdType: typeof orderId,
          orderIdValue: orderId,
        },
        'orderId is required and must be a non-empty string'
      );
      return NextResponse.json(
        { error: 'orderId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Calculate credits amount first
    const creditsAmount = creditsToUse
      ? Math.max(0, Math.floor(creditsToUse))
      : 0;

    // Ensure orderId is a string and not null/undefined
    const validatedOrderId = String(orderId).trim();
    if (!validatedOrderId) {
      logger.error(
        { orderId, validatedOrderId },
        'orderId validation failed - empty after trim'
      );
      return NextResponse.json(
        { error: 'Invalid orderId format' },
        { status: 400 }
      );
    }

    logger.info({ validatedOrderId }, 'Fetching order from database');

    const order = await prisma.order.findUnique({
      where: { id: validatedOrderId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order || order.studentId !== user.id) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    if (order.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'Order is not awaiting payment' },
        { status: 400 }
      );
    }

    // Validate method (only required if not paying fully with credits)
    // If paying fully with credits, method can be optional
    const isFullCreditPayment =
      creditsAmount > 0 && order.totalAmount <= creditsAmount;

    if (
      !isFullCreditPayment &&
      (!method || (method !== 'CARD' && method !== 'PSE'))
    ) {
      logger.error({ method }, 'Invalid payment method');
      return NextResponse.json(
        { error: 'Invalid payment method. Must be CARD or PSE' },
        { status: 400 }
      );
    }

    // If method is not provided but we need it, default to CARD
    const paymentMethod = method || 'CARD';

    // Reserve slot if not already reserved
    const slotReserved = await reserveSlot(
      order.restaurantId,
      order.pickupSlotStart,
      order.pickupSlotEnd
    );

    if (!slotReserved) {
      return NextResponse.json(
        { error: 'Pickup slot no longer available' },
        { status: 400 }
      );
    }

    // Get user credits
    let userCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 0,
        },
      });
    }

    // Validate credits amount
    const availableCredits = userCredit.balance;
    const creditsToDeduct = Math.min(
      creditsAmount,
      availableCredits,
      order.totalAmount
    );
    const remainingAmount = Math.max(0, order.totalAmount - creditsToDeduct);

    // Wompi minimum amount is typically 1000 cents (10 COP)
    // If remaining amount is less than minimum, treat as fully paid with credits
    const WOMPI_MIN_AMOUNT = 1000; // 10 COP in cents

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update order with credits used
      await tx.order.update({
        where: { id: orderId },
        data: {
          creditsUsed: creditsToDeduct,
        },
      });

      // Deduct credits if any
      if (creditsToDeduct > 0) {
        await tx.userCredit.update({
          where: { userId: user.id },
          data: {
            balance: {
              decrement: creditsToDeduct,
            },
          },
        });

        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            orderId: order.id,
            amount: -creditsToDeduct, // Negative because it's a debit
            type: 'CREDIT_USED',
            description: `Uso de créditos para pedido #${order.pickupCode}`,
          },
        });

        // Create notification for superadmin
        const customerName = order.student.firstName && order.student.lastName
          ? `${order.student.firstName} ${order.student.lastName}`
          : order.student.email;

        await tx.notification.create({
          data: {
            type: 'CREDIT_ADJUSTMENT', // Use CREDIT_ADJUSTMENT instead of CREDIT_PAYMENT to avoid enum issues
            title: creditsToDeduct >= order.totalAmount
              ? 'Pago Completo con Créditos'
              : 'Pago Parcial con Créditos',
            message:
              creditsToDeduct >= order.totalAmount
                ? `El usuario ${customerName} (${order.student.email}) pagó completamente el pedido #${order.pickupCode} usando ${(creditsToDeduct / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} en créditos en el restaurante ${order.restaurant.name}.`
                : `El usuario ${customerName} (${order.student.email}) pagó parcialmente el pedido #${order.pickupCode} usando ${(creditsToDeduct / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} en créditos. Restante a pagar: ${(remainingAmount / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} en el restaurante ${order.restaurant.name}.`,
            metadata: {
              orderId: order.id,
              pickupCode: order.pickupCode,
              userId: order.student.id,
              userEmail: order.student.email,
              customerName,
              restaurantId: order.restaurantId,
              restaurantName: order.restaurant.name,
              creditsUsed: creditsToDeduct,
              remainingAmount: remainingAmount,
              isFullPayment: creditsToDeduct >= order.totalAmount,
            },
          },
        });
      }

      // If remaining amount is 0 or less than Wompi minimum, mark order as paid
      if (remainingAmount <= 0 || remainingAmount < WOMPI_MIN_AMOUNT) {
        // If remaining is less than minimum but greater than 0, add to credits used
        if (remainingAmount > 0 && remainingAmount < WOMPI_MIN_AMOUNT) {
          const additionalCredits = remainingAmount;
          await tx.userCredit.update({
            where: { userId: user.id },
            data: {
              balance: {
                decrement: additionalCredits,
              },
            },
          });

          await tx.creditTransaction.create({
            data: {
              userId: user.id,
              orderId: order.id,
              amount: -(creditsToDeduct + additionalCredits),
              type: 'CREDIT_USED',
              description: `Uso de créditos para pedido #${order.pickupCode} (incluye monto mínimo de Wompi)`,
            },
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              creditsUsed: creditsToDeduct + additionalCredits,
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
          },
        });

        // Calculate commission for orders paid fully with credits
        try {
          const { calculateAndSaveOrderCommission } = await import(
            '../../../../lib/restaurant-commission'
          );
          await calculateAndSaveOrderCommission(orderId);
        } catch (error) {
          logger.error(
            { error, orderId },
            'Failed to calculate commission for credit-only payment (non-critical)'
          );
          // Don't fail the transaction if commission calculation fails
        }

        return {
          payment: null,
          wompiSession: null,
          paidWithCredits: true,
        };
      }

      // Calculate gateway fee for remaining amount
      const gatewayFee = calculateGatewayFee(remainingAmount, paymentMethod);

      // Create payment record for remaining amount
      const payment = await tx.payment.create({
        data: {
          orderId,
          provider: 'wompi',
          amount: remainingAmount,
          status: 'pending',
          method: paymentMethod,
          gatewayFeeAmount: gatewayFee,
        },
      });

      // Generate integrity signature for Wompi widget
      const integritySignature = generateIntegritySignature(
        orderId,
        remainingAmount,
        'COP'
      );

      // Create Wompi payment session for remaining amount
      const wompiSession = await createPaymentSession(
        orderId,
        remainingAmount,
        order.student.email,
        paymentMethod,
        paymentData, // Pass payment data (token for CARD, bank details for PSE)
        integritySignature // Pass integrity signature for widget
      );

      // Update payment with provider reference
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: wompiSession.data.id,
          providerMetadata: wompiSession.data as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        payment,
        wompiSession,
        integritySignature, // Return signature for widget use
        paidWithCredits: false,
      };
    });

    logger.info(
      {
        orderId,
        creditsUsed: creditsToDeduct,
        remainingAmount,
        paidWithCredits: result.paidWithCredits,
      },
      'Payment session created with credits'
    );

    if (result.paidWithCredits) {
      return NextResponse.json({
        success: true,
        data: {
          paymentId: null,
          transactionId: null,
          paymentUrl: null,
          amount: 0,
          creditsUsed: creditsToDeduct,
          paidWithCredits: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.payment!.id,
        transactionId: result.wompiSession!.data.id,
        paymentUrl: result.wompiSession!.data.payment_link?.url,
        amount: remainingAmount,
        creditsUsed: creditsToDeduct,
        paidWithCredits: false,
        integritySignature: result.integritySignature, // Include signature for widget
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(
        { error: error.message },
        'Failed to create payment session'
      );
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
