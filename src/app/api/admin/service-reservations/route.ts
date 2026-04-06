import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { type: true },
    });
    if (restaurant?.type !== 'SERVICE') {
      return NextResponse.json(
        { success: false, error: 'Este negocio no es tipo servicio' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    const where: {
      slot: { serviceOffering: { restaurantId: string } };
      status?: ReservationStatus;
    } = {
      slot: { serviceOffering: { restaurantId } },
    };

    if (
      statusParam &&
      Object.values(ReservationStatus).includes(statusParam as ReservationStatus)
    ) {
      where.status = statusParam as ReservationStatus;
    }

    const reservations = await prisma.serviceReservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        slot: {
          include: {
            serviceOffering: { select: { id: true, name: true, durationMin: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { reservations } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar reservas' },
      { status: 500 }
    );
  }
}
