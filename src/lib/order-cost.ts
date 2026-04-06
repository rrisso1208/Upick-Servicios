/**
 * Order cost calculation utilities
 * Handles calculation of subtotal, service fee, delivery cost, and total
 */

export interface OrderCostBreakdown {
  subtotal: number; // Suma de productos (en centavos)
  serviceFee: number; // Costo de servicio (en centavos)
  deliveryCost: number; // Costo de domicilio (en centavos)
  total: number; // Total a pagar (en centavos)
}

export interface RestaurantFeeConfig {
  freeFeeThreshold: number; // Monto mínimo para que el service fee sea gratis (en centavos)
  lowOrderFee: number; // Costo del service fee si no se cumple el mínimo (en centavos)
  deliveryFee: number; // Costo de domicilio (en centavos)
}

/**
 * Calculate order cost breakdown
 * @param items - Array of items with unitPrice, quantity, and options
 * @param config - Restaurant fee configuration
 * @param serviceMode - Service mode (eat_in, takeaway, internal_delivery)
 * @returns Order cost breakdown
 */
export function calculateOrderCost(
  items: Array<{
    unitPrice: number;
    quantity: number;
    options?: Array<{ priceDelta: number }>;
  }>,
  config: RestaurantFeeConfig,
  serviceMode: 'eat_in' | 'takeaway' | 'internal_delivery' = 'takeaway'
): OrderCostBreakdown {
  // Calculate subtotal (sum of all items and options)
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.unitPrice * item.quantity;
    const optionsPrice =
      (item.options || []).reduce(
        (optSum, opt) => optSum + opt.priceDelta * item.quantity,
        0
      ) || 0;
    return sum + itemPrice + optionsPrice;
  }, 0);

  // Calculate service fee
  // If subtotal >= threshold, fee is 0, otherwise it's lowOrderFee
  const serviceFee =
    config.freeFeeThreshold > 0 && subtotal < config.freeFeeThreshold
      ? config.lowOrderFee
      : 0;

  // Calculate delivery cost
  // Only applies to internal_delivery service mode
  const deliveryCost =
    serviceMode === 'internal_delivery' ? config.deliveryFee : 0;

  // Calculate total
  const total = subtotal + serviceFee + deliveryCost;

  return {
    subtotal,
    serviceFee,
    deliveryCost,
    total,
  };
}

/**
 * Calculate remaining amount to reach free service fee threshold
 * @param currentTotal - Current subtotal (en centavos)
 * @param threshold - Free fee threshold (en centavos)
 * @returns Remaining amount in centavos, or 0 if threshold is reached
 */
export function calculateRemainingForFreeFee(
  currentTotal: number,
  threshold: number
): number {
  if (threshold === 0 || currentTotal >= threshold) {
    return 0;
  }
  return threshold - currentTotal;
}
