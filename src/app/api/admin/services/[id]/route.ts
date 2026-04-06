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
    const existing = await prisma.serviceOffering.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description, imageUrl, durationMin, price, isActive, specifications } = body;

    const res = await prisma.$transaction(async (tx) => {
      const data: Prisma.ServiceOfferingUpdateInput = {};
      if (typeof name === 'string') data.name = name.trim();
      if (description !== undefined) {
        data.description = typeof description === 'string' ? description.trim() || null : null;
      }
      if (imageUrl !== undefined) {
        data.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() || null : null;
      }
      if (durationMin !== undefined) {
        data.durationMin = Math.max(1, Math.floor(Number(durationMin)));
      }
      if (price !== undefined) {
        data.price = Math.round(Number(price));
      }
      if (typeof isActive === 'boolean') data.isActive = isActive;

      if (specifications && Array.isArray(specifications)) {
        // Simple sync: delete old ones not in the list and upsert others
        // Or for now, since it's a new feature: delete all and recreate
        await tx.serviceSpecification.deleteMany({ where: { serviceOfferingId: id } });
        await tx.serviceSpecification.createMany({
          data: specifications.map((s: any) => ({
            serviceOfferingId: id,
            name: s.name.trim(),
            imageUrl: s.imageUrl?.trim() || null,
            isBlocking: s.isBlocking ?? true,
          }))
        });
      }

      return await tx.serviceOffering.update({
        where: { id },
        data,
        include: { specifications: true }
      });
    });

    return NextResponse.json({ success: true, data: res });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar servicio' },
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
    const existing = await prisma.serviceOffering.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const service = await prisma.serviceOffering.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: service });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar servicio' },
      { status: 500 }
    );
  }
}
