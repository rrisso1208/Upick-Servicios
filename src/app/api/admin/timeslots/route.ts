// @ts-nocheck
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

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const dateStr = searchParams.get('date');

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'serviceId requerido' },
        { status: 400 }
      );
    }

    const service = await prisma.serviceOffering.findFirst({
      where: { id: serviceId, restaurantId },
    });
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const where: { serviceOfferingId: string; slotDate?: Date } = {
      serviceOfferingId: serviceId,
    };

    if (dateStr) {
      const d = new Date(`${dateStr}T12:00:00.000-05:00`);
      if (!Number.isNaN(d.getTime())) {
        where.slotDate = d;
      }
    }

    const slots = await prisma.timeSlot.findMany({
      where,
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ success: true, data: { slots } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar cupos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { serviceId, date, startTime, specificationId } = body;

    if (!serviceId || !date || !startTime) {
      return NextResponse.json({ success: false, error: 'Faltan campos' }, { status: 400 });
    }

    const service = await prisma.serviceOffering.findFirst({
      where: { id: serviceId, restaurantId },
    });
    if (!service) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });

    // Ensure slotDate is at midnight local (UTC-5) for that date string
    const slotDate = new Date(`${date}T12:00:00.000-05:00`);
    
    // Combine date + startTime (UTC-5)
    const combined = new Date(`${date}T${startTime}:00.000-05:00`);
    const endTime = new Date(combined.getTime() + service.durationMin * 60000);

    const slot = await prisma.timeSlot.create({
      data: {
        serviceOfferingId: serviceId,
        specificationId: specificationId || null,
        slotDate,
        startTime: combined,
        endTime,
        isBooked: false,
      },
    });

    return NextResponse.json({ success: true, data: slot });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Error al crear cupo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get('id');
    if (!slotId) {
      return NextResponse.json(
        { success: false, error: 'id del cupo requerido' },
        { status: 400 }
      );
    }

    const slot = await prisma.timeSlot.findFirst({
      where: { id: slotId },
      include: { serviceOffering: { select: { restaurantId: true } } },
    });
    if (!slot || slot.serviceOffering.restaurantId !== restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Cupo no encontrado' },
        { status: 404 }
      );
    }
    if (slot.isBooked) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un cupo reservado' },
        { status: 400 }
      );
    }

    await prisma.timeSlot.delete({ where: { id: slotId } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar cupo' },
      { status: 500 }
    );
  }
}
