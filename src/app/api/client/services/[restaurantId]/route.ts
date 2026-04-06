import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, isActive: true, type: 'SERVICE' },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const services = await prisma.serviceOffering.findMany({
      where: { restaurantId, isActive: true },
      include: {
        specifications: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { services } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: 'Error al listar servicios' },
      { status: 500 }
    );
  }
}
