import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
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
    const existing = await prisma.event.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description, date, coverPrice, maxCapacity, bannerUrl, isActive } =
      body;

    const data: Prisma.EventUpdateInput = {};
    if (typeof name === 'string') data.name = name.trim();
    if (description !== undefined) {
      data.description =
        typeof description === 'string' ? description.trim() || null : null;
    }
    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Fecha inválida' },
          { status: 400 }
        );
      }
      data.date = d;
    }
    if (coverPrice !== undefined) {
      data.coverPrice =
        coverPrice == null ? null : Math.round(Number(coverPrice));
    }
    if (maxCapacity !== undefined) {
      data.maxCapacity =
        maxCapacity == null ? null : Math.max(0, Math.floor(Number(maxCapacity)));
    }
    if (bannerUrl !== undefined) {
      data.bannerUrl =
        typeof bannerUrl === 'string' ? bannerUrl.trim() || null : null;
    }
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: event });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar evento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const existing = await prisma.event.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const event = await prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar evento' },
      { status: 500 }
    );
  }
}
