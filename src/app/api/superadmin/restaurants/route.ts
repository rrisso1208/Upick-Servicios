/**
 * GET /api/superadmin/restaurants - Get all restaurants
 * POST /api/superadmin/restaurants - Create restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlaceType } from '@prisma/client';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

const PLACE_TYPES: PlaceType[] = ['RESTAURANT', 'SERVICE', 'DISCOTECA'];

function parsePlaceType(value: unknown): PlaceType {
  if (typeof value === 'string' && PLACE_TYPES.includes(value as PlaceType)) {
    return value as PlaceType;
  }
  return 'RESTAURANT';
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const VALID_SALE_STATUSES = ['paid', 'delivered', 'in_progress', 'ready'] as const;

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        imageUrl: true,
        imagePosition: true,
        imageScale: true,
        isActive: true,
        placeId: true,
        centralId: true,
        commissionPercentage: true,
        commissionIvaPayer: true,
        freeFeeThreshold: true,
        lowOrderFee: true,
        type: true,
        place: { select: { name: true } },
        users: {
          where: { role: 'restaurant_admin' },
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { products: true, orders: true } }, // ⚠️ legacy (todos)
      },
    });

    // ✅ Conteo correcto: SOLO pedidos en estados válidos
    const restaurantsWithValidCount = await Promise.all(
      restaurants.map(async (r) => {
        const ordersCountValid = await prisma.order.count({
          where: {
            restaurantId: r.id,
            status: { in: [...VALID_SALE_STATUSES] },
          },
        });

        return {
          ...r,
          ordersCountValid, // ✅ nuevo campo para el frontend
        };
      })
    );

    // Mapear place a university para compatibilidad con el frontend
    const restaurantsWithUniversity = restaurantsWithValidCount.map((r) => ({
      ...r,
      university: r.place,
    }));

    return NextResponse.json({
      success: true,
      data: { restaurants: restaurantsWithUniversity },
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener restaurantes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      placeId,
      universityId, // Mantener para compatibilidad
      centralId, // ID de la Central (opcional)
      location,
      imageUrl,
      imagePosition,
      imageScale,
      commissionIvaPayer,
      commissionPercentage,
      freeFeeThreshold,
      lowOrderFee,
      type,
    } = body;

    const finalPlaceId = placeId || universityId;

    if (type !== undefined && type !== null && type !== '') {
      if (!PLACE_TYPES.includes(type as PlaceType)) {
        return NextResponse.json(
          {
            success: false,
            error: 'type inválido. Usa RESTAURANT, SERVICE o DISCOTECA',
          },
          { status: 400 }
        );
      }
    }
    const placeType = parsePlaceType(type);

    if (!name || !slug || !finalPlaceId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (existingRestaurant) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un restaurante con ese slug' },
        { status: 400 }
      );
    }

    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: finalPlaceId },
    });

    if (!place) {
      return NextResponse.json(
        { success: false, error: 'El lugar especificado no existe' },
        { status: 400 }
      );
    }

    // Parse commission percentage (REQUIRED - no default)
    let commissionPercent: number | null = null;
    if (commissionPercentage !== undefined && commissionPercentage !== null) {
      const commissionStr = String(commissionPercentage).replace(',', '.');
      commissionPercent = parseFloat(commissionStr);
    }

    if (commissionPercent === null || isNaN(commissionPercent)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El porcentaje de comisión es requerido y debe ser un número válido',
        },
        { status: 400 }
      );
    }

    if (commissionPercent < 0 || commissionPercent > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'El porcentaje de comisión debe ser un número entre 0 y 100',
        },
        { status: 400 }
      );
    }

    // Parse service fee fields (convert from pesos to cents)
    const freeFeeThresholdCents = freeFeeThreshold
      ? Math.round(parseFloat(String(freeFeeThreshold)) * 100)
      : 0;
    const lowOrderFeeCents = lowOrderFee
      ? Math.round(parseFloat(String(lowOrderFee)) * 100)
      : 0;

    // Si se proporciona centralId, verificar que existe
    if (centralId) {
      const central = await (prisma as any).central.findUnique({
        where: { id: centralId },
      });
      if (!central) {
        return NextResponse.json(
          { success: false, error: 'La Central especificada no existe' },
          { status: 400 }
        );
      }
    }

    const allowedIvaPayers = new Set(['RESTAURANT', 'PLATFORM']);

    if (
      commissionIvaPayer !== undefined &&
      commissionIvaPayer !== null &&
      !allowedIvaPayers.has(String(commissionIvaPayer))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'commissionIvaPayer inválido. Usa RESTAURANT o PLATFORM',
        },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        placeId: finalPlaceId,
        centralId: centralId || null,
        location: location || null,
        imageUrl: imageUrl || null,
        imagePosition: imagePosition || 'center',
        imageScale: imageScale || 1.0,
        commissionPercentage: commissionPercent,
        freeFeeThreshold: freeFeeThresholdCents,
        lowOrderFee: lowOrderFeeCents,
        commissionIvaPayer: commissionIvaPayer
          ? String(commissionIvaPayer)
          : 'RESTAURANT',
        isActive: true,
        type: placeType,
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error: any) {
    console.error('Error creating restaurant:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.[0] || 'campo';
      return NextResponse.json(
        { success: false, error: `Ya existe un restaurante con ese ${field}` },
        { status: 400 }
      );
    }

    if (error?.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'El lugar especificado no existe' },
        { status: 400 }
      );
    }

    if (error?.code === 'P2009') {
      return NextResponse.json(
        { success: false, error: 'Error de validación en los datos proporcionados' },
        { status: 400 }
      );
    }

    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Error al crear restaurante: ${error?.message || String(error)}`
        : 'Error al crear restaurante';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development'
            ? {
              message: error?.message,
              code: error?.code,
              meta: error?.meta,
            }
            : undefined,
      },
      { status: 500 }
    );
  }
}
