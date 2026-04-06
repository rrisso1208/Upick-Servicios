import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status?: string };

    const reservation = await prisma.serviceReservation.findFirst({
      where: { id },
      include: {
        slot: {
          include: {
            serviceOffering: { select: { restaurantId: true } },
          },
        },
      },
    });

    if (
      !reservation ||
      reservation.slot.serviceOffering.restaurantId !== restaurantId
    ) {
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    if (status !== 'NO_SHOW') {
      return NextResponse.json(
        { success: false, error: 'Solo se admite marcar como NO_SHOW' },
        { status: 400 }
      );
    }

    const updated = await prisma.serviceReservation.update({
      where: { id },
      data: { status: ReservationStatus.NO_SHOW },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar reserva' },
      { status: 500 }
    );
  }
}
