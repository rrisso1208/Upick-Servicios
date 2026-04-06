/**
 * Restaurant Commission Calculation (Simplified)
 *
 * This module provides a simplified commission calculation system
 * that uses the commission_percentage field directly on Restaurant.
 *
 * This is separate from the complex CommissionPolicy system to provide
 * a simpler, more direct approach for basic commission tracking.
 */

import { Decimal } from 'decimal.js';
import { prisma } from './db';
import logger from './logger';

/**
 * Calculate commission for an order using restaurant's commission percentage
 * Includes IVA (19%) on the commission amount
 *
 * Formula:
 * 1. Comisión de la Plataforma = Ventas Brutas * (commissionPercentage / 100)
 * 2. IVA sobre la Comisión = Comisión de la Plataforma * 0.19
 * 3. Total a Transferir = Ventas Brutas - Comisión de la Plataforma - IVA sobre la Comisión
 *
 * @param orderTotal - Total order amount in cents (what the user paid)
 * @param commissionPercentage - Commission percentage (e.g., 5.0 for 5%)
 * @returns Object with commission amount, IVA amount, and net amount for restaurant
 */


export type CommissionIvaPayer = 'RESTAURANT' | 'PLATFORM';

export function calculateRestaurantCommission(
  orderTotal: number,
  commissionPercentage: number | Decimal,
  commissionIvaPayer: CommissionIvaPayer = 'RESTAURANT'
): {
  platformCommissionAmount: number;
  ivaOnCommission: number;
  netAmountForRestaurant: number;
} {
  const commissionRate = new Decimal(commissionPercentage).div(100); // Convert percentage to decimal (5% -> 0.05)

  const commissionAmount = new Decimal(orderTotal)
    .mul(commissionRate)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  // Calculate IVA (19%) on the commission
  const ivaOnCommission = new Decimal(commissionAmount)
    .mul(0.19)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  // Neto depende de quién paga el IVA
  // - RESTAURANT: se descuenta comisión + IVA
  // - PLATFORM: solo se descuenta la comisión (Upick asume IVA)
  const netAmount =
    commissionIvaPayer === 'PLATFORM'
      ? orderTotal - commissionAmount
      : orderTotal - commissionAmount - ivaOnCommission;

  return {
    platformCommissionAmount: commissionAmount,
    ivaOnCommission,
    netAmountForRestaurant: netAmount,
  };
}

/**
 * Calculate and save commission for an order when it's marked as paid
 *
 * This should be called when an order status changes to 'paid'
 *
 * @param orderId - Order ID
 */
export async function calculateAndSaveOrderCommission(
  orderId: string
): Promise<void> {
  try {
    // Get order with restaurant
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          select: {
            id: true,
            commissionPercentage: true,
            commissionIvaPayer: true,
          },
        },
      },
    });

    if (!order) {
      logger.error({ orderId }, 'Order not found for commission calculation');
      return;
    }

    // Only calculate for paid orders
    if (order.status !== 'paid') {
      logger.warn(
        { orderId, status: order.status },
        'Skipping commission calculation - order is not paid'
      );
      return;
    }

    // Skip if already calculated
    if (
      order.platformCommissionAmount !== null &&
      order.netAmountForRestaurant !== null
    ) {
      logger.info({ orderId }, 'Commission already calculated for this order');
      return;
    }

    // Calculate commission
    // Note: Uses order.totalAmount (full order value) regardless of payment method
    // (credits, Wompi, or combination). This ensures commission is calculated
    // on the full transaction value, not just the Wompi payment amount.
    const { platformCommissionAmount, ivaOnCommission, netAmountForRestaurant } =
      calculateRestaurantCommission(
        order.totalAmount,
        order.restaurant.commissionPercentage,
        order.restaurant.commissionIvaPayer as CommissionIvaPayer
      );

    // Update order with commission data
    // Note: ivaOnCommission is calculated on-the-fly in metrics, not stored
    await prisma.order.update({
      where: { id: orderId },
      data: {
        platformCommissionAmount,
        netAmountForRestaurant,
      },
    });

    logger.info(
      {
        orderId,
        orderTotal: order.totalAmount,
        commissionPercentage: order.restaurant.commissionPercentage.toString(),
        platformCommissionAmount,
        netAmountForRestaurant,
      },
      'Calculated and saved order commission'
    );
  } catch (error) {
    logger.error(
      { error, orderId },
      'Failed to calculate and save order commission'
    );
    throw error;
  }
}
