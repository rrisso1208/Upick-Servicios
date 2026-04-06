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
    if (restaurant?.type !== 'SERVICE') {
      return NextResponse.json(
        { success: false, error: 'Este negocio no es tipo servicio' },
        { status: 403 }
      );
    }

    const services = await prisma.serviceOffering.findMany({
      where: { restaurantId },
      include: {
        specifications: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { services } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar servicios' },
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
    if (restaurant?.type !== 'SERVICE') {
      return NextResponse.json(
        { success: false, error: 'Este negocio no es tipo servicio' },
        { status: 403 }
      );
    }

    const { name, description, imageUrl, durationMin, price, isActive = true, specifications } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const dur = Math.max(1, Math.floor(Number(durationMin || 15)));
    const priceInt = Math.round(Number(price));
    if (!Number.isFinite(priceInt) || priceInt < 0) {
      return NextResponse.json(
        { success: false, error: 'Precio inválido' },
        { status: 400 }
      );
    }

    const service = await prisma.serviceOffering.create({
      data: {
        restaurantId,
        name: name.trim(),
        description:
          typeof description === 'string' ? description.trim() || null : null,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() || null : null,
        durationMin: dur,
        price: priceInt,
        isActive: Boolean(isActive),
        specifications: specifications && Array.isArray(specifications) ? {
          create: specifications.map((s: any) => ({
            name: s.name.trim(),
            imageUrl: s.imageUrl?.trim() || null,
            isBlocking: s.isBlocking ?? true,
          }))
        } : undefined,
      },
      include: { specifications: true }
    });

    return NextResponse.json({ success: true, data: service });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al crear servicio' },
      { status: 500 }
    );
  }
}
