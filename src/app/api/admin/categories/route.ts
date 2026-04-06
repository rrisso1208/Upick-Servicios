/**
 * GET /api/admin/categories - Get restaurant categories
 * POST /api/admin/categories - Create category
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const categories = await prisma.category.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
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
    const { name, description, saleHoursStart, saleHoursEnd, sort } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
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

    // Get max sort value to add new category at the end
    const maxSort = await prisma.category.findFirst({
      where: { restaurantId },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    const category = await prisma.category.create({
      data: {
        name,
        description,
        saleHoursStart: saleHoursStart || null,
        saleHoursEnd: saleHoursEnd || null,
        restaurantId,
        sort:
          sort !== undefined
            ? parseInt(String(sort))
            : (maxSort?.sort ?? -1) + 1,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear categoría' },
      { status: 500 }
    );
  }
}
