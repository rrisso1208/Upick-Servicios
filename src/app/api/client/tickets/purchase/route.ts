import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../../lib/student-api-auth';
import { createPaymentSession } from '../../../../../lib/payments/wompi';
import { generateIntegritySignature } from '../../../../../lib/payments/wompi-signature';
import { env } from '../../../../../lib/env';
import { TicketStatus } from '@prisma/client';

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
    const { eventId, quantity = 1 } = body;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'eventId requerido' },
        { status: 400 }
      );
    }

    const qty = Math.max(1, Math.floor(Number(quantity)));

    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const unitPrice = event.coverPrice;
    if (unitPrice == null || unitPrice < WOMPI_MIN_CENTS) {
      return NextResponse.json(
        { success: false, error: 'Precio de boleta no configurado o inválido' },
        { status: 400 }
      );
    }

    const totalCents = qty * unitPrice;
    if (totalCents < WOMPI_MIN_CENTS) {
      return NextResponse.json(
        { success: false, error: 'Monto total inválido' },
        { status: 400 }
      );
    }

    if (event.maxCapacity != null) {
      const usage = await prisma.ticket.aggregate({
        where: {
          eventId,
          status: {
            in: [
              TicketStatus.PENDING_PAYMENT,
              TicketStatus.PAID,
              TicketStatus.USED,
            ],
          },
        },
        _sum: { quantity: true },
      });
      const used = usage._sum.quantity ?? 0;
      if (used + qty > event.maxCapacity) {
        return NextResponse.json(
          { success: false, error: 'No hay aforo suficiente' },
          { status: 409 }
        );
      }
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

    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        userId: user.id,
        quantity: qty,
        unitPrice,
        status: TicketStatus.PENDING_PAYMENT,
      },
    });

    const reference = `ticket-${ticket.id}`;
    const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/orders?ticket=${ticket.id}`;

    const integritySignature = generateIntegritySignature(
      reference,
      totalCents,
      'COP'
    );

    const wompiSession = await createPaymentSession(
      reference,
      totalCents,
      fullUser.email,
      'CARD',
      undefined,
      integritySignature,
      undefined,
      { redirectUrl }
    );

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { paymentId: wompiSession.data.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        ticketId: ticket.id,
        transactionId: wompiSession.data.id,
        paymentUrl: wompiSession.data.payment_link?.url,
        amount: totalCents,
        metadata: { type: 'TICKET_PURCHASE', ticketId: ticket.id },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al comprar boleta';
    console.error(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
