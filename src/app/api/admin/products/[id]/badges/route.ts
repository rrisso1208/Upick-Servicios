/**
 * GET /api/admin/products/[id]/badges - Get badges for a product
 * PUT /api/admin/products/[id]/badges - Update badges for a product
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
    const { id } = await params;
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify product belongs to restaurant
    const product = await prisma.product.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Get product badges
    const productBadges = await prisma.productBadge.findMany({
      where: {
        productId: id,
      },
      include: {
        badge: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        badges: productBadges.map((pb) => pb.badge),
      },
    });
  } catch (error) {
    console.error('Error fetching product badges:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener medallas del producto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify product belongs to restaurant
    const product = await prisma.product.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { badgeIds } = body; // Array of badge IDs

    if (!Array.isArray(badgeIds)) {
      return NextResponse.json(
        { success: false, error: 'badgeIds debe ser un array' },
        { status: 400 }
      );
    }

    // Validate all badges exist and are active
    const badges = await prisma.badge.findMany({
      where: {
        id: { in: badgeIds },
        isActive: true,
      },
    });

    if (badges.length !== badgeIds.length) {
      return NextResponse.json(
        { success: false, error: 'Una o más medallas no son válidas' },
        { status: 400 }
      );
    }

    // Delete existing badges and create new ones
    await prisma.$transaction([
      prisma.productBadge.deleteMany({
        where: {
          productId: id,
        },
      }),
      ...badgeIds.map((badgeId: string) =>
        prisma.productBadge.create({
          data: {
            productId: id,
            badgeId,
          },
        })
      ),
    ]);

    // Fetch updated badges
    const updatedBadges = await prisma.productBadge.findMany({
      where: {
        productId: id,
      },
      include: {
        badge: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        badges: updatedBadges.map((pb) => pb.badge),
      },
    });
  } catch (error) {
    console.error('Error updating product badges:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar medallas del producto' },
      { status: 500 }
    );
  }
}
