/**
 * PATCH /api/superadmin/master-products/[id] - Actualizar MasterProduct
 * DELETE /api/superadmin/master-products/[id] - Eliminar MasterProduct
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser } from '../../../../../lib/auth';
import { updateGlobalAvailability } from '../../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

/**
 * PATCH - Actualizar MasterProduct
 * Soporta actualización masiva de precios y disponibilidad global (Panic Button)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
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
      description,
      imageUrl,
      imagePosition,
      imageScale,
      sku,
      basePrice,
      isGloballyAvailable,
    } = body;

    // Verificar que el MasterProduct existe
    const existing = await (prisma as any).masterProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'MasterProduct no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (imagePosition !== undefined) updateData.imagePosition = imagePosition;
    if (imageScale !== undefined) updateData.imageScale = imageScale;
    if (sku !== undefined) updateData.sku = sku || null;

    if (basePrice !== undefined) {
      // Convertir a centavos si viene en pesos
      const basePriceCents = Math.round(parseFloat(String(basePrice)) * 100);
      if (basePriceCents < 0) {
        return NextResponse.json(
          { success: false, error: 'basePrice debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.basePrice = basePriceCents;
    }

    // Actualizar disponibilidad global (Panic Button)
    if (isGloballyAvailable !== undefined) {
      updateData.isGloballyAvailable = isGloballyAvailable;
      // Actualizar también usando la función de sincronización
      await updateGlobalAvailability(id, isGloballyAvailable);
    }

    // Actualizar MasterProduct
    const masterProduct = await (prisma as any).masterProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { masterProduct },
    });
  } catch (error: any) {
    console.error('Error updating master product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar producto maestro',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar MasterProduct
 * Esto también eliminará todos los BranchProducts relacionados (CASCADE)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verificar que existe
    const masterProduct = await (prisma as any).masterProduct.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            branchProducts: true,
          },
        },
      },
    });

    if (!masterProduct) {
      return NextResponse.json(
        { success: false, error: 'MasterProduct no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar (CASCADE eliminará BranchProducts automáticamente)
    await (prisma as any).masterProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `MasterProduct eliminado. Se eliminaron ${masterProduct._count.branchProducts} instancias en restaurantes.`,
    });
  } catch (error: any) {
    console.error('Error deleting master product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar producto maestro',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

