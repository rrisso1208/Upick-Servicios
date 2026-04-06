import { NextRequest, NextResponse } from 'next/server';
import { TableReservationStatus } from '@prisma/client';
import { prisma } from '../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../lib/student-api-auth';
import { createPaymentSession } from '../../../../lib/payments/wompi';
import { generateIntegritySignature } from '../../../../lib/payments/wompi-signature';
import { env } from '../../../../lib/env';

export const dynamic = 'force-dynamic';

const WOMPI_MIN_CENTS = 1000;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedStudent(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tableId, eventId, guestCount = 1, notes } = body;

    if (!tableId || typeof tableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'tableId requerido' },
        { status: 400 }
      );
    }

    const table = await prisma.table.findFirst({
      where: { id: tableId, isActive: true },
      include: {
        restaurant: { select: { id: true, type: true, name: true } },
      },
    });

    if (!table || table.restaurant.type !== 'DISCOTECA') {
      return NextResponse.json(
        { success: false, error: 'Mesa no encontrada' },
        { status: 404 }
      );
    }

    let resolvedEventId: string | null = null;
    if (eventId) {
      const ev = await prisma.event.findFirst({
        where: {
          id: eventId,
          restaurantId: table.restaurantId,
          isActive: true,
        },
      });
      if (!ev) {
        return NextResponse.json(
          { success: false, error: 'Evento no encontrado' },
          { status: 400 }
        );
      }
      if (table.eventId && table.eventId !== eventId) {
        return NextResponse.json(
          { success: false, error: 'Esta mesa no pertenece al evento' },
          { status: 400 }
        );
      }
      resolvedEventId = ev.id;

      const existing = await prisma.tableReservation.findFirst({
        where: {
          tableId,
          eventId,
          status: TableReservationStatus.CONFIRMED,
        },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'La mesa ya está reservada para este evento' },
          { status: 409 }
        );
      }
    } else if (table.eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId requerido para esta mesa' },
        { status: 400 }
      );
    }

    const guests = Math.max(1, Math.floor(Number(guestCount)));
    if (guests > table.capacity) {
      return NextResponse.json(
        { success: false, error: 'Número de invitados supera la capacidad' },
        { status: 400 }
      );
    }

    const priceCents = table.price ?? 0;
    if (priceCents < WOMPI_MIN_CENTS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Precio de mesa inválido o por debajo del mínimo de pago',
        },
        { status: 400 }
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (!fullUser?.email) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin email' },
        { status: 400 }
      );
    }

    const reservation = await prisma.tableReservation.create({
      data: {
        tableId,
        eventId: resolvedEventId,
        userId: user.id,
        guestCount: guests,
        status: TableReservationStatus.PENDING_PAYMENT,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
    });

    const reference = `tblres-${reservation.id}`;
    const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/orders?tableReservation=${reservation.id}`;

    const integritySignature = generateIntegritySignature(
      reference,
      priceCents,
      'COP'
    );

    const wompiSession = await createPaymentSession(
      reference,
      priceCents,
      fullUser.email,
      'CARD',
      undefined,
      integritySignature,
      undefined,
      { redirectUrl }
    );

    await prisma.tableReservation.update({
      where: { id: reservation.id },
      data: { paymentId: wompiSession.data.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        reservationId: reservation.id,
        transactionId: wompiSession.data.id,
        paymentUrl: wompiSession.data.payment_link?.url,
        amount: priceCents,
        metadata: { type: 'TABLE_RESERVATION', reservationId: reservation.id },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al reservar';
    console.error(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
