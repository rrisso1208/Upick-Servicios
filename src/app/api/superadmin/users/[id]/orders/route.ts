/**
 * GET /api/superadmin/users/[id]/orders - Get user order history
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '20';

    const orders = await prisma.order.findMany({
      where: {
        studentId: id,
        status: {
          notIn: ['awaiting_payment', 'payment_failed'],
        },
      },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
        place: {
          select: {
            name: true,
          },
        },
        payment: {
          select: {
            status: true,
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
    });

    const total = await prisma.order.count({
      where: {
        studentId: id,
        status: {
          notIn: ['awaiting_payment', 'payment_failed'],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { orders, total },
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial de pedidos' },
      { status: 500 }
    );
  }
}
