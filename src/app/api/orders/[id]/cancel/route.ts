/**
 * POST /api/orders/[id]/cancel - Cancel an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import { addHours, isBefore } from 'date-fns';
import {
  CreditTransactionType,
  Prisma,
  CaseType,
  CaseStatus,
} from '@prisma/client';
import logger from '../../../../../lib/logger';
import { restoreInventory } from '../../../../../lib/inventory';
import { sendWhatsAppMessage } from '../../../../../lib/notifications/whatsapp';

// Helper function to generate unique case number
async function generateCaseNumber(): Promise<string> {
  const prefix = 'CASE';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const caseNumber = `${prefix}-${timestamp}-${random}`;

  // Check if case number already exists (very unlikely but check anyway)
  const existing = await prisma.case.findUnique({
    where: { caseNumber },
  });

  if (existing) {
    // If exists, try again with a new random
    return generateCaseNumber();
  }

  return caseNumber;
}

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const body = await req.json();
    const { refundType, reason } = body;

    // Validate refundType
    if (
      !refundType ||
      !['REFUND_TO_PAYMENT_METHOD', 'CONVERT_TO_CREDITS'].includes(refundType)
    ) {
      return NextResponse.json(
        { success: false, error: 'Tipo de reembolso inválido' },
        { status: 400 }
      );
    }

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

    // Get order with related data including restaurant admins
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        restaurant: {
          include: {
            users: {
              where: {
                role: 'restaurant_admin',
              },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
          },
        },
        cancellation: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
          },
        },
      },
      // Explicitly select creditsUsed to ensure it's included
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verify order belongs to user
    if (order.studentId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para cancelar este pedido' },
        { status: 403 }
      );
    }

    // Check if order is already cancelled
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return NextResponse.json(
        { success: false, error: 'El pedido ya está cancelado' },
        { status: 400 }
      );
    }

    // CRITICAL: Prevent cancellation of unpaid orders
    if (
      order.status === 'awaiting_payment' ||
      order.status === 'payment_failed'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se puede cancelar este pedido porque el pago no se completó. Los pedidos no pagados no generan reembolsos.',
        },
        { status: 400 }
      );
    }

    // Verify order has been paid (has a payment record)
    if (!order.payment) {
      logger.warn(
        {
          orderId: order.id,
          status: order.status,
          pickupCode: order.pickupCode,
        },
        'Attempted to cancel order without payment record'
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'No se puede cancelar este pedido porque no tiene registro de pago. Los pedidos no pagados no generan reembolsos.',
        },
        { status: 400 }
      );
    }

    // Validate minimum 1 hour before pickup time
    // Order can be cancelled if current time is BEFORE (pickupTime - 1 hour)
    // This means at least 1 hour must remain before pickup
    const now = new Date();
    const pickupTime = new Date(order.pickupSlotStart);
    const oneHourBeforePickup = addHours(pickupTime, -1);

    // If now is NOT before oneHourBeforePickup, it means less than 1 hour remains
    // So we should reject the cancellation
    if (!isBefore(now, oneHourBeforePickup)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se puede cancelar el pedido. Debe cancelarse al menos 1 hora antes de la hora de entrega.',
        },
        { status: 400 }
      );
    }

    // Check if cancellation already exists
    if (order.cancellation) {
      return NextResponse.json(
        {
          success: false,
          error: 'El pedido ya tiene una solicitud de cancelación',
        },
        { status: 400 }
      );
    }

    // Calculate refund amount - same amount the user paid
    // The refund should be the totalAmount (what the user paid for the order)
    // This includes any credits used + Wompi payment, or just credits, or just Wompi
    // totalAmount is the final amount after discounts and represents what the user actually paid
    // Note: totalAmount already includes creditsUsed, so we use it directly
    const refundAmount = order.totalAmount;

    logger.info(
      {
        orderId: order.id,
        totalAmount: order.totalAmount,
        creditsUsed: order.creditsUsed || 0,
        paymentAmount: order.payment?.amount || 0,
        refundAmount,
        refundType,
      },
      'Calculating refund amount for order cancellation'
    );

    // Use transaction to ensure atomicity
    let cancellationResult;
    let updatedOrderStatus: string | null = null;
    let caseResult: { id: string; caseNumber: string } | null = null; // Declare outside transaction

    try {
      cancellationResult = await prisma.$transaction(
        async (tx) => {
          // Create cancellation record
          const cancellation = await tx.orderCancellation.create({
            data: {
              orderId: order.id,
              refundType,
              refundAmount,
              reason: reason || null,
            },
          });

          // Update order status - use explicit enum value
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'cancelled' as const,
            },
            select: {
              id: true,
              status: true,
              pickupCode: true,
            },
          });

          updatedOrderStatus = updatedOrder.status;

          logger.info(
            {
              orderId: order.id,
              pickupCode: order.pickupCode,
              oldStatus: order.status,
              newStatus: updatedOrder.status,
              transactionId: cancellation.id,
            },
            'Order status updated to cancelled in transaction'
          );

          // If converting to credits, add credits to user account
          if (refundType === 'CONVERT_TO_CREDITS') {
            logger.info(
              {
                userId: user.id,
                userEmail: user.email,
                refundAmount,
                orderId: order.id,
              },
              'Starting credit addition process'
            );

            // Get or create user credit record
            let userCredit = await tx.userCredit.findUnique({
              where: { userId: user.id },
            });

            logger.info(
              {
                userId: user.id,
                existingCredit: userCredit
                  ? {
                      id: userCredit.id,
                      balance: userCredit.balance,
                    }
                  : null,
              },
              'User credit record check'
            );

            if (!userCredit) {
              userCredit = await tx.userCredit.create({
                data: {
                  userId: user.id,
                  balance: 0,
                },
              });
              logger.info(
                {
                  userId: user.id,
                  creditId: userCredit.id,
                  initialBalance: userCredit.balance,
                },
                'Created new user credit record'
              );
            }

            // Add credits
            const updatedCredit = await tx.userCredit.update({
              where: { userId: user.id },
              data: {
                balance: {
                  increment: refundAmount,
                },
              },
              select: {
                id: true,
                userId: true,
                balance: true,
              },
            });

            logger.info(
              {
                userId: user.id,
                refundAmount,
                oldBalance: userCredit.balance,
                newBalance: updatedCredit.balance,
                creditId: updatedCredit.id,
              },
              'Credits added successfully in transaction'
            );

            // Create credit transaction
            const creditTransaction = await tx.creditTransaction.create({
              data: {
                userId: user.id,
                orderId: order.id,
                amount: refundAmount,
                type: CreditTransactionType.REFUND_TO_CREDITS,
                description: `Reembolso por cancelación de pedido #${order.pickupCode}`,
              },
            });

            logger.info(
              {
                transactionId: creditTransaction.id,
                userId: user.id,
                amount: refundAmount,
                orderId: order.id,
              },
              'Credit transaction record created'
            );

            // Mark cancellation as refunded
            await tx.orderCancellation.update({
              where: { id: cancellation.id },
              data: {
                refundedAt: new Date(),
              },
            });

            logger.info(
              {
                cancellationId: cancellation.id,
                orderId: order.id,
              },
              'Cancellation marked as refunded'
            );
          }

          // If refunding to payment method, create a case
          if (refundType === 'REFUND_TO_PAYMENT_METHOD') {
            try {
              logger.info(
                {
                  orderId: order.id,
                  userId: user.id,
                  restaurantId: order.restaurantId,
                  refundAmount,
                },
                'Attempting to create case for refund request'
              );

              const caseNumber = await generateCaseNumber();
              const customerName =
                order.student.firstName && order.student.lastName
                  ? `${order.student.firstName} ${order.student.lastName}`
                  : order.student.email;

              logger.info(
                {
                  caseNumber,
                  orderId: order.id,
                  userId: user.id,
                  restaurantId: order.restaurantId,
                  caseType: CaseType.REFUND_REQUEST,
                  caseStatus: CaseStatus.OPEN,
                },
                'Case data prepared, attempting to create case in database'
              );

              const createdCase = await tx.case.create({
                data: {
                  caseNumber,
                  orderId: order.id,
                  userId: user.id,
                  restaurantId: order.restaurantId,
                  type: CaseType.REFUND_REQUEST,
                  status: CaseStatus.OPEN,
                  title: `Solicitud de Reembolso - Pedido #${order.pickupCode}`,
                  description:
                    reason ||
                    `Reembolso solicitado para el pedido #${order.pickupCode} del restaurante ${order.restaurant.name}. Monto: $${(refundAmount / 100).toLocaleString('es-CO')}.`,
                },
              });

              // Assign to variable outside transaction scope
              caseResult = {
                id: createdCase.id,
                caseNumber: createdCase.caseNumber,
              };

              logger.info(
                {
                  caseId: createdCase.id,
                  caseNumber: createdCase.caseNumber,
                  orderId: order.id,
                  userId: user.id,
                  restaurantId: order.restaurantId,
                },
                'Case created successfully for refund request'
              );
            } catch (caseError: any) {
              // Enhanced error logging
              const errorDetails = {
                error: caseError?.message || String(caseError),
                errorName: caseError?.name,
                errorCode: caseError?.code,
                errorMeta: caseError?.meta,
                stack: caseError?.stack,
                orderId: order.id,
                userId: user.id,
                restaurantId: order.restaurantId,
                refundType,
                caseNumberAttempt: caseError?.caseNumber || 'N/A',
              };

              logger.error(
                errorDetails,
                'CRITICAL: Failed to create case for refund request - will continue with cancellation but case creation failed'
              );

              // Don't fail the entire transaction if case creation fails
              // The cancellation should still proceed, but we won't have a case to track
              // Log the error but continue - we'll handle this gracefully
              // Note: caseResult will remain null, so notifications won't reference a case
              caseResult = null; // Explicitly set to null on error
            }
          }

          // Create notification for superadmin
          try {
            // Get all superadmins to send notifications
            const superadmins = await tx.user.findMany({
              where: {
                role: 'superadmin',
                isActive: true,
              },
              select: {
                id: true,
                email: true,
              },
            });

            // Get customer name
            const customerName =
              order.student.firstName && order.student.lastName
                ? `${order.student.firstName} ${order.student.lastName}`
                : order.student.email;

            // Get contact info
            const contactInfo =
              order.student.phoneNumber || order.student.email;

            // Get payment method display name
            let paymentMethodDisplay = 'No especificado';
            if (refundType === 'CONVERT_TO_CREDITS') {
              paymentMethodDisplay = 'Créditos del sistema';
            } else if (order.payment?.method) {
              const methodMap: Record<string, string> = {
                CARD: 'Tarjeta de crédito/débito',
                PSE: 'PSE',
                NEQUI: 'Nequi',
                DAVIPLATA: 'Daviplata',
              };
              paymentMethodDisplay =
                methodMap[order.payment.method] || order.payment.method;
            } else {
              paymentMethodDisplay = 'Método de pago original';
            }

            // Determine notification type and message based on refund type
            let notificationType = 'ORDER_CANCELLATION';
            let notificationTitle = 'Pedido Cancelado';
            let notificationMessage = `El pedido #${order.pickupCode} del restaurante ${order.restaurant.name} ha sido cancelado por ${customerName} (${contactInfo}). Monto: $${(order.totalAmount / 100).toLocaleString('es-CO')}. Reembolso: ${paymentMethodDisplay}.`;

            if (refundType === 'REFUND_TO_PAYMENT_METHOD' && caseResult) {
              // Use REFUND_REQUEST instead of CASE_OPENED (which doesn't exist in DB)
              notificationType = 'REFUND_REQUEST';
              notificationTitle = 'Caso Abierto - Reembolso Solicitado';
              notificationMessage = `El pedido #${order.pickupCode} del restaurante ${order.restaurant.name} fue cancelado por ${customerName} (${contactInfo}) y se abrió un caso de reembolso. Caso #${caseResult?.caseNumber || 'N/A'}. Monto: $${(order.totalAmount / 100).toLocaleString('es-CO')}.`;
            } else if (refundType === 'CONVERT_TO_CREDITS') {
              notificationType = 'ORDER_CANCELLATION'; // Use ORDER_CANCELLATION instead of ORDER_CANCELLED_CREDITS to avoid enum issues
              notificationTitle = 'Pedido Cancelado - Reembolso en Créditos';
              notificationMessage = `El pedido #${order.pickupCode} del restaurante ${order.restaurant.name} fue cancelado por ${customerName} (${contactInfo}). El reembolso se realizó en créditos. Monto: $${(order.totalAmount / 100).toLocaleString('es-CO')}.`;
            }

            // Create notification for each superadmin
            if (superadmins.length > 0) {
              for (const superadmin of superadmins) {
                await tx.notification.create({
                  data: {
                    type: notificationType as any,
                    title: notificationTitle,
                    message: notificationMessage,
                    userId: superadmin.id, // Assign to superadmin
                    metadata: {
                      orderId: order.id,
                      restaurantId: order.restaurantId,
                      restaurantName: order.restaurant.name,
                      userId: user.id,
                      userEmail: user.email,
                      customerName,
                      contactInfo,
                      paymentMethod: order.payment?.method || null,
                      paymentMethodDisplay,
                      refundType,
                      refundAmount,
                      reason: reason || null,
                      ...(caseResult && {
                        caseId: caseResult?.id,
                        caseNumber: caseResult?.caseNumber,
                      }),
                    } as Prisma.InputJsonValue,
                  },
                });
              }
              logger.info(
                {
                  orderId: order.id,
                  superadminCount: superadmins.length,
                },
                'Superadmin notifications created for order cancellation'
              );
            } else {
              logger.warn(
                { orderId: order.id },
                'No superadmins found to notify about order cancellation'
              );
            }
          } catch (notifError: any) {
            // Log but don't fail transaction - notification system may not be set up
            const errorCode = notifError?.code || 'UNKNOWN';
            const errorMessage = notifError?.message || String(notifError);
            logger.error(
              {
                error: errorMessage,
                errorCode,
                orderId: order.id,
                note: 'Notification creation failed but transaction will continue',
              },
              'Failed to create superadmin notification'
            );
            // Don't fail the transaction if notification fails
          }

          // Create notification for restaurant admin(s)
          if (order.restaurant.users && order.restaurant.users.length > 0) {
            try {
              // Get customer name
              const customerName =
                order.student.firstName && order.student.lastName
                  ? `${order.student.firstName} ${order.student.lastName}`
                  : order.student.email;

              // Get contact info
              const contactInfo =
                order.student.phoneNumber || order.student.email;

              // Get payment method display name
              let paymentMethodDisplay = 'No especificado';
              if (refundType === 'CONVERT_TO_CREDITS') {
                paymentMethodDisplay = 'Créditos del sistema';
              } else if (order.payment?.method) {
                const methodMap: Record<string, string> = {
                  CARD: 'Tarjeta de crédito/débito',
                  PSE: 'PSE',
                  NEQUI: 'Nequi',
                  DAVIPLATA: 'Daviplata',
                };
                paymentMethodDisplay =
                  methodMap[order.payment.method] || order.payment.method;
              } else {
                paymentMethodDisplay = 'Método de pago original';
              }

              const restaurantAdmins = order.restaurant.users;
              for (const admin of restaurantAdmins) {
                await tx.notification.create({
                  data: {
                    type: 'ORDER_CANCELLATION',
                    title: 'Pedido Cancelado',
                    message: `El pedido #${order.pickupCode} de ${order.restaurant.name} ha sido cancelado por ${customerName} (${contactInfo}). Reembolso: ${paymentMethodDisplay}.`,
                    userId: admin.id, // Assign to restaurant admin
                    metadata: {
                      orderId: order.id,
                      restaurantId: order.restaurantId,
                      userId: user.id,
                      userEmail: user.email,
                      customerName,
                      contactInfo,
                      paymentMethod: order.payment?.method || null,
                      paymentMethodDisplay,
                      refundType,
                      refundAmount,
                      reason: reason || null,
                    } as Prisma.InputJsonValue,
                  },
                });
              }
              logger.info(
                {
                  orderId: order.id,
                  adminCount: restaurantAdmins.length,
                },
                'Restaurant admin notifications created for order cancellation'
              );
            } catch (notifError: any) {
              // Log but don't fail transaction - notification system may not be set up
              const errorCode = notifError?.code || 'UNKNOWN';
              const errorMessage = notifError?.message || String(notifError);
              logger.error(
                {
                  error: errorMessage,
                  errorCode,
                  orderId: order.id,
                  note: 'Restaurant admin notification creation failed but transaction will continue',
                },
                'Failed to create restaurant admin notification'
              );
              // Don't fail the transaction if notification fails
            }
          }

          return cancellation;
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      // Verify transaction completed successfully
      if (!cancellationResult) {
        throw new Error('Transaction completed but returned no result');
      }

      logger.info(
        {
          orderId: order.id,
          cancellationId: cancellationResult.id,
          updatedStatus: updatedOrderStatus,
        },
        'Transaction completed successfully'
      );

      // Send WhatsApp notifications for refund requests (after transaction completes)
      if (refundType === 'REFUND_TO_PAYMENT_METHOD' && caseResult) {
        const caseNumber =
          (caseResult as { caseNumber?: string } | null)?.caseNumber || 'N/A';
        try {
          const customerName =
            order.student.firstName && order.student.lastName
              ? `${order.student.firstName} ${order.student.lastName}`
              : order.student.email;

          const whatsappMessage = `🔔 *Nuevo Caso de Reembolso*

Se ha cancelado un pedido con solicitud de reembolso al método de pago original.

📋 *Detalles del Caso:*
• Caso #${caseNumber}
• Pedido #${order.pickupCode}
• Restaurante: ${order.restaurant.name}
• Cliente: ${customerName}
• Monto: $${(order.totalAmount / 100).toLocaleString('es-CO')}
• Motivo: ${reason || 'No especificado'}

Por favor revisar el caso en el panel de superadmin.`;

          // Send to both phone numbers
          const phoneNumbers = ['+57 3225725739', '+573173279993'];

          for (const phoneNumber of phoneNumbers) {
            try {
              await sendWhatsAppMessage(phoneNumber, whatsappMessage);
              logger.info(
                {
                  phoneNumber,
                  caseNumber,
                  orderId: order.id,
                },
                'WhatsApp notification sent for refund case'
              );
            } catch (whatsappError) {
              logger.error(
                {
                  error: whatsappError,
                  phoneNumber,
                  caseNumber,
                  orderId: order.id,
                },
                'Failed to send WhatsApp notification for refund case'
              );
              // Don't fail the whole process if WhatsApp fails
            }
          }
        } catch (whatsappError) {
          logger.error(
            {
              error: whatsappError,
              orderId: order.id,
              caseNumber,
            },
            'Failed to send WhatsApp notifications for refund case'
          );
          // Don't fail the whole process if WhatsApp fails
        }
      }

      // Transaction completed successfully - prepare success response
      // Note: Even if verification fails, we return success since transaction completed
      let finalOrderStatus = updatedOrderStatus || 'cancelled';
      let finalPickupCode = order.pickupCode;

      // Try to verify order status (non-critical - transaction already completed)
      try {
        const finalOrder = await prisma.order.findUnique({
          where: { id: id },
          select: {
            id: true,
            status: true,
            pickupCode: true,
          },
        });

        if (finalOrder) {
          finalOrderStatus = finalOrder.status;
          finalPickupCode = finalOrder.pickupCode;

          // Double-check status matches what we set
          if (finalOrder.status !== 'cancelled') {
            logger.warn(
              {
                orderId: id,
                expectedStatus: 'cancelled',
                actualStatus: finalOrder.status,
                transactionStatus: updatedOrderStatus,
              },
              'Order status mismatch after transaction - attempting correction'
            );
            // Try to update again outside transaction as fallback
            try {
              await prisma.order.update({
                where: { id: id },
                data: { status: 'cancelled' as const },
              });
              finalOrderStatus = 'cancelled';
              logger.info(
                { orderId: id },
                'Order status corrected via fallback update'
              );
            } catch (fallbackError) {
              logger.warn(
                { error: fallbackError, orderId: id },
                'Failed to correct order status via fallback (non-critical)'
              );
            }
          }
        }
      } catch (verifyError) {
        logger.warn(
          { error: verifyError, orderId: id },
          'Failed to verify order status after cancellation (non-critical)'
        );
        // Continue with success response - transaction already completed
      }

      logger.info(
        {
          orderId: id,
          pickupCode: finalPickupCode,
          finalStatus: finalOrderStatus,
          transactionStatus: updatedOrderStatus,
          refundType,
          refundAmount,
        },
        'Order cancellation completed successfully'
      );

      // Restore inventory for all products in cancelled order
      if (order.items && order.items.length > 0) {
        try {
          for (const item of order.items) {
            await restoreInventory(item.productId, item.quantity);
          }
          logger.info(
            {
              orderId: id,
              itemsCount: order.items.length,
            },
            'Inventory restored for cancelled order'
          );
        } catch (inventoryError) {
          logger.error(
            {
              error: inventoryError,
              orderId: id,
            },
            'Failed to restore inventory (non-critical)'
          );
          // Don't fail the cancellation if inventory restore fails
        }
      }

      // Verify credits (non-critical - transaction already completed)
      if (refundType === 'CONVERT_TO_CREDITS') {
        try {
          const finalUserCredit = await prisma.userCredit.findUnique({
            where: { userId: user.id },
          });

          const creditTransaction = await prisma.creditTransaction.findFirst({
            where: {
              userId: user.id,
              orderId: id,
              type: CreditTransactionType.REFUND_TO_CREDITS,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          logger.info(
            {
              userId: user.id,
              userEmail: user.email,
              refundAmount,
              finalBalance: finalUserCredit?.balance,
              creditRecordExists: !!finalUserCredit,
              transactionExists: !!creditTransaction,
              transactionAmount: creditTransaction?.amount,
              orderId: id,
            },
            'Credits verification after cancellation'
          );

          if (!finalUserCredit) {
            logger.warn(
              {
                userId: user.id,
                orderId: id,
              },
              'UserCredit record not found after cancellation (may need investigation)'
            );
          } else if (finalUserCredit.balance < refundAmount) {
            logger.warn(
              {
                userId: user.id,
                refundAmount,
                finalBalance: finalUserCredit.balance,
                orderId: id,
              },
              'Credits balance lower than expected (may need investigation)'
            );
          }
        } catch (creditVerifyError) {
          logger.warn(
            { error: creditVerifyError, orderId: id },
            'Failed to verify credits after cancellation (non-critical)'
          );
          // Continue with success response - transaction already completed
        }
      }

      // Always return success if transaction completed
      return NextResponse.json({
        success: true,
        data: {
          cancellation: cancellationResult,
          orderId: id,
          orderStatus: finalOrderStatus,
          pickupCode: finalPickupCode,
          refundType,
          refundAmount,
          caseNumber:
            (caseResult as { caseNumber?: string } | null)?.caseNumber || null, // Include case number if case was created
          message:
            refundType === 'CONVERT_TO_CREDITS'
              ? 'Pedido cancelado. Los créditos han sido agregados a tu cuenta.'
              : 'Pedido cancelado. El reembolso se procesará en un plazo de hasta 15 días hábiles.',
        },
      });
    } catch (transactionError) {
      // If transaction failed, log and rethrow to outer catch
      logger.error(
        {
          error: transactionError,
          orderId: id,
          transactionErrorType:
            transactionError instanceof Error
              ? transactionError.message
              : String(transactionError),
        },
        'Transaction failed during order cancellation'
      );
      throw transactionError;
    }
  } catch (error: any) {
    // Log detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = error?.details || error?.code || undefined;

    logger.error(
      {
        error: errorMessage,
        errorStack,
        errorDetails,
        orderId: id || 'unknown',
        errorType: error?.constructor?.name,
      },
      'Error cancelling order'
    );

    console.error('Error cancelling order:', {
      message: errorMessage,
      stack: errorStack,
      details: errorDetails,
      orderId: id || 'unknown',
    });

    // Always return a valid JSON response
    return NextResponse.json(
      {
        success: false,
        error: 'Error al cancelar el pedido. Por favor intenta de nuevo.',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
