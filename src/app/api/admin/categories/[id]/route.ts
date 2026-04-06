/**
 * PATCH /api/admin/categories/:id - Update category
 * DELETE /api/admin/categories/:id - Delete category
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, saleHoursStart, saleHoursEnd } = body;

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Validate time format if provided
    if (
      saleHoursStart &&
      !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(saleHoursStart)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Formato de hora de inicio inválido. Use formato HH:MM (24 horas)',
        },
        { status: 400 }
      );
    }
    if (
      saleHoursEnd &&
      !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(saleHoursEnd)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Formato de hora de fin inválido. Use formato HH:MM (24 horas)',
        },
        { status: 400 }
      );
    }

    // Validate that end time is after start time if both are provided
    if (saleHoursStart && saleHoursEnd) {
      const [startHour, startMin] = saleHoursStart.split(':').map(Number);
      const [endHour, endMin] = saleHoursEnd.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          {
            success: false,
            error: 'La hora de fin debe ser posterior a la hora de inicio',
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(saleHoursStart !== undefined && {
          saleHoursStart: saleHoursStart || null,
        }),
        ...(saleHoursEnd !== undefined && {
          saleHoursEnd: saleHoursEnd || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Check if category has products
    const productCount = await prisma.product.count({
      where: {
        categoryId: id,
      },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar: la categoría tiene ${productCount} producto(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}
