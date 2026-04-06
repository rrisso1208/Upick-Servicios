/**
 * POST /api/payments/webhook
 * Handle payment gateway webhooks (Wompi)
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '../../../../lib/db';
import {
  Prisma,
  ReservationStatus,
  TableReservationStatus,
  TicketStatus,
} from '@prisma/client';
import {
  WompiWebhookPayload,
  verifyWebhookSignature,
  calculateGatewayFee,
  getTransactionStatus,
} from '../../../../lib/payments/wompi';
import {
  resolveCommissionPolicy,
  calculateOrderFinance,
  saveOrderFinance,
} from '../../../../lib/commission';
import {
  confirmSlotReservation,
  releaseSlotReservation,
} from '../../../../lib/slots';
import { sendOrderReceiptEmail } from '../../../../lib/notifications/email';
import {
  sendOrderConfirmationWhatsApp,
  sendNewOrderAdminWhatsApp,
} from '../../../../lib/notifications/whatsapp';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import logger from '../../../../lib/logger';
import { env } from '../../../../lib/env';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET endpoint for webhook health check
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  // IMPORTANT: Always return 200 to Wompi, even on errors
  // This prevents Wompi from retrying the webhook
  let payload: WompiWebhookPayload | null = null;

  try {
    // Log raw request for debugging
    const rawBody = await req.text();
    logger.info(
      {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        bodyLength: rawBody.length,
      },
      'Webhook request received'
    );

    // Parse JSON
    try {
      payload = JSON.parse(rawBody) as WompiWebhookPayload;
    } catch (parseError) {
      logger.error(
        { error: parseError, rawBody: rawBody.substring(0, 500) },
        'Failed to parse webhook payload as JSON'
      );
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 200 } // Always return 200 to prevent retries
      );
    }

    logger.info(
      {
        event: payload.event,
        transactionId: payload.data?.transaction?.id,
        environment: payload.environment,
        hasSignature: !!payload.signature,
      },
      'Webhook payload parsed successfully'
    );

    // Verify signature
    const signatureValid = verifyWebhookSignature(payload);
    if (!signatureValid) {
      logger.error(
        {
          transactionId: payload.data?.transaction?.id,
          event: payload.event,
          hasSecret: !!process.env.WOMPI_WEBHOOK_SECRET,
        },
        'Invalid webhook signature - check WOMPI_WEBHOOK_SECRET matches Wompi dashboard'
      );
      // IMPORTANT: In sandbox, we might want to allow webhooks even with invalid signature for testing
      // But in production, we should reject them
      const isSandbox = process.env.WOMPI_API_URL?.includes('sandbox');
      if (!isSandbox) {
        // Return 200 to prevent retries, but log the error
        return NextResponse.json({ error: 'Invalid signature' }, { status: 200 });
      } else {
        logger.warn(
          'Sandbox mode: Processing webhook despite invalid signature for testing'
        );
      }
    }

    // Check idempotency
    const idempotencyKey = `webhook:${payload.data.transaction.id}:${payload.event}`;
    const existing = await prisma.idempotencyKey.findUnique({
      where: { id: idempotencyKey },
    });

    if (existing) {
      logger.info({ idempotencyKey }, 'Webhook already processed (idempotent)');
      return NextResponse.json(existing.response, { status: existing.statusCode });
    }

    // Process transaction
    const transaction = payload.data.transaction;
    const reference = String(transaction.reference || '');

    // Pagos de verticales SERVICE / DISCOTECA (referencia Wompi distinta a orderId)
    if (
      reference.startsWith('svres-') ||
      reference.startsWith('tblres-') ||
      reference.startsWith('ticket-')
    ) {
      const verticalResponse = await processVerticalWompiWebhook(
        transaction,
        reference
      );
      await prisma.idempotencyKey.create({
        data: {
          id: idempotencyKey,
          endpoint: '/api/payments/webhook',
          response: verticalResponse as object,
          statusCode: 200,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json(verticalResponse);
    }

    const orderId = transaction.reference;

    // First try to find existing payment
    let payment = await prisma.payment.findFirst({
      where: {
        orderId,
        providerRef: transaction.id,
      },
      include: {
        order: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                posType: true,
                posEnabled: true,
              },
            },
            place: true,
            student: true,
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
          },
        },
      },
    });

    // If payment doesn't exist, try to find by orderId only (widget flow)
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          orderId,
        },
        include: {
          order: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  posType: true,
                  posEnabled: true,
                },
              },
              place: true,
              student: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }

    // If still no payment, create one (widget flow without pre-created payment)
    if (!payment) {
      logger.info(
        { orderId, transactionId: transaction.id },
        'Payment not found, creating new payment from webhook'
      );

      // Verify order exists
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              posType: true,
              posEnabled: true,
            },
          },
          student: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        logger.error({ orderId }, 'Order not found in webhook');
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Determine payment method from transaction
      // Map Wompi payment types to our PaymentMethod enum (CARD, PSE, CASH)
      // Note: NEQUI and DAVIPLATA are mapped to PSE since they're bank transfer methods
      const wompiMethodType = transaction.payment_method_type?.toUpperCase();
      const paymentMethod =
        wompiMethodType === 'CARD'
          ? 'CARD'
          : wompiMethodType === 'PSE' ||
            wompiMethodType === 'NEQUI' ||
            wompiMethodType === 'DAVIPLATA'
            ? 'PSE'
            : 'CARD';

      // Calculate gateway fee (approximate)
      const gatewayFee = calculateGatewayFee(transaction.amount_in_cents, paymentMethod);

      // Create payment record
      payment = await prisma.payment.create({
        data: {
          orderId,
          provider: 'wompi',
          providerRef: transaction.id,
          amount: transaction.amount_in_cents,
          status: 'pending',
          method: paymentMethod,
          gatewayFeeAmount: gatewayFee,
          providerMetadata: transaction as unknown as Prisma.InputJsonValue,
        },
        include: {
          order: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  posType: true,
                  posEnabled: true,
                },
              },
              place: true,
              student: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }

    if (!payment) {
      logger.error({ orderId }, 'Payment not found and could not be created');
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const order = payment.order;

    if (!order) {
      logger.error({ orderId, paymentId: payment.id }, 'Order not found in payment');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: transaction.status.toLowerCase() as 'approved' | 'declined',
        capturedAt:
          transaction.status === 'APPROVED'
            ? new Date(transaction.finalized_at || transaction.created_at)
            : undefined,
        declinedReason:
          transaction.status === 'DECLINED' ? transaction.status_message : undefined,
      },
    });

    if (transaction.status === 'APPROVED') {
      // Process approved payment
      logger.info({ orderId, paymentId: payment.id }, 'Payment approved');

      // CRITICAL: Ensure credits are deducted if order has creditsUsed but they weren't deducted yet
      if (order.creditsUsed > 0) {
        const existingCreditTransaction = await prisma.creditTransaction.findFirst({
          where: {
            orderId: order.id,
            type: 'CREDIT_USED',
            amount: { lt: 0 },
          },
        });

        if (!existingCreditTransaction) {
          logger.warn(
            { orderId, creditsUsed: order.creditsUsed },
            'Credits were marked as used but never deducted - deducting now'
          );

          const userCredit = await prisma.userCredit.findUnique({
            where: { userId: order.studentId },
          });

          if (userCredit) {
            await prisma.userCredit.update({
              where: { userId: order.studentId },
              data: { balance: { decrement: order.creditsUsed } },
            });

            await prisma.creditTransaction.create({
              data: {
                userId: order.studentId,
                orderId: order.id,
                amount: -order.creditsUsed,
                type: 'CREDIT_USED',
                description: `Uso de créditos para pedido #${order.pickupCode} (deducido en webhook)`,
              },
            });

            logger.info(
              {
                orderId,
                creditsDeducted: order.creditsUsed,
                newBalance: userCredit.balance - order.creditsUsed,
              },
              'Credits successfully deducted in webhook'
            );
          } else {
            logger.error(
              { orderId, userId: order.studentId },
              'UserCredit record not found - cannot deduct credits'
            );
          }
        }
      }

      // 0. Save payment method for user (if user consented)
      try {
        // Check if user consented to save payment method (Ley 1581 de 2012)
        const orderWithConsent = await prisma.order.findUnique({
          where: { id: orderId },
          select: { consentToSavePaymentMethod: true },
        });

        if (!orderWithConsent?.consentToSavePaymentMethod) {
          logger.info({ orderId }, 'User did not consent to save payment method - skipping');
        } else {
          // Normalize payment method type
          let paymentMethod: 'CARD' | 'PSE' = 'CARD';

          // Some webhook payloads omit payment_method details, so fetch full transaction if needed
          let transactionForMethod = transaction as typeof transaction;
          const needsTransactionDetails =
            !transaction.payment_method ||
            !transaction.payment_method_type ||
            transaction.payment_source_id === undefined;

          if (needsTransactionDetails) {
            try {
              const wompiDetails = await getTransactionStatus(transaction.id);
              if (wompiDetails?.data) {
                transactionForMethod = wompiDetails.data as typeof transaction;
                logger.info(
                  {
                    orderId,
                    transactionId: transaction.id,
                    hadPaymentMethod: !!transaction.payment_method,
                    fetchedPaymentMethod: !!transactionForMethod.payment_method,
                    hadPaymentSourceId: transaction.payment_source_id !== undefined,
                    fetchedPaymentSourceId:
                      (transactionForMethod as any).payment_source_id !== undefined,
                  },
                  'Fetched Wompi transaction details for payment method'
                );
              }
            } catch (error) {
              logger.warn(
                {
                  orderId,
                  transactionId: transaction.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                'Failed to fetch Wompi transaction details'
              );
            }
          }

          const wompiMethodType = transactionForMethod.payment_method_type?.toUpperCase();

          if (wompiMethodType === 'PSE') {
            paymentMethod = 'PSE';
          } else if (wompiMethodType === 'NEQUI' || wompiMethodType === 'DAVIPLATA') {
            paymentMethod = 'PSE';
          } else {
            paymentMethod = 'CARD';
          }

          const metadata = payment.providerMetadata as any;
          const transactionMetadata = (transactionForMethod as any).payment_method as any;

          // ✅ 1) Declarar UNA vez (let) para poder reasignar si lo creamos desde token
          let wompiPaymentSourceId: string | null =
            (transactionForMethod as any).payment_source_id
              ? String((transactionForMethod as any).payment_source_id)
              : transaction.payment_source_id
                ? String(transaction.payment_source_id)
                : null;

          // ✅ 2) Token real (en tu evento viene aquí: payload.data.transaction.payment_method.token)
          const wompiToken: string | null =
            (transactionForMethod as any)?.payment_method?.token ||
            (payload.data.transaction as any)?.payment_method?.token ||
            null;

          // ✅ 3) Email para crear payment source (usa lo que haya)
          const customerEmailForSource =
            (transactionForMethod as any).customer_email ||
            transaction.customer_email ||
            order.student?.email ||
            null;

          // Extract card/bank info
          const last4Digits =
            metadata?.payment_method?.extra?.last_four ||
            transactionMetadata?.extra?.last_four ||
            metadata?.payment_method?.last_four ||
            transactionMetadata?.last_four ||
            metadata?.bin?.last_four ||
            transactionMetadata?.bin?.last_four ||
            null;

          const brand =
            metadata?.payment_method?.extra?.brand ||
            transactionMetadata?.extra?.brand ||
            metadata?.payment_method?.brand ||
            transactionMetadata?.brand ||
            metadata?.payment_method?.extra?.card_brand ||
            transactionMetadata?.extra?.card_brand ||
            metadata?.bin?.card_brand ||
            null;

          const bankName =
            paymentMethod === 'PSE'
              ? metadata?.payment_method?.extra?.financial_institution_name ||
              transactionMetadata?.extra?.financial_institution_name ||
              metadata?.financial_institution_name ||
              (wompiMethodType === 'NEQUI' ? 'Nequi' : null) ||
              (wompiMethodType === 'DAVIPLATA' ? 'Daviplata' : null) ||
              null
              : null;

          // ✅ 4) Si hay consentimiento, es tarjeta y NO vino payment_source_id, créalo usando token
          if (
            orderWithConsent?.consentToSavePaymentMethod &&
            wompiMethodType === 'CARD' &&
            !wompiPaymentSourceId &&
            wompiToken &&
            customerEmailForSource
          ) {
            try {
              const acceptanceToken = await getMerchantAcceptanceToken();
              const ps = await createPaymentSourceFromToken({
                token: wompiToken,
                customerEmail: customerEmailForSource,
                acceptanceToken,
              });

              wompiPaymentSourceId = ps?.data?.id ? String(ps.data.id) : null;

              logger.info(
                { orderId, wompiPaymentSourceId },
                'Created wompi payment_source from token in webhook'
              );
            } catch (e) {
              logger.warn(
                { orderId, error: e instanceof Error ? e.message : e },
                'Failed to create payment_source from token (will save method without source id if possible)'
              );
            }
          }

          logger.info(
            {
              orderId,
              userId: order.studentId,
              paymentMethod,
              wompiMethodType,
              hasPaymentSourceId: !!wompiPaymentSourceId,
              paymentSourceId: wompiPaymentSourceId,
              hasLast4Digits: !!last4Digits,
              last4Digits,
              hasBankName: !!bankName,
              bankName,
              hasConsent: orderWithConsent?.consentToSavePaymentMethod,
              tokenPresent: !!wompiToken,
            },
            'Attempting to save payment method'
          );

          // Determine if we should save this method
          const shouldSave =
            wompiPaymentSourceId ||
            (paymentMethod === 'CARD' && last4Digits) ||
            (paymentMethod === 'PSE' && bankName);

          if (!shouldSave) {
            logger.warn(
              {
                orderId,
                paymentMethod,
                hasPaymentSourceId: !!wompiPaymentSourceId,
                hasLast4Digits: !!last4Digits,
                hasBankName: !!bankName,
              },
              'Cannot save payment method: missing identifying information'
            );
          } else {
            // Check if method already exists
            let existingMethod: any = null;

            if (wompiPaymentSourceId) {
              existingMethod = await prisma.savedPaymentMethod.findFirst({
                where: {
                  userId: order.studentId,
                  wompiPaymentSourceId: wompiPaymentSourceId,
                },
              });
            }

            if (!existingMethod) {
              const whereClause: any = {
                userId: order.studentId,
                method: paymentMethod,
              };

              if (paymentMethod === 'CARD' && last4Digits) {
                whereClause.last4Digits = String(last4Digits);
              } else if (paymentMethod === 'PSE' && bankName) {
                whereClause.bankName = String(bankName);
              }

              existingMethod = await prisma.savedPaymentMethod.findFirst({
                where: whereClause,
              });
            }

            if (!existingMethod) {
              const hasAnyMethod = await prisma.savedPaymentMethod.findFirst({
                where: { userId: order.studentId },
              });

              await prisma.savedPaymentMethod.create({
                data: {
                  userId: order.studentId,
                  method: paymentMethod,
                  wompiPaymentSourceId: wompiPaymentSourceId
                    ? String(wompiPaymentSourceId)
                    : null,
                  last4Digits: paymentMethod === 'CARD' ? (last4Digits ? String(last4Digits) : null) : null,
                  brand: paymentMethod === 'CARD' ? (brand ? String(brand) : null) : null,
                  bankName: paymentMethod === 'PSE' ? (bankName ? String(bankName) : null) : null,
                  isDefault: !hasAnyMethod,
                  lastUsedAt: new Date(),
                },
              });

              logger.info(
                {
                  userId: order.studentId,
                  paymentSourceId: wompiPaymentSourceId,
                  method: paymentMethod,
                  wompiMethodType,
                  last4Digits,
                  bankName,
                },
                'Saved new payment method from Wompi'
              );
            } else {
              const updateData: any = { lastUsedAt: new Date() };

              if (wompiPaymentSourceId && !existingMethod.wompiPaymentSourceId) {
                updateData.wompiPaymentSourceId = wompiPaymentSourceId;
              }

              if (paymentMethod === 'CARD') {
                if (last4Digits && !existingMethod.last4Digits) {
                  updateData.last4Digits = String(last4Digits);
                }
                if (brand && !existingMethod.brand) {
                  updateData.brand = String(brand);
                }
              } else if (paymentMethod === 'PSE') {
                if (bankName && !existingMethod.bankName) {
                  updateData.bankName = String(bankName);
                }
              }

              await prisma.savedPaymentMethod.update({
                where: { id: existingMethod.id },
                data: updateData,
              });

              logger.info(
                {
                  userId: order.studentId,
                  methodId: existingMethod.id,
                  updatedFields: Object.keys(updateData),
                },
                'Updated existing payment method'
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          {
            error,
            orderId,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          'Failed to save payment method'
        );
        // Don't fail the webhook if saving payment method fails
      }

      // 1. Confirm slot reservation
      await confirmSlotReservation(order.restaurantId, order.pickupSlotStart);

      // 2. Calculate and save order finance
      const policy = await resolveCommissionPolicy(
        order.restaurantId,
        order.placeId,
        new Date(transaction.finalized_at || transaction.created_at)
      );

      const finance = await calculateOrderFinance(
        {
          baseAmount: order.totalAmount,
          taxAmount: payment.taxAmount,
          tipAmount: payment.tipAmount,
          discountAmount: 0,
          gatewayFeeAmount: payment.gatewayFeeAmount,
        },
        policy
      );

      await saveOrderFinance(orderId, finance);

      // 3. Calculate and save simplified commission
      try {
        const { calculateAndSaveOrderCommission } = await import(
          '../../../../lib/restaurant-commission'
        );
        await calculateAndSaveOrderCommission(orderId);
      } catch (error) {
        logger.error(
          { error, orderId },
          'Failed to calculate simplified commission (non-critical)'
        );
      }

      // 4. Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });

      // 4.5. Send order to POS (if configured)
      try {
        const { sendOrderToPOS, transformUPICOrderToStandard } = await import(
          '../../../../lib/pos/posService'
        );
        const upicOrder = transformUPICOrderToStandard(order, order.restaurant);
        const posResult = await sendOrderToPOS(upicOrder);

        if (posResult.success) {
          logger.info(
            {
              orderId: order.id,
              posOrderId: posResult.posOrderId,
              posType: order.restaurant.posType,
            },
            'Pedido enviado exitosamente al POS'
          );
        } else {
          logger.warn(
            {
              orderId: order.id,
              error: posResult.error,
              posType: order.restaurant.posType,
            },
            'Error al enviar pedido al POS (no crítico)'
          );
        }
      } catch (posError) {
        logger.error({ error: posError, orderId }, 'Error enviando pedido al POS (no crítico)');
      }

      // 5. Send notifications
      try {
        await sendOrderReceiptEmail({
          orderId: order.id,
          customerEmail: order.student.email,
          customerName: order.student.firstName || 'Cliente',
          restaurantName: order.restaurant.name,
          pickupTime: formatDate(order.pickupSlotStart),
          pickupCode: order.pickupCode,
          totalAmount: formatCurrency(order.totalAmount),
          items: order.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: formatCurrency(item.unitPrice * item.quantity),
          })),
          receiptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}/receipt`,
        });

        if (order.student.phoneNumber) {
          await sendOrderConfirmationWhatsApp(
            order.student.phoneNumber,
            order.restaurant.name,
            formatDate(order.pickupSlotStart),
          );
        }

        // Notify Restaurant Admins
        try {
          const restaurantAdmins = await prisma.user.findMany({
            where: {
              restaurantId: order.restaurantId,
              role: 'restaurant_admin',
              phoneNumber: { not: null },
            },
            select: { phoneNumber: true },
          });

          for (const admin of restaurantAdmins) {
            if (admin.phoneNumber) {
              await sendNewOrderAdminWhatsApp(
                admin.phoneNumber,
                order.student?.firstName
              ).catch((e) =>
                logger.error(
                  { error: e, adminPhone: admin.phoneNumber },
                  'Failed to send WhatsApp notification to admin'
                )
              );
            }
          }
        } catch (adminError) {
          logger.error({ error: adminError, orderId }, 'Failed to fetch admins or send WhatsApp notifications');
        }
      } catch (error) {
        logger.error({ error, orderId }, 'Failed to send notifications');
      }
    } else if (
      transaction.status === 'DECLINED' ||
      transaction.status === 'VOIDED' ||
      transaction.status === 'ERROR'
    ) {
      // Payment failed - release slot reservation and cancel order
      try {
        await releaseSlotReservation(order.restaurantId, order.pickupSlotStart);
      } catch (slotError) {
        logger.error({ error: slotError, orderId }, 'Failed to release slot reservation');
      }

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'declined',
            declinedReason:
              transaction.status_message ||
              `Pago ${transaction.status === 'DECLINED'
                ? 'rechazado'
                : transaction.status === 'VOIDED'
                  ? 'anulado'
                  : 'fallido'
              }`,
          },
        });
      }

      if (order) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'payment_failed' },
        });

        logger.info(
          { orderId, transactionStatus: transaction.status, orderStatus: 'payment_failed' },
          'Order marked as payment_failed - no refund needed'
        );
      }

      if (order && order.status === 'awaiting_payment') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'payment_failed' },
        });
        logger.warn(
          { orderId },
          'Order status set to payment_failed via fallback (should have been set above)'
        );
      }

      logger.info(
        { orderId, transactionStatus: transaction.status },
        'Order cancelled due to payment failure'
      );
    }

    // Save idempotency record
    const response = { success: true, processed: transaction.status };
    await prisma.idempotencyKey.create({
      data: {
        id: idempotencyKey,
        endpoint: '/api/payments/webhook',
        response,
        statusCode: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          transactionId: payload?.data?.transaction?.id,
        },
        'Webhook processing failed'
      );
    } else {
      logger.error(
        { error: 'Unknown error', transactionId: payload?.data?.transaction?.id },
        'Webhook processing failed'
      );
    }

    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 200 }
    );
  }
}

/**
 * Confirmación tras pago aprobado — reservas de servicio, mesa y boletas (verticales).
 * No interfiere con el flujo de pedidos de restaurante.
 */
