import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../../lib/student-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
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
      include: {
        slot: {
          include: {
            serviceOffering: {
              include: {
                restaurant: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    const so = reservation.slot.serviceOffering;

    return NextResponse.json({
      success: true,
      data: {
        reservation: {
          id: reservation.id,
          status: reservation.status,
          qrCode: reservation.qrCode,
          notes: reservation.notes,
          createdAt: reservation.createdAt,
        },
        serviceName: so.name,
        restaurant: so.restaurant,
        slot: {
          startTime: reservation.slot.startTime,
          endTime: reservation.slot.endTime,
        },
        canShowQr:
          reservation.status === ReservationStatus.CONFIRMED &&
          !!reservation.qrCode,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la reserva' },
      { status: 500 }
    );
  }
}
