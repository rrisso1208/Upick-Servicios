// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../../lib/student-api-auth';
import { createPaymentSession } from '../../../../../lib/payments/wompi';
import { generateIntegritySignature } from '../../../../../lib/payments/wompi-signature';
import { env } from '../../../../../lib/env';

export const dynamic = 'force-dynamic';

const WOMPI_MIN_CENTS = 1000;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedStudent(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { slotId, specificationId, notes } = body as { slotId?: string; specificationId?: string; notes?: string };

    if (!slotId || typeof slotId !== 'string') {
      return NextResponse.json({ success: false, error: 'slotId requerido' }, { status: 400 });
    }

    let finalSlotId = slotId;

    // Handle virtual slot (format: serviceId_timestamp)
    if (slotId.includes('_')) {
      const [serviceId, timestampStr] = slotId.split('_');
      const startTime = new Date(parseInt(timestampStr));
      
      const service = await prisma.serviceOffering.findUnique({
        where: { id: serviceId },
        // @ts-ignore
      include: { specifications: true }
      });

      if (!service) return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });

      const endTime = new Date(startTime.getTime() + (service.durationMin * 60000));

      // Just-in-time create the TimeSlot
      // Using transaction to avoid double creation/booking
      const result = await prisma.$transaction(async (tx) => {
        // Double check if a reservation already exists for this slot + spec OR this slot + service (if no spec)
        const conflict = await tx.serviceReservation.findFirst({
          where: {
            slot: {
              serviceOfferingId: serviceId,
              startTime: startTime,
            },
            status: { in: [ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED] },
            // @ts-ignore
            specificationId: specificationId || null,
          }
        });

        if (conflict) throw new Error('Este horario ya ha sido reservado');

        // Create TimeSlot record
        const newSlot = await tx.timeSlot.create({
          data: {
            serviceOfferingId: serviceId,
            // @ts-ignore
            specificationId: specificationId || null,
            slotDate: startTime,
            startTime,
            endTime,
            isBooked: false, 
          }
        });

        const res = await tx.serviceReservation.create({
          data: {
            slotId: newSlot.id,
            userId: user.id,
            // @ts-ignore
            specificationId: specificationId || null,
            status: ReservationStatus.PENDING_PAYMENT,
            notes: typeof notes === 'string' ? notes.trim() || null : null,
          },
        });

        return { slot: newSlot, reservation: res };
      });

      finalSlotId = result.slot.id;
      const reservationId = result.reservation.id;
      const priceCents = service.price;

      return await processPaymentRedirect(user.id, reservationId, priceCents);
    }

    // Legacy logic for existing persistent slots (if any)
    const slot = await prisma.timeSlot.findFirst({
      where: { id: slotId, isBooked: false },
      include: {
        serviceOffering: {
          include: { restaurant: { select: { type: true, isActive: true } } },
        },
      },
    });

    if (!slot || !slot.serviceOffering.isActive || !slot.serviceOffering.restaurant.isActive) {
      return NextResponse.json({ success: false, error: 'Cupo no disponible' }, { status: 404 });
    }

    const reservation = await prisma.serviceReservation.create({
      data: {
        slotId,
        userId: user.id,
        // @ts-ignore
        specificationId: specificationId || null,
        status: ReservationStatus.PENDING_PAYMENT,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
    });

    return await processPaymentRedirect(user.id, reservation.id, slot.serviceOffering.price);

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al reservar';
    console.error(e);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

async function processPaymentRedirect(userId: string, reservationId: string, priceCents: number) {
  if (priceCents < WOMPI_MIN_CENTS) {
    throw new Error('Precio del servicio inválido para pago electrónico');
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!fullUser?.email) throw new Error('Usuario sin email');

  const reference = `svres-${reservationId}`;
  const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/orders?serviceReservation=${reservationId}`;
  const integritySignature = generateIntegritySignature(reference, priceCents, 'COP');

  const wompiSession = await createPaymentSession(
    reference, priceCents, fullUser.email, 'CARD', undefined, 
    integritySignature, undefined, { redirectUrl }
  );

  await prisma.serviceReservation.update({
    where: { id: reservationId },
    data: { paymentId: wompiSession.data.id },
  });

  return NextResponse.json({
    success: true,
    data: {
      reservationId: reservationId,
      transactionId: wompiSession.data.id,
      paymentUrl: wompiSession.data.payment_link?.url,
      amount: priceCents,
      metadata: { type: 'SERVICE_RESERVATION', reservationId: reservationId },
    },
  });
}