async function processVerticalWompiWebhook(
  transaction: WompiWebhookPayload['data']['transaction'],
  reference: string
) {
  const response = {
    success: true,
    processed: transaction.status,
    vertical: true,
    reference,
  };

  if (transaction.status !== 'APPROVED') {
    return response;
  }

  const amountCents = Number(transaction.amount_in_cents);
  if (!Number.isFinite(amountCents)) {
    logger.error({ reference }, 'Vertical webhook: amount_in_cents inválido');
    return response;
  }

  try {
    if (reference.startsWith('svres-')) {
      await confirmServiceReservationPayment(reference, amountCents);
    } else if (reference.startsWith('tblres-')) {
      await confirmTableReservationPayment(reference, amountCents);
    } else if (reference.startsWith('ticket-')) {
      await confirmTicketPurchasePayment(reference, amountCents);
    }
  } catch (e) {
    logger.error(
      {
        error: e instanceof Error ? e.message : e,
        reference,
      },
      'Error confirmando pago vertical en webhook'
    );
  }

  return response;
}

async function confirmServiceReservationPayment(
  reference: string,
  amountCents: number
) {
  const id = reference.replace(/^svres-/, '');
  await prisma.$transaction(async (tx) => {
    const res = await tx.serviceReservation.findUnique({
      where: { id },
      include: {
        slot: { include: { serviceOffering: { select: { price: true } } } },
      },
    });
    if (!res) {
      logger.error({ id }, 'ServiceReservation no encontrada en webhook');
      return;
    }
    const expected = res.slot.serviceOffering.price;
    if (expected !== amountCents) {
      logger.error(
        { id, expected, amountCents },
        'Monto Wompi no coincide con reserva de servicio'
      );
      return;
    }
    if (res.status !== ReservationStatus.PENDING_PAYMENT) {
      logger.info(
        { id, status: res.status },
        'ServiceReservation ya procesada (idempotente)'
      );
      return;
    }
    const qrCode = res.qrCode ?? nanoid(24);
    await tx.timeSlot.update({
      where: { id: res.slotId },
      data: { isBooked: true },
    });
    await tx.serviceReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        qrCode,
      },
    });
    logger.info({ id }, 'ServiceReservation confirmada vía webhook');
  });
}

