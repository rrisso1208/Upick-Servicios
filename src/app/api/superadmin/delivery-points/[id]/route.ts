/**
 * PATCH /api/superadmin/delivery-points/[id]
 * DELETE /api/superadmin/delivery-points/[id]
 * Update or delete a delivery point
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
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
    const { name, category, isActive, placeId } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (placeId !== undefined) updateData.placeId = placeId;

    const updatedPoint = await prisma.deliveryPoint.update({
      where: { id },
      data: updateData,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        point: updatedPoint,
      },
    });
  } catch (error: any) {
    console.error('Error updating delivery point:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Punto de entrega no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar punto de entrega',
      },
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
    let user;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
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

    // Check if point has orders
    const orderCount = await prisma.order.count({
      where: { deliveryPointId: id },
    });

    if (orderCount > 0) {
      // Soft delete: just mark as inactive
      await prisma.deliveryPoint.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no orders
      await prisma.deliveryPoint.delete({
        where: { id },
      });
    }

    return NextResponse.json({
      success: true,
      message: orderCount > 0
        ? 'Punto de entrega desactivado (tiene pedidos asociados)'
        : 'Punto de entrega eliminado',
    });
  } catch (error: any) {
    console.error('Error deleting delivery point:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Punto de entrega no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar punto de entrega',
      },
      { status: 500 }
    );
  }
}

