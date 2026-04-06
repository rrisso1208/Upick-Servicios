import { NextRequest, NextResponse } from 'next/server';
import { TableReservationStatus } from '@prisma/client';
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
    if (restaurant?.type !== 'DISCOTECA') {
      return NextResponse.json(
        { success: false, error: 'Este negocio no es tipo discoteca' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const statusParam = searchParams.get('status');

    const where: {
      table: { restaurantId: string };
      eventId?: string | null;
      status?: TableReservationStatus;
    } = {
      table: { restaurantId },
    };

    if (eventId) {
      where.eventId = eventId;
    }
    if (
      statusParam &&
      Object.values(TableReservationStatus).includes(
        statusParam as TableReservationStatus
      )
    ) {
      where.status = statusParam as TableReservationStatus;
    }

    const reservations = await prisma.tableReservation.findMany({
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
        table: { select: { id: true, name: true, capacity: true } },
        event: { select: { id: true, name: true, date: true } },
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
