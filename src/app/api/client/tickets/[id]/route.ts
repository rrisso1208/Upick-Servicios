import { NextRequest, NextResponse } from 'next/server';
import { TicketStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedStudent } from '../../../../../lib/student-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedStudent(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, userId: user.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            bannerUrl: true,
            restaurantId: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Boleta no encontrada' },
        { status: 404 }
      );
    }

    const paidOrUsed =
      ticket.status === TicketStatus.PAID || ticket.status === TicketStatus.USED;

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          quantity: ticket.quantity,
          unitPrice: ticket.unitPrice,
          status: ticket.status,
          qrCode: paidOrUsed ? ticket.qrCode : null,
          usedAt: ticket.usedAt,
          createdAt: ticket.createdAt,
        },
        event: ticket.event,
        canShowQr: paidOrUsed && !!ticket.qrCode,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al obtener boleta' },
      { status: 500 }
    );
  }
}
