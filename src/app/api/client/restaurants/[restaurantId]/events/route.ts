import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, isActive: true, type: 'DISCOTECA' },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        restaurantId,
        isActive: true,
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ success: true, data: { events } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar eventos' },
      { status: 500 }
    );
  }
}
