import { NextRequest, NextResponse } from 'next/server';
import { TableReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      select: { id: true, restaurantId: true, date: true },
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const blocked = await prisma.tableReservation.findMany({
      where: {
        eventId,
        status: TableReservationStatus.CONFIRMED,
      },
      select: { tableId: true },
    });
    const blockedIds = new Set(blocked.map((b) => b.tableId));

    const tables = await prisma.table.findMany({
      where: {
        restaurantId: event.restaurantId,
        isActive: true,
        OR: [{ eventId: null }, { eventId }],
      },
      orderBy: { name: 'asc' },
    });

    const available = tables.filter((t) => !blockedIds.has(t.id));

    return NextResponse.json({
      success: true,
      data: { tables: available, event },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar mesas' },
      { status: 500 }
    );
  }
}