async function confirmTableReservationPayment(
  reference: string,
  amountCents: number
) {
  const id = reference.replace(/^tblres-/, '');
  await prisma.$transaction(async (tx) => {
    const res = await tx.tableReservation.findUnique({
      where: { id },
      include: { table: { select: { price: true } } },
    });
    if (!res) {
      logger.error({ id }, 'TableReservation no encontrada en webhook');
      return;
    }
    const expected = res.table.price ?? 0;
    if (expected !== amountCents) {
      logger.error(
        { id, expected, amountCents },
        'Monto Wompi no coincide con reserva de mesa'
      );
      return;
    }
    if (res.status !== TableReservationStatus.PENDING_PAYMENT) {
      logger.info(
        { id, status: res.status },
        'TableReservation ya procesada (idempotente)'
      );
      return;
    }
    const qrCode = res.qrCode ?? nanoid(24);
    await tx.tableReservation.update({
      where: { id },
      data: {
        status: TableReservationStatus.CONFIRMED,
        qrCode,
      },
    });
    logger.info({ id }, 'TableReservation confirmada vía webhook');
  });
}

async function confirmTicketPurchasePayment(
  reference: string,
  amountCents: number
) {
  const id = reference.replace(/^ticket-/, '');
  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id } });
    if (!ticket) {
      logger.error({ id }, 'Ticket no encontrado en webhook');
      return;
    }
    const expected = ticket.quantity * ticket.unitPrice;
    if (expected !== amountCents) {
      logger.error(
        { id, expected, amountCents },
        'Monto Wompi no coincide con compra de boleta'
      );
      return;
    }
    if (ticket.status !== TicketStatus.PENDING_PAYMENT) {
      logger.info(
        { id, status: ticket.status },
        'Ticket ya procesado (idempotente)'
      );
      return;
    }
    const qrCode = ticket.qrCode ?? nanoid(24);
    await tx.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.PAID,
        qrCode,
      },
    });
    logger.info({ id }, 'Ticket marcado PAID vía webhook');
  });
}

/**
 * Helper: get merchant acceptance token (server-side)
 * Uses the public key to query /merchants/{public_key}
 */
async function getMerchantAcceptanceToken(): Promise<string> {
  const publicKey =
    env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
    '';

  if (!publicKey) {
    throw new Error('Missing NEXT_PUBLIC_WOMPI_PUBLIC_KEY for merchant lookup');
  }

  const url = `${env.WOMPI_API_URL}/merchants/${publicKey}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch merchant: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const token =
    data?.data?.presigned_acceptance?.acceptance_token ||
    data?.data?.presigned_acceptance?.acceptanceToken ||
    null;

  if (!token) {
    throw new Error('Merchant acceptance token not found in response');
  }

  return String(token);
}

/**
 * Helper: create payment_source from card token
 * POST /payment_sources
 */
async function createPaymentSourceFromToken(params: {
  token: string;
  customerEmail: string;
  acceptanceToken: string;
}): Promise<any> {
  const url = `${env.WOMPI_API_URL}/payment_sources`;

  const body = {
    type: 'CARD',
    token: params.token,
    customer_email: params.customerEmail,
    acceptance_token: params.acceptanceToken,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create payment_source: ${res.status} ${txt}`);
  }

  return res.json();
}