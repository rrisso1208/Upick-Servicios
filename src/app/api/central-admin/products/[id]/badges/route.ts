/**
 * GET /api/central-admin/products/[id]/badges - Get badges for a master product
 * PUT /api/central-admin/products/[id]/badges - Update badges for a master product
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function getCentralAdminFromRequest(req: NextRequest) {
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  let user;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    user = await getAuthUserFromHeader(authHeader);
  }

  if (!user) {
    user = await getAuthUser();
  }

  if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
    return null;
  }

  return user as any;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const { id } = await params;

    // Verify product belongs to central
    const product = await (prisma as any).masterProduct.findFirst({
      where: {
        id,
        centralId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Get product badges
    const productBadges = await (prisma as any).masterProductBadge.findMany({
      where: {
        masterProductId: id,
      },
      include: {
        badge: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        badges: productBadges.map((pb: any) => pb.badge),
      },
    });
  } catch (error) {
    console.error('Error fetching master product badges:', error);
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
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const { id } = await params;

    // Verify product belongs to central
    const product = await (prisma as any).masterProduct.findFirst({
      where: {
        id,
        centralId,
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
      (prisma as any).masterProductBadge.deleteMany({
        where: {
          masterProductId: id,
        },
      }),
      ...badgeIds.map((badgeId: string) =>
        (prisma as any).masterProductBadge.create({
          data: {
            masterProductId: id,
            badgeId,
          },
        })
      ),
    ]);

    // Fetch updated badges
    const updatedBadges = await (prisma as any).masterProductBadge.findMany({
      where: {
        masterProductId: id,
      },
      include: {
        badge: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        badges: updatedBadges.map((pb: any) => pb.badge),
      },
    });
  } catch (error) {
    console.error('Error updating master product badges:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar medallas del producto' },
      { status: 500 }
    );
  }
}

