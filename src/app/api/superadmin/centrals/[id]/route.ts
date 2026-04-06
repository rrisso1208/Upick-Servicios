/**
 * PATCH /api/superadmin/centrals/[id] - Actualizar Central
 * DELETE /api/superadmin/centrals/[id] - Eliminar Central
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { updateCentralFinancials, propagateCentralImages } from '../../../../../lib/central-bulk-update';

export const dynamic = 'force-dynamic';

/**
 * PATCH - Actualizar Central
 * Soporta actualización masiva de valores financieros
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
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
      legalName,
      logoUrl,
      bannerUrl,
      commissionPercentage,
      freeFeeThreshold,
      lowOrderFee,
      isActive,
      propagateFinancials = false, // Si true, actualiza también los restaurantes
      centralAdminEmail,
    } = body;

    // Verificar que la Central existe
    const existing = await (prisma as any).central.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Central no encontrada' },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName || null;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl || null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Validar y convertir valores financieros
    if (commissionPercentage !== undefined) {
      const commission = parseFloat(String(commissionPercentage));
      if (isNaN(commission) || commission < 0 || commission > 100) {
        return NextResponse.json(
          { success: false, error: 'commissionPercentage debe estar entre 0 y 100' },
          { status: 400 }
        );
      }
      updateData.commissionPercentage = commission;
    }

    if (freeFeeThreshold !== undefined) {
      const threshold = Math.round(parseFloat(String(freeFeeThreshold)) * 100);
      if (threshold < 0) {
        return NextResponse.json(
          { success: false, error: 'freeFeeThreshold debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.freeFeeThreshold = threshold;
    }

    if (lowOrderFee !== undefined) {
      const fee = Math.round(parseFloat(String(lowOrderFee)) * 100);
      if (fee < 0) {
        return NextResponse.json(
          { success: false, error: 'lowOrderFee debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.lowOrderFee = fee;
    }

    // Actualizar Central
    const central = await (prisma as any).central.update({
      where: { id },
      data: updateData,
    });

    // Si se solicita, propagar valores financieros a restaurantes
    if (propagateFinancials && (commissionPercentage !== undefined || freeFeeThreshold !== undefined || lowOrderFee !== undefined)) {
      await updateCentralFinancials(
        id,
        updateData.commissionPercentage ?? existing.commissionPercentage,
        updateData.freeFeeThreshold ?? existing.freeFeeThreshold,
        updateData.lowOrderFee ?? existing.lowOrderFee
      );
    }

    // Propagar logo y banner a todos los restaurantes asociados cuando se actualizan
    if (logoUrl !== undefined || bannerUrl !== undefined) {
      await propagateCentralImages(
        id,
        logoUrl !== undefined ? (logoUrl || null) : undefined,
        bannerUrl !== undefined ? (bannerUrl || null) : undefined
      );
    }

    // Asignar administrador central si se proporcionó
    if (centralAdminEmail !== undefined) {
      if (centralAdminEmail && centralAdminEmail.trim()) {
        const email = centralAdminEmail.toLowerCase().trim();
        let adminUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!adminUser) {
          // Crear nuevo usuario como central_admin
          adminUser = await prisma.user.create({
            data: {
              email,
              role: 'central_admin',
              centralId: id,
              isActive: true,
            },
          });
        } else {
          // Actualizar usuario existente
          adminUser = await prisma.user.update({
            where: { id: adminUser.id },
            data: {
              role: 'central_admin',
              centralId: id,
              restaurantId: null, // Remover asignación de restaurante si existía
            },
          });
        }
      } else {
        // Si se envía un string vacío, remover todos los administradores centrales de esta central
        await prisma.user.updateMany({
          where: {
            centralId: id,
            role: 'central_admin',
          },
          data: {
            centralId: null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { central },
    });
  } catch (error: any) {
    console.error('Error updating central:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar central',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar Central
 * ⚠️ ADVERTENCIA: Esto no eliminará restaurantes (centralId se setea a NULL)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
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

    // Verificar que existe
    const central = await (prisma as any).central.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurants: true,
            masterProducts: true,
            users: true,
          },
        },
      },
    });

    if (!central) {
      return NextResponse.json(
        { success: false, error: 'Central no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si tiene restaurantes asociados
    if (central._count.restaurants > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar. Tiene ${central._count.restaurants} restaurante(s) asociado(s). Primero desasocia los restaurantes.`,
        },
        { status: 400 }
      );
    }

    // Eliminar (CASCADE eliminará MasterProducts y BranchProducts automáticamente)
    await (prisma as any).central.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Central eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting central:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar central',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

