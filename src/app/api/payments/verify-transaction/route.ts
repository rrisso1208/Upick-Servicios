/**
 * POST /api/payments/verify-transaction
 * Manually verify transaction status from Wompi API
 * This is used as a fallback when webhook hasn't arrived yet
 * Documentation: https://docs.wompi.co/docs/colombia/seguimiento-de-transacciones/
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import {
  getTransactionStatus,
  getTransactionByReference,
  calculateGatewayFee,
  WompiTransactionResponse,
} from '../../../../lib/payments/wompi';
import { getAuthUser } from '../../../../lib/auth';
import logger from '../../../../lib/logger';
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

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get user (optional - allow unauthenticated for payment result page)
    let user;
    try {
      user = await getAuthUser();
    } catch {
      user = null;
    }

    const body = await req.json();
    let { transactionId, orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    logger.info(
      { transactionId, orderId },
      'Verifying transaction with Wompi API'
    );

    // Get order first to check if we have a stored transaction ID
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        place: true,
        student: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify ownership if user is authenticated
    if (user && user.role === 'student' && order.studentId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Strategy to find transaction data:
    // 1. Use provided transactionId
    // 2. Use stored providerRef from order.payment
    // 3. Query Wompi by reference (orderId)

    let transactionResponse: WompiTransactionResponse | null = null;
    let finalTransactionId: string | undefined = transactionId;

    // 1. Try with provided ID or stored ID
    if (!finalTransactionId && order.payment?.providerRef) {
      finalTransactionId = order.payment.providerRef;
      logger.info(
        { orderId, finalTransactionId },
        'Using stored transaction ID'
      );
    }

    if (finalTransactionId) {
      try {
        transactionResponse = await getTransactionStatus(finalTransactionId);
      } catch (error) {
        logger.warn(
          { error, finalTransactionId },
          'Failed to get transaction status by ID, will try by reference'
        );
      }
    }

    // 2. If still no transaction data, try by reference
    if (!transactionResponse) {
      logger.info({ orderId }, 'Looking up transaction by reference');
      try {
        transactionResponse = await getTransactionByReference(orderId);
        if (transactionResponse?.data) {
          finalTransactionId = transactionResponse.data.id;
          logger.info(
            { orderId, finalTransactionId },
            'Found transaction by reference'
          );
        }
      } catch (error) {
        logger.error(
          { error, orderId },
          'Failed to get transaction by reference'
        );
      }
    }

    const transaction = transactionResponse?.data;

    if (transaction) {
      logger.info(
        {
          orderId,
          transactionId: transaction.id,
          status: transaction.status,
          paymentSourceId: transaction.payment_source_id,
          paymentMethodType: transaction.payment_method_type,
          fullTransaction: JSON.stringify(transaction), // Log full object to be sure
        },
        'Wompi transaction details for tokenization check'
      );
    }

    if (!transaction) {
      logger.warn({ orderId, transactionId }, 'Transaction not found in Wompi');
      // If order is already paid, we can return success even if we can't verify the transaction right now
      if (order.status === 'paid') {
        return NextResponse.json({
          success: true,
          data: {
            status: 'approved',
            orderStatus: 'paid',
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If transaction is approved and order is not yet paid, process it
    if (
      transaction.status === 'APPROVED' &&
      order.status === 'awaiting_payment'
    ) {
      logger.info(
        { orderId, transactionId },
        'Processing approved payment from verification'
      );

      // Find or create payment
      let payment = await prisma.payment.findFirst({
        where: {
          orderId,
          providerRef: transactionId,
        },
      });

      if (!payment) {
        payment = await prisma.payment.findFirst({
          where: { orderId },
        });
      }

      if (!payment) {
        // Create payment
        const paymentMethod =
          transaction.payment_method_type === 'CARD'
            ? 'CARD'
            : transaction.payment_method_type === 'PSE'
              ? 'PSE'
              : 'CARD';

        // Calculate gateway fee
        const gatewayFee = calculateGatewayFee(
          transaction.amount_in_cents,
          paymentMethod
        );

        payment = await prisma.payment.create({
          data: {
            orderId,
            provider: 'wompi',
            providerRef: finalTransactionId || transactionId || 'unknown',
            amount: transaction.amount_in_cents,
            status: 'approved',
            method: paymentMethod,
            gatewayFeeAmount: gatewayFee,
            providerMetadata: transaction as any,
            capturedAt: transaction.finalized_at
              ? new Date(transaction.finalized_at)
              : new Date(),
          },
        });
      } else if (payment.status !== 'approved') {
        // Update payment to approved
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'approved',
            capturedAt: transaction.finalized_at
              ? new Date(transaction.finalized_at)
              : new Date(),
          },
        });
      }

      // Save payment method for user (if user consented)
      try {
        if (!order.consentToSavePaymentMethod) {
          logger.info(
            { orderId },
            'User did not consent to save payment method - skipping'
          );
        } else {
          let paymentMethod: 'CARD' | 'PSE' = 'CARD';
          const wompiMethodType =
            transaction.payment_method_type?.toUpperCase();

          if (wompiMethodType === 'PSE') {
            paymentMethod = 'PSE';
          } else if (
            wompiMethodType === 'NEQUI' ||
            wompiMethodType === 'DAVIPLATA'
          ) {
            paymentMethod = 'PSE';
          } else {
            paymentMethod = 'CARD';
          }


          const transactionMetadata = (transaction as any).payment_method;

          const wompiPaymentSourceIdRaw =
            transaction.payment_source_id ||
            (transaction as any).payment_source?.id ||
            transactionMetadata?.extra?.payment_source_id ||
            transactionMetadata?.payment_source_id ||
            null;

          const wompiPaymentSourceId = wompiPaymentSourceIdRaw
            ? String(wompiPaymentSourceIdRaw)
            : null;

          const last4Digits =
            transactionMetadata?.extra?.last_four ||
            transactionMetadata?.last_four ||
            transactionMetadata?.extra?.bin?.last_four ||
            transactionMetadata?.bin?.last_four ||
            null;

          const brand =
            transactionMetadata?.extra?.brand ||
            transactionMetadata?.brand ||
            transactionMetadata?.extra?.card_brand ||
            transactionMetadata?.extra?.bin?.card_brand ||
            transactionMetadata?.bin?.card_brand ||
            null;

          const bankName =
            paymentMethod === 'PSE'
              ? transactionMetadata?.extra?.financial_institution_name ||
              transactionMetadata?.financial_institution_name ||
              (wompiMethodType === 'NEQUI' ? 'Nequi' : null) ||
              (wompiMethodType === 'DAVIPLATA' ? 'Daviplata' : null) ||
              null
              : null;

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
              'Cannot save payment method from verification: missing identifying information'
            );
          } else {
            let existingMethod = null;

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
                whereClause.last4Digits = last4Digits;
              } else if (paymentMethod === 'PSE' && bankName) {
                whereClause.bankName = bankName;
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
                  wompiPaymentSourceId: wompiPaymentSourceId,
                  last4Digits: paymentMethod === 'CARD' ? last4Digits : null,
                  brand: paymentMethod === 'CARD' ? brand : null,
                  bankName: paymentMethod === 'PSE' ? bankName : null,
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
                'Saved new payment method from verification'
              );
            } else {
              const updateData: any = {
                lastUsedAt: new Date(),
              };

              if (
                wompiPaymentSourceId &&
                !existingMethod.wompiPaymentSourceId
              ) {
                updateData.wompiPaymentSourceId = wompiPaymentSourceId;
              }

              if (paymentMethod === 'CARD') {
                if (last4Digits && !existingMethod.last4Digits) {
                  updateData.last4Digits = last4Digits;
                }
                if (brand && !existingMethod.brand) {
                  updateData.brand = brand;
                }
              } else if (paymentMethod === 'PSE') {
                if (bankName && !existingMethod.bankName) {
                  updateData.bankName = bankName;
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
                'Updated existing payment method from verification'
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          {
            error,
            orderId,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          'Failed to save payment method from verification'
        );
      }

      // Process approved payment (same logic as webhook)
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
          taxAmount: payment.taxAmount || 0,
          tipAmount: payment.tipAmount || 0,
          discountAmount: 0,
          gatewayFeeAmount: payment.gatewayFeeAmount || 0,
        },
        policy
      );

      await saveOrderFinance(orderId, finance);

      // 3. Calculate and save simplified commission (for direct restaurant commission tracking)
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
        // Don't fail the transaction verification if this fails
      }

      // 4. Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });

      // Debug logging for tokenization
      logger.info(
        {
          orderId,
          consentToSave: order.consentToSavePaymentMethod,
          hasPaymentSourceId: !!transaction.payment_source_id,
          paymentSourceId: transaction.payment_source_id,
          paymentMethodType: transaction.payment_method_type,
          transactionKeys: Object.keys(transaction),
        },
        'Checking tokenization conditions'
      );

      // 4. Send notifications
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

      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
          orderStatus: 'paid',
          paymentSourceId: transaction.payment_source_id,
          consentToSave: order.consentToSavePaymentMethod,
          transactionId: transaction.id,
        },
      });
    } else if (
      transaction.status === 'DECLINED' ||
      transaction.status === 'ERROR' ||
      transaction.status === 'VOIDED'
    ) {
      // Payment was rejected
      if (order.status === 'awaiting_payment') {
        // Release slot reservation
        try {
          await releaseSlotReservation(
            order.restaurantId,
            order.pickupSlotStart
          );
        } catch (error) {
          logger.error(
            { error, orderId },
            'Failed to release slot reservation'
          );
        }

        // Update payment if exists
        const payment = await prisma.payment.findFirst({
          where: { orderId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'declined',
              declinedReason:
                transaction.status_message ||
                `Pago ${transaction.status === 'DECLINED' ? 'rechazado' : transaction.status === 'VOIDED' ? 'anulado' : 'fallido'}`,
            },
          });
        }

        // Cancel order
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'cancelled' },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'declined',
          orderStatus: 'cancelled',
          reason: transaction.status_message,
        },
      });
    } else {
      // Return actual status (could be APPROVED but order already paid)
      return NextResponse.json({
        success: true,
        data: {
          status: transaction.status.toLowerCase(),
          orderStatus: order.status,
          paymentSourceId: transaction.payment_source_id,
          consentToSave: order.consentToSavePaymentMethod,
          transactionId: transaction.id,
        },
      });
    }
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to verify transaction'
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to verify transaction',
      },
      { status: 500 }
    );
  }
}
