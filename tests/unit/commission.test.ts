import { describe, it, expect, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculateOrderFinance } from '@/lib/commission';

describe('Commission Calculation', () => {
  it('should calculate 4% commission on subtotal + tax', async () => {
    const policy = {
      id: 'test-policy',
      rate: new Decimal('0.04'),
      scope: 'global' as const,
      type: 'fixed' as const,
    };

    const input = {
      baseAmount: 1000000, // $10,000
      taxAmount: 190000, // $1,900 (19% IVA)
      tipAmount: 100000, // $1,000
      discountAmount: 0,
      gatewayFeeAmount: 50000, // $500
    };

    const result = await calculateOrderFinance(input, policy);

    // Commission base = 1,000,000 + 190,000 = 1,190,000
    // Commission = 1,190,000 * 0.04 = 47,600
    expect(result.commissionAmount).toBe(47600);
    expect(result.commissionRateApplied.toString()).toBe('0.04');

    // Net for restaurant = 1,190,000 + 100,000 - 47,600 - 50,000 = 1,192,400
    expect(result.netForRestaurant).toBe(1192400);
  });

  it('should handle discounts correctly', async () => {
    const policy = {
      id: 'test-policy',
      rate: new Decimal('0.04'),
      scope: 'global' as const,
      type: 'fixed' as const,
    };

    const input = {
      baseAmount: 1000000,
      taxAmount: 190000,
      tipAmount: 0,
      discountAmount: 100000, // $1,000 discount
      gatewayFeeAmount: 50000,
    };

    const result = await calculateOrderFinance(input, policy);

    // Commission base = (1,000,000 - 100,000) + 190,000 = 1,090,000
    // Commission = 1,090,000 * 0.04 = 43,600
    expect(result.commissionAmount).toBe(43600);
  });
});

