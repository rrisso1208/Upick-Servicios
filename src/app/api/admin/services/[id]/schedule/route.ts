// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const { id: serviceOfferingId } = await params;

    const schedules = await prisma.serviceSchedule.findMany({
      where: { serviceOfferingId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ success: true, data: { schedules } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Error al cargar horarios' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const { id: serviceOfferingId } = await params;
    const body = await req.json();
    const { dayOfWeek, startTime, endTime, intervalMin } = body;

    const schedule = await prisma.serviceSchedule.create({
      data: {
        serviceOfferingId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        intervalMin: parseInt(intervalMin || 30),
      },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Error al crear horario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    await prisma.serviceSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Error al eliminar horario' }, { status: 500 });
  }
}
