/**
 * GET /api/admin/products/:id/capacity - Get product capacities
 * POST /api/admin/products/:id/capacity - Create/update product capacity
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

    const capacities = await prisma.productCapacity.findMany({
      where: {
        productId: id,
        restaurantId,
      },
      orderBy: { hour: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { capacities },
    });
  } catch (error) {
    console.error('Error fetching capacities:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener capacidades' },
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
    const { hour, capacity } = body;

    if (hour === undefined || hour < 0 || hour > 23) {
      return NextResponse.json(
        { success: false, error: 'Hora inválida (debe ser 0-23)' },
        { status: 400 }
      );
    }

    if (capacity === undefined || capacity < 0) {
      return NextResponse.json(
        { success: false, error: 'Capacidad inválida' },
        { status: 400 }
      );
    }

    // Upsert capacity
    const productCapacity = await prisma.productCapacity.upsert({
      where: {
        restaurantId_productId_hour: {
          restaurantId,
          productId: id,
          hour: parseInt(String(hour)),
        },
      },
      update: {
        capacity: parseInt(String(capacity)),
      },
      create: {
        restaurantId,
        productId: id,
        hour: parseInt(String(hour)),
        capacity: parseInt(String(capacity)),
      },
    });

    return NextResponse.json({
      success: true,
      data: productCapacity,
    });
  } catch (error) {
    console.error('Error saving capacity:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar capacidad' },
      { status: 500 }
    );
  }
}
