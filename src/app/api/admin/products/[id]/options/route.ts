/**
 * GET /api/admin/products/:id/options - Get product option groups
 * POST /api/admin/products/:id/options - Create option group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
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

    // Verify product belongs to restaurant
    const product = await prisma.product.findFirst({
      where: {
        id,
        category: {
          restaurantId,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const optionGroups = await prisma.productOptionGroup.findMany({
      where: { productId: id },
      include: {
        options: {
          orderBy: { sort: 'asc' },
        },
      },
      orderBy: { sort: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { optionGroups },
    });
  } catch (error) {
    console.error('Error fetching option groups:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener especificaciones' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Verify product belongs to restaurant
    const product = await prisma.product.findFirst({
      where: {
        id,
        category: {
          restaurantId,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, min, max, required, sort } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Get max sort value
    const maxSort = await prisma.productOptionGroup.findFirst({
      where: { productId: id },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    const optionGroup = await prisma.productOptionGroup.create({
      data: {
        productId: id,
        name: name.trim(),
        min: min ?? 0,
        max: max ?? 1,
        required: required === true,
        sort: sort ?? (maxSort?.sort ?? -1) + 1,
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: optionGroup,
    });
  } catch (error) {
    console.error('Error creating option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear especificación' },
      { status: 500 }
    );
  }
}
