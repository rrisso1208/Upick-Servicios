import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.periodStart = {};
      if (dateFrom) where.periodStart.gte = new Date(dateFrom);
      if (dateTo) where.periodStart.lte = new Date(dateTo);
    }

    const payouts = await prisma.payoutCycle.findMany({
      where,
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
          },
        },
        invoices: {
          select: {
            id: true,
            number: true,
            status: true,
            pdfUrl: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: { payouts } });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
