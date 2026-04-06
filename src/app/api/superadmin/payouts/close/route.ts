import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { restaurantId, periodStart, periodEnd } = body;

    if (!restaurantId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // 1. Check if there's already an overlapping cycle for this restaurant
    const existingCycle = await prisma.payoutCycle.findFirst({
      where: {
        restaurantId,
        OR: [
          {
            periodStart: { lte: endDate },
            periodEnd: { gte: startDate },
          },
        ],
      },
    });

    if (existingCycle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Period overlaps with an existing payout cycle',
        },
        { status: 400 }
      );
    }

    // 2. Aggregate OrderFinance data
    const aggregates = await prisma.orderFinance.aggregate({
      where: {
        order: {
          restaurantId,
          status: { in: ['delivered', 'paid', 'ready'] }, // Only completed orders
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        baseAmount: true,
        taxAmount: true,
        tipAmount: true,
        discountAmount: true,
        commissionAmount: true,
        gatewayFeeAmount: true,
        netForRestaurant: true,
      },
    });

    const grossSales =
      (aggregates._sum.baseAmount || 0) + (aggregates._sum.taxAmount || 0);

    // 3. Create PayoutCycle
    const payoutCycle = await prisma.payoutCycle.create({
      data: {
        restaurantId,
        periodStart: startDate,
        periodEnd: endDate,
        status: 'closed', // Starts as closed, ready for invoicing
        grossSales,
        taxTotal: aggregates._sum.taxAmount || 0,
        tipsTotal: aggregates._sum.tipAmount || 0,
        discountsTotal: aggregates._sum.discountAmount || 0,
        commissionTotal: aggregates._sum.commissionAmount || 0,
        gatewayFeesTotal: aggregates._sum.gatewayFeeAmount || 0,
        netToRestaurant: aggregates._sum.netForRestaurant || 0,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { payoutCycle } });
  } catch (error) {
    console.error('Error closing payout cycle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to close payout cycle' },
      { status: 500 }
    );
  }
}
