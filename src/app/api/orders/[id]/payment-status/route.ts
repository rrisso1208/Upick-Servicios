/**
 * GET /api/orders/:id/payment-status
 * Get payment status for an order (public endpoint for payment result page)
 * This endpoint allows checking payment status without full authentication
 * to handle cases where session expires during payment process
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get order with minimal info (payment status only)
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        payment: {
          select: {
            id: true,
            status: true,
            providerRef: true,
            declinedReason: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Return payment status without requiring authentication
    // This is safe because we only return payment status, not sensitive order details
    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        payment: order.payment,
        restaurant: order.restaurant,
      },
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
