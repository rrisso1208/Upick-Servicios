import { NextRequest, NextResponse } from 'next/server';
import { TableReservationStatus } from '@prisma/client';
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

    const reservation = await prisma.tableReservation.findFirst({
      where: { id, userId: user.id },
      include: {
        table: {
          include: {
            restaurant: { select: { id: true, name: true, slug: true } },
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            bannerUrl: true,
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

    return NextResponse.json({
      success: true,
      data: {
        reservation: {
          id: reservation.id,
          status: reservation.status,
          qrCode: reservation.qrCode,
          guestCount: reservation.guestCount,
          notes: reservation.notes,
          createdAt: reservation.createdAt,
        },
        tableName: reservation.table.name,
        restaurant: reservation.table.restaurant,
        event: reservation.event,
        canShowQr:
          reservation.status === TableReservationStatus.CONFIRMED &&
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
