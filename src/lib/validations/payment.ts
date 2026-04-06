import { z } from 'zod';

export const createPaymentSessionSchema = z.object({
  orderId: z.string().cuid(),
  method: z.enum(['PSE', 'CARD']),
});

export type CreatePaymentSessionInput = z.infer<
  typeof createPaymentSessionSchema
>;

