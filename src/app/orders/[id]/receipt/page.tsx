/**
 * Order receipt page with realtime updates
 */

import { notFound } from 'next/navigation';
import { Header } from '../../../../components/layout/Header';
import { OrderReceiptClient } from './OrderReceiptClient';
import { prisma } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export default async function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let orderId: string;

  try {
    const paramsResolved = await params;
    orderId = paramsResolved.id;
  } catch (error) {
    logger.error({ error }, 'Error resolving params in receipt page');
    notFound();
  }

  try {
    logger.info({ orderId }, 'Fetching order for receipt page');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        pickupCode: true,
        pickupSlotStart: true,
        pickupSlotEnd: true,
        totalAmount: true,
        discountAmount: true,
        deliveryCost: true,
        serviceFeeAmount: true,
        serviceMode: true,
        status: true,
        createdAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
        deliveryPoint: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                promotionPrice: true,
              },
            },
            options: {
              include: {
                productOption: {
                  select: {
                    name: true,
                    group: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            providerRef: true,
            declinedReason: true,
          },
        },
      },
    });

    if (!order) {
      logger.warn({ orderId }, 'Order not found for receipt page');
      notFound();
    }

    logger.info(
      { orderId, status: order.status, hasPayment: !!order.payment },
      'Order found for receipt page'
    );

    // Serialize dates to strings for client component
    const serializedOrder = {
      ...order,
      pickupSlotStart: order.pickupSlotStart.toISOString(),
      pickupSlotEnd: order.pickupSlotEnd.toISOString(),
      createdAt: order.createdAt.toISOString(),
    };

    return (
      <>
        <Header title="Comprobante" showBack />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <OrderReceiptClient order={serializedOrder as any} />
        </main>
      </>
    );
  } catch (error) {
    // Log error but don't expose details in production
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      {
        error: errorMessage,
        orderId,
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error loading receipt page'
    );

    // In production, show notFound instead of throwing to avoid exposing error details
    if (process.env.NODE_ENV === 'production') {
      notFound();
    }

    // In development, throw to see the actual error
    throw error;
  }
}
