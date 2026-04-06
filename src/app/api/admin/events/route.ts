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

    const events = await prisma.event.findMany({
      where: { restaurantId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ success: true, data: { events } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar eventos' },
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
    const {
      name,
      description,
      date,
      coverPrice,
      maxCapacity,
      bannerUrl,
      isActive = true,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    const eventDate = new Date(date);
    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Fecha inválida' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        restaurantId,
        name: name.trim(),
        description:
          typeof description === 'string' ? description.trim() || null : null,
        date: eventDate,
        coverPrice:
          coverPrice != null ? Math.round(Number(coverPrice)) : null,
        maxCapacity:
          maxCapacity != null ? Math.max(0, Math.floor(Number(maxCapacity))) : null,
        bannerUrl:
          typeof bannerUrl === 'string' ? bannerUrl.trim() || null : null,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al crear evento' },
      { status: 500 }
    );
  }
}
