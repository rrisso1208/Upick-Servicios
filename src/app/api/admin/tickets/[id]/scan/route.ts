import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
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

    const ticket = await prisma.ticket.findFirst({
      where: { id },
      include: { event: { select: { restaurantId: true } } },
    });

    if (!ticket || ticket.event.restaurantId !== restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Boleta no encontrada' },
        { status: 404 }
      );
    }

    if (ticket.status !== 'PAID' && ticket.status !== 'USED') {
      return NextResponse.json(
        { success: false, error: 'La boleta no está pagada' },
        { status: 400 }
      );
    }

    if (ticket.usedAt) {
      return NextResponse.json(
        { success: false, error: 'Esta entrada ya fue utilizada' },
        { status: 409 }
      );
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        usedAt: new Date(),
        status: 'USED',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al escanear boleta' },
      { status: 500 }
    );
  }
}
