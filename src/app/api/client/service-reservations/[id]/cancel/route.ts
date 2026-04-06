import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../../../lib/student-api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedStudent(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const reservation = await prisma.serviceReservation.findFirst({
      where: { id, userId: user.id },
      include: { slot: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar reservas confirmadas' },
        { status: 400 }
      );
    }

    const deadline = new Date(reservation.slot.startTime.getTime() - 60 * 60 * 1000);
    if (new Date() >= deadline) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No es posible cancelar con menos de 1 hora de anticipación',
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.serviceReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      }),
      prisma.timeSlot.update({
        where: { id: reservation.slotId },
        data: { isBooked: false },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al cancelar' },
      { status: 500 }
    );
  }
}
