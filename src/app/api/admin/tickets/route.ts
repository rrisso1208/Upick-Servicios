import { NextRequest, NextResponse } from 'next/server';
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
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId requerido' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, restaurantId },
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const soldCount = tickets
      .filter((t) => t.status === 'PAID' || t.status === 'USED')
      .reduce((sum, t) => sum + t.quantity, 0);

    return NextResponse.json({
      success: true,
      data: { tickets, event, soldCount },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar boletas' },
      { status: 500 }
    );
  }
}
