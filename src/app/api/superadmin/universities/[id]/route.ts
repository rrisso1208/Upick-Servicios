/**
 * PATCH /api/superadmin/universities/[id] - Update university
 * DELETE /api/superadmin/universities/[id] - Delete university
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, slug, category, cityId, imageUrl, imagePosition, imageScale, isActive } = body;

    const place = await prisma.place.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(category !== undefined && { category: category || null }),
        ...(cityId !== undefined && { cityId: cityId || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imagePosition !== undefined && { imagePosition }),
        ...(imageScale !== undefined && { imageScale }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: place,
    });
  } catch (error) {
    console.error('Error updating place:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar lugar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if place has restaurants
    const place = await prisma.place.findUnique({
      where: { id },
      include: {
        _count: {
          select: { restaurants: true },
        },
      },
    });

    if (!place) {
      return NextResponse.json(
        { success: false, error: 'Lugar no encontrado' },
        { status: 404 }
      );
    }

    if (place._count.restaurants > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar. Tiene ${place._count.restaurants} restaurante(s) asociado(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.place.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Lugar eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting place:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar lugar' },
      { status: 500 }
    );
  }
}


