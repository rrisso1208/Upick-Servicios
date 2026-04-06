import { NextRequest, NextResponse } from 'next/server';
import { eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

function combineDateAndTime(baseDate: Date, hours: number, minutes: number): Date {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
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

    const body = await req.json();
    const {
      serviceId,
      startDate,
      endDate,
      workingDays,
      startHour,
      endHour,
    } = body as {
      serviceId?: string;
      startDate?: string;
      endDate?: string;
      workingDays?: number[];
      startHour?: string;
      endHour?: string;
    };

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'serviceId requerido' },
        { status: 400 }
      );
    }
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate y endDate requeridos (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    if (!Array.isArray(workingDays) || workingDays.length === 0) {
      return NextResponse.json(
        { success: false, error: 'workingDays requerido (0=dom … 6=sáb)' },
        { status: 400 }
      );
    }
    if (!startHour || !endHour) {
      return NextResponse.json(
        { success: false, error: 'startHour y endHour requeridos (HH:mm)' },
        { status: 400 }
      );
    }

    const service = await prisma.serviceOffering.findFirst({
      where: { id: serviceId, restaurantId, isActive: true },
    });
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const daySet = new Set(
      workingDays.map((d) => Math.floor(Number(d))).filter((n) => n >= 0 && n <= 6)
    );
    if (daySet.size === 0) {
      return NextResponse.json(
        { success: false, error: 'workingDays inválido' },
        { status: 400 }
      );
    }

    const [sh, sm = 0] = startHour.split(':').map((x) => parseInt(x, 10));
    const [eh, em = 0] = endHour.split(':').map((x) => parseInt(x, 10));
    if (
      [sh, sm, eh, em].some((n) => Number.isNaN(n)) ||
      sh < 0 ||
      sh > 23 ||
      eh < 0 ||
      eh > 23
    ) {
      return NextResponse.json(
        { success: false, error: 'Formato de hora inválido' },
        { status: 400 }
      );
    }

    const intervalStart = startOfDay(parseISO(startDate));
    const intervalEnd = startOfDay(parseISO(endDate));
    if (intervalEnd < intervalStart) {
      return NextResponse.json(
        { success: false, error: 'endDate debe ser >= startDate' },
        { status: 400 }
      );
    }

    const days = eachDayOfInterval({ start: intervalStart, end: intervalEnd });
    const duration = service.durationMin;
    const created: string[] = [];

    for (const day of days) {
      if (!daySet.has(day.getDay())) continue;

      let cursor = combineDateAndTime(day, sh, sm);
      const endLimit = combineDateAndTime(day, eh, em);

      while (cursor < endLimit) {
        const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);
        if (slotEnd > endLimit) break;

        const slotDateOnly = new Date(
          Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0)
        );

        await prisma.timeSlot.create({
          data: {
            serviceOfferingId: serviceId,
            slotDate: slotDateOnly,
            startTime: new Date(cursor),
            endTime: slotEnd,
            isBooked: false,
          },
        });
        created.push(cursor.toISOString());
        cursor = slotEnd;
      }
    }

    return NextResponse.json({
      success: true,
      data: { count: created.length },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al generar cupos' },
      { status: 500 }
    );
  }
}
