import { z } from 'zod';

export const createOrderSchema = z.object({
  universityId: z.string().cuid(),
  restaurantId: z.string().cuid(),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().max(500).optional(),
        options: z
          .array(
            z.object({
              productOptionId: z.string().cuid(),
              priceDelta: z.number().int(),
            })
          )
          .optional(),
      })
    )
    .min(1),
  notes: z.string().max(1000).optional(),
  desiredSlot: z.string().datetime().optional(),
  couponCode: z.string().max(50).optional(), // Optional coupon code
  consentToSavePaymentMethod: z.boolean().optional().default(false), // Consentimiento Ley 1581
  orderType: z.enum(['eat_in', 'takeout']).optional().default('takeout'), // Order type: eat_in or takeout (deprecated, use serviceMode)
  serviceMode: z.enum(['eat_in', 'takeaway', 'internal_delivery']).optional().default('takeaway'), // Service mode
  deliveryPointId: z.string().cuid().optional(), // Delivery point ID for internal_delivery
  deliveryCost: z.number().int().min(0).optional().default(0), // Delivery cost in cents
  serviceFeeAmount: z.number().int().min(0).optional().default(0), // Service fee amount in cents
  customerPhone: z.string().max(20).optional(), // Customer phone for delivery
  creditsToUse: z.number().int().min(0).optional().default(0), // Credits to use in the order
  tableId: z.string().cuid().optional(), // Table ID for eat_in (especially in discotecas)
});

export const reserveSlotSchema = z.object({
  slotStart: z.string().datetime(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['in_progress', 'ready', 'delivered', 'cancelled']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ReserveSlotInput = z.infer<typeof reserveSlotSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
