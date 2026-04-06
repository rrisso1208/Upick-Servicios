// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { format, parseISO, startOfDay, endOfDay, addMinutes, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const specId = searchParams.get('specificationId');

    if (!dateStr) {
      return NextResponse.json({ success: false, error: 'date requerido' }, { status: 400 });
    }

    const service = await prisma.serviceOffering.findFirst({
      where: { id: serviceId, isActive: true },
      // @ts-ignore
      include: {
        specifications: true,
        schedules: true,
      }
    });

    if (!service) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    const targetDate = parseISO(dateStr);
    const dayOfWeek = targetDate.getUTCDay(); // 0=Sunday, 1=Monday...

    // 0. CHECK FOR MANUAL SLOTS FIRST
    const manualSlots = await prisma.timeSlot.findMany({
      where: {
        serviceOfferingId: serviceId,
        slotDate: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
      },
      include: {
        reservations: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (manualSlots.length > 0) {
      // If manual slots exist, PRIORITIZE them and IGNORE rules
      return NextResponse.json({
        success: true,
        data: {
          slots: manualSlots.map((ms: any) => ({
            id: ms.id,
            startTime: ms.startTime,
            endTime: ms.endTime,
            isBooked: ms.isBooked || ms.reservations.length > 0,
            specificationId: ms.specificationId,
          })),
        },
      });
    }

    // 1. Get rules for this day
    const daySchedules = (service as any).schedules.filter((s: any) => s.dayOfWeek === dayOfWeek);
    if (daySchedules.length === 0) {
      return NextResponse.json({ success: true, data: { slots: [] } });
    }

    // 2. Get existing reservations for this day
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // We look for any reservation that is confirmed or pending payment
    const reservations = await prisma.serviceReservation.findMany({
      where: {
        slot: {
          serviceOfferingId: serviceId,
          slotDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        status: { in: [ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED] },
      },
      include: { slot: true },
    });

    const now = new Date();
    const availableSlots: any[] = [];

    // 3. Generate slots based on schedule
    for (const rule of daySchedules) {
      let current = new Date(`${dateStr}T${rule.startTime}:00.000-05:00`);
      const end = new Date(`${dateStr}T${rule.endTime}:00.000-05:00`);

      while (isAfter(end, current)) {
        const slotStart = new Date(current);
        const slotEnd = addMinutes(slotStart, service.durationMin);
        
        // Skip if slot start is in the past
        if (!isAfter(slotStart, now)) {
          current = addMinutes(current, rule.intervalMin);
          continue;
        }

        // 4. Check availability
        let isAvailable = false;

        if (specId) {
          // If a professional is chosen, check if AFTER that professional is busy
          const isBusy = reservations.some((r: any) => 
            r.specificationId === specId && 
            r.slot.startTime.getTime() === slotStart.getTime()
          );
          if (!isBusy) isAvailable = true;
        } else {
          // If no professional chosen, check if ANY professional is free
          // OR if no specs defined, check if service is free
          if ((service as any).specifications.length === 0) {
            const isBusy = reservations.some(r => r.slot.startTime.getTime() === slotStart.getTime());
            if (!isBusy) isAvailable = true;
          } else {
            // Find if there's at least one spec that is not booked for this slot
            const takenSpecs = new Set(reservations
              .filter((r: any) => r.slot.startTime.getTime() === slotStart.getTime())
              .map((r: any) => r.specificationId)
            );
            const freeSpec = (service as any).specifications.find((s: any) => !takenSpecs.has(s.id));
            if (freeSpec) isAvailable = true;
          }
        }

        if (isAvailable) {
          availableSlots.push({
            id: `${serviceId}_${slotStart.getTime()}`, // Virtual ID since we don't have TimeSlot records yet
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
          });
        }

        current = addMinutes(current, rule.intervalMin);
      }
    }

    return NextResponse.json({ success: true, data: { slots: availableSlots } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Error al listar cupos' }, { status: 500 });
  }
}
