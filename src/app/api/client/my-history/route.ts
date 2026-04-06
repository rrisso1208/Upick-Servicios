import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../lib/student-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedStudent(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const [services, tables, tickets] = await Promise.all([
      prisma.serviceReservation.findMany({
        where: { userId: user.id },
        include: {
          slot: {
            include: {
              serviceOffering: {
                include: {
                  restaurant: { select: { name: true } }
                }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tableReservation.findMany({
        where: { userId: user.id },
        include: {
          table: {
            include: { restaurant: { select: { name: true } } },
          },
          event: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticket.findMany({
        where: { userId: user.id },
        include: {
          event: {
            include: { restaurant: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        services,
        tables,
        tickets,
      },
    });
  } catch (error) {
    console.error('Error fetching vertical history:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
