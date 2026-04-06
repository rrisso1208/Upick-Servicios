/**
 * GET /api/student/favorites - Get favorites
 * POST /api/student/favorites - Add favorite
 * DELETE /api/student/favorites - Remove favorite
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        // Fall back to cookie-based auth
        user = await getAuthUser();
      }
    } else {
      // Use cookie-based auth (for server-side requests)
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'restaurant' or 'product'

    const where: any = { userId: user.id };
    if (type) {
      where.type = type;
    }

    const favorites = await prisma.favorite.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            location: true,
            place: {
              select: {
                slug: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            restaurant: {
              select: {
                name: true,
                slug: true,
                place: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { favorites },
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener favoritos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        // Fall back to cookie-based auth
        user = await getAuthUser();
      }
    } else {
      // Use cookie-based auth (for server-side requests)
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, restaurantId, productId } = body;

    if (
      !type ||
      (type === 'restaurant' && !restaurantId) ||
      (type === 'product' && !productId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const existing = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        type,
        restaurantId: restaurantId || null,
        productId: productId || null,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Ya está en favoritos',
      });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        type,
        restaurantId: restaurantId || null,
        productId: productId || null,
      },
      include: {
        restaurant: type === 'restaurant' ? true : false,
        product: type === 'product' ? true : false,
      },
    });

    return NextResponse.json({
      success: true,
      data: favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Error al agregar a favoritos' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        // Fall back to cookie-based auth
        user = await getAuthUser();
      }
    } else {
      // Use cookie-based auth (for server-side requests)
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const productId = searchParams.get('productId');

    if (!restaurantId && !productId) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        restaurantId: restaurantId || undefined,
        productId: productId || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Eliminado de favoritos',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar de favoritos' },
      { status: 500 }
    );
  }
}
