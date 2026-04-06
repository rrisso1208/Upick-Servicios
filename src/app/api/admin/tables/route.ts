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

    const where: { restaurantId: string; eventId?: string | null } = {
      restaurantId,
    };
    if (eventId === '') {
      where.eventId = null;
    } else if (eventId) {
      where.eventId = eventId;
    }

    const tables = await prisma.table.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { tables } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar mesas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, capacity, price, description, eventId, isActive = true } =
      body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const cap = Math.max(1, Math.floor(Number(capacity || 1)));

    let resolvedEventId: string | null = null;
    if (eventId) {
      const ev = await prisma.event.findFirst({
        where: { id: eventId, restaurantId },
      });
      if (!ev) {
        return NextResponse.json(
          { success: false, error: 'Evento no encontrado' },
          { status: 400 }
        );
      }
      resolvedEventId = ev.id;
    }

    const table = await prisma.table.create({
      data: {
        restaurantId,
        eventId: resolvedEventId,
        name: name.trim(),
        capacity: cap,
        price: price != null ? Math.round(Number(price)) : null,
        description:
          typeof description === 'string' ? description.trim() || null : null,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ success: true, data: table });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al crear mesa' },
      { status: 500 }
    );
  }
}
