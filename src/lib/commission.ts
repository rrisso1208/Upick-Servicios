/**
 * Commission Policy Resolution and Finance Calculation
 *
 * This module handles:
 * 1. Resolving the active commission policy based on scope priority
 * 2. Calculating financial breakdown for orders
 */

import { Decimal } from 'decimal.js';
import { prisma } from './db';
import { CommissionType, CommissionScope } from '@prisma/client';
import { env } from './env';
import logger from './logger';

export interface CommissionPolicyResolved {
  id: string;
  rate: Decimal;
  scope: CommissionScope;
  type: CommissionType;
}

export interface TierDefinition {
  minAmount: number;
  maxAmount: number | null;
  rate: number;
}

export interface FinanceInput {
  baseAmount: number; // Subtotal in cents
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  gatewayFeeAmount: number;
}

export interface FinanceResult {
  baseAmount: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  commissionRateApplied: Decimal;
  commissionAmount: number;
  gatewayFeeAmount: number;
  netForRestaurant: number;
  policyIdApplied: string;
}

/**
 * Resolve commission policy with priority: restaurant > university > global
 * Uses the effective_from/effective_to for temporal validity
 */
export async function resolveCommissionPolicy(
  restaurantId: string,
  placeId: string,
  capturedAt: Date
): Promise<CommissionPolicyResolved> {
  // Priority 1: Restaurant-specific policy
  const restaurantPolicy = await prisma.commissionPolicy.findFirst({
    where: {
      scope: 'restaurant',
      scopeRefId: restaurantId,
      isActive: true,
      effectiveFrom: { lte: capturedAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: capturedAt } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (restaurantPolicy) {
    const rate = await resolvePolicyRate(restaurantPolicy, restaurantId);
    logger.info(
      {
        policyId: restaurantPolicy.id,
        rate: rate.toString(),
        scope: 'restaurant',
      },
      'Resolved commission policy (restaurant)'
    );
    return {
      id: restaurantPolicy.id,
      rate,
      scope: restaurantPolicy.scope,
      type: restaurantPolicy.type,
    };
  }

  // Priority 2: Place-specific policy (university/place)
  const placePolicy = await prisma.commissionPolicy.findFirst({
    where: {
      scope: 'place',
      scopeRefId: placeId,
      isActive: true,
      effectiveFrom: { lte: capturedAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: capturedAt } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (placePolicy) {
    const rate = await resolvePolicyRate(placePolicy, restaurantId);
    logger.info(
      { policyId: placePolicy.id, rate: rate.toString(), scope: 'place' },
      'Resolved commission policy (place)'
    );
    return {
      id: placePolicy.id,
      rate,
      scope: placePolicy.scope,
      type: placePolicy.type,
    };
  }

  // Priority 3: Global policy
  const globalPolicy = await prisma.commissionPolicy.findFirst({
    where: {
      scope: 'global',
      scopeRefId: null,
      isActive: true,
      effectiveFrom: { lte: capturedAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: capturedAt } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (globalPolicy) {
    const rate = await resolvePolicyRate(globalPolicy, restaurantId);
    logger.info(
      { policyId: globalPolicy.id, rate: rate.toString(), scope: 'global' },
      'Resolved commission policy (global)'
    );
    return {
      id: globalPolicy.id,
      rate,
      scope: globalPolicy.scope,
      type: globalPolicy.type,
    };
  }

  // Fallback: use default from env
  const defaultRate = new Decimal(env.DEFAULT_COMMISSION_RATE);
  logger.warn(
    { defaultRate: defaultRate.toString() },
    'No commission policy found, using default'
  );

  // Create a default global policy on-the-fly if none exists
  const defaultPolicy = await prisma.commissionPolicy.create({
    data: {
      scope: 'global',
      type: 'fixed',
      rateFixed: defaultRate,
      effectiveFrom: new Date('2024-01-01'),
      isActive: true,
    },
  });

  return {
    id: defaultPolicy.id,
    rate: defaultRate,
    scope: 'global',
    type: 'fixed',
  };
}

/**
 * Resolve the rate from a policy (handles fixed and tiered)
 */
async function resolvePolicyRate(
  policy: {
    type: CommissionType;
    rateFixed: Decimal | null;
    tiersJson: unknown;
  },
  restaurantId: string
): Promise<Decimal> {
  if (policy.type === 'fixed') {
    return new Decimal(policy.rateFixed || '0.04');
  }

  // Tiered: determine rate based on restaurant's monthly sales
  if (policy.type === 'tiered') {
    const tiers = policy.tiersJson as TierDefinition[];
    if (!tiers || !Array.isArray(tiers)) {
      throw new Error('Invalid tiers configuration');
    }

    // Calculate current month sales for the restaurant
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const result = await prisma.orderFinance.aggregate({
      where: {
        order: {
          restaurantId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: {
            in: ['paid', 'in_progress', 'ready', 'delivered'],
          },
        },
      },
      _sum: {
        baseAmount: true,
        taxAmount: true,
      },
    });

    const monthlySales =
      (result._sum.baseAmount || 0) + (result._sum.taxAmount || 0);

    // Find applicable tier
    for (const tier of tiers) {
      if (
        monthlySales >= tier.minAmount &&
        (tier.maxAmount === null || monthlySales < tier.maxAmount)
      ) {
        return new Decimal(tier.rate);
      }
    }

    // Fallback to last tier or default
    return new Decimal(tiers[tiers.length - 1]?.rate || '0.04');
  }

  throw new Error(`Unknown commission type: ${policy.type}`);
}

/**
 * Calculate order finance breakdown
 *
 * Formula:
 * - commission_base = baseAmount + taxAmount (or just baseAmount, configurable)
 * - commission_amount = round(commission_base * commission_rate)
 * - net_for_restaurant = commission_base + tip_amount - commission_amount - gateway_fee_amount
 */
export async function calculateOrderFinance(
  input: FinanceInput,
  policy: CommissionPolicyResolved
): Promise<FinanceResult> {
  const { baseAmount, taxAmount, tipAmount, discountAmount, gatewayFeeAmount } =
    input;

  // Determine commission base (configurable: subtotal or subtotal+tax)
  const commissionBaseMode = env.COMMISSION_BASE_MODE;
  let commissionBase = baseAmount - discountAmount;

  if (commissionBaseMode === 'subtotal_plus_tax') {
    commissionBase += taxAmount;
  }

  // Calculate commission
  const commissionAmount = new Decimal(commissionBase)
    .mul(policy.rate)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  // Calculate net for restaurant
  const netForRestaurant =
    commissionBase + tipAmount - commissionAmount - gatewayFeeAmount;

  const result: FinanceResult = {
    baseAmount,
    taxAmount,
    tipAmount,
    discountAmount,
    commissionRateApplied: policy.rate,
    commissionAmount,
    gatewayFeeAmount,
    netForRestaurant,
    policyIdApplied: policy.id,
  };

  logger.info(
    {
      baseAmount,
      commissionBase,
      commissionRate: policy.rate.toString(),
      commissionAmount,
      netForRestaurant,
    },
    'Calculated order finance'
  );

  return result;
}

/**
 * Persist order finance to database
 */
export async function saveOrderFinance(
  orderId: string,
  finance: FinanceResult
): Promise<void> {
  await prisma.orderFinance.upsert({
    where: { orderId },
    create: {
      orderId,
      ...finance,
      commissionRateApplied: finance.commissionRateApplied,
    },
    update: {
      ...finance,
      commissionRateApplied: finance.commissionRateApplied,
      computedAt: new Date(),
    },
  });

  logger.info({ orderId }, 'Saved order finance');
}
