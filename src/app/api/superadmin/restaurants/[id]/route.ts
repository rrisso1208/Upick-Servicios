/**
 * PATCH /api/superadmin/restaurants/[id] - Update restaurant
 * DELETE /api/superadmin/restaurants/[id] - Delete restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlaceType } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';

const PLACE_TYPES: PlaceType[] = ['RESTAURANT', 'SERVICE', 'DISCOTECA'];

function parsePlaceType(value: unknown): PlaceType | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && PLACE_TYPES.includes(value as PlaceType)) {
    return value as PlaceType;
  }
  return undefined;
}

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');

    let user;
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

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      slug,
      location,
      imageUrl,
      imagePosition,
      imageScale,
      centralId, // ID de la Central (opcional)
      commissionPercentage,
      commissionIvaPayer,
      freeFeeThreshold,
      lowOrderFee,
      isActive,
      type,
    } = body;

    // Validate commission percentage if provided
    if (commissionPercentage !== undefined) {
      const commissionPercent = parseFloat(String(commissionPercentage));
      if (
        isNaN(commissionPercent) ||
        commissionPercent < 0 ||
        commissionPercent > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'El porcentaje de comisión debe ser un número entre 0 y 100',
          },
          { status: 400 }
        );
      }
    }

    // Validate and parse service fee fields if provided
    let freeFeeThresholdCents: number | undefined;
    let lowOrderFeeCents: number | undefined;

    if (freeFeeThreshold !== undefined) {
      const threshold = parseFloat(String(freeFeeThreshold));
      if (isNaN(threshold) || threshold < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'El monto mínimo debe ser un número no negativo',
          },
          { status: 400 }
        );
      }
      freeFeeThresholdCents = Math.round(threshold * 100); // Convert to cents
    }

    if (lowOrderFee !== undefined) {
      const fee = parseFloat(String(lowOrderFee));
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'El costo del servicio debe ser un número no negativo',
          },
          { status: 400 }
        );
      }
      lowOrderFeeCents = Math.round(fee * 100); // Convert to cents
    }

    // Si se proporciona centralId, verificar que existe
    if (centralId !== undefined) {
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

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(location !== undefined && { location }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imagePosition !== undefined && {
          imagePosition: imagePosition || 'center',
        }),
        ...(imageScale !== undefined && { imageScale: imageScale || 1.0 }),
        ...(centralId !== undefined && { centralId: centralId || null }),
        ...(commissionPercentage !== undefined && {
          commissionPercentage: parseFloat(String(commissionPercentage)),
        }),
        ...(commissionIvaPayer !== undefined && {
          commissionIvaPayer: commissionIvaPayer ? String(commissionIvaPayer) : 'RESTAURANT',
        }),
        ...(freeFeeThresholdCents !== undefined && {
          freeFeeThreshold: freeFeeThresholdCents,
        }),
        ...(lowOrderFeeCents !== undefined && {
          lowOrderFee: lowOrderFeeCents,
        }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(type !== undefined && { type: parsePlaceType(type) }),
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    // Return a simple error response. Avoid referencing variables that may not
    // be defined in this scope (previous code attempted to spread `placeType`).
    return NextResponse.json(
      { success: false, error: 'Error al actualizar restaurante' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    // ✅ Authenticate user (superadmin only)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');

    let user;
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

    const { id } = await params;

    // Check if restaurant has products or orders
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    // Only block deletion if restaurant has orders (historical transactions)
    // Products will be deleted in cascade
    if (restaurant._count.orders > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar. Este restaurante tiene ${restaurant._count.orders} pedido(s) asociado(s). Los productos se eliminarán automáticamente.`,
        },
        { status: 400 }
      );
    }

    // Delete restaurant (products will be deleted in cascade due to onDelete: Cascade)
    await prisma.restaurant.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Restaurante eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar restaurante' },
      { status: 500 }
    );
  }
}
