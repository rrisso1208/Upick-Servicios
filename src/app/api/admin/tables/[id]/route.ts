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
    const existing = await prisma.table.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Mesa no encontrada' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, capacity, price, description, eventId, isActive } = body;

    const data: Prisma.TableUpdateInput = {};
    if (typeof name === 'string') data.name = name.trim();
    if (capacity !== undefined) {
      data.capacity = Math.max(1, Math.floor(Number(capacity)));
    }
    if (price !== undefined) {
      data.price = price == null ? null : Math.round(Number(price));
    }
    if (description !== undefined) {
      data.description =
        typeof description === 'string' ? description.trim() || null : null;
    }
    if (typeof isActive === 'boolean') data.isActive = isActive;

    if (eventId !== undefined) {
      if (eventId === null || eventId === '') {
        data.event = { disconnect: true };
      } else {
        const ev = await prisma.event.findFirst({
          where: { id: eventId, restaurantId },
        });
        if (!ev) {
          return NextResponse.json(
            { success: false, error: 'Evento no encontrado' },
            { status: 400 }
          );
        }
        data.event = { connect: { id: eventId } };
      }
    }

    const table = await prisma.table.update({ where: { id }, data });

    return NextResponse.json({ success: true, data: table });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar mesa' },
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
    const existing = await prisma.table.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Mesa no encontrada' },
        { status: 404 }
      );
    }

    const table = await prisma.table.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: table });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar mesa' },
      { status: 500 }
    );
  }
}
