/**
 * PATCH /api/central-admin/products/[id] - Actualizar MasterProduct
 * DELETE /api/central-admin/products/[id] - Eliminar MasterProduct
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { syncMasterProductToBranches, syncMasterOptionsToLocalProducts } from '../../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

/**
 * PATCH - Actualizar MasterProduct
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

    if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = (user as any).centralId;
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
    promotionPrice,
    isFeatured,
    prepMinutes,
    masterCategoryId,
    specs,
      isGloballyAvailable,
    } = body;

    // Verificar que el producto pertenece a la Central del usuario
    const existing = await (prisma as any).masterProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (existing.centralId !== centralId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para modificar este producto' },
        { status: 403 }
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
  if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured;
  if (prepMinutes !== undefined) updateData.prepMinutes = prepMinutes;
  if (masterCategoryId !== undefined) {
    if (!masterCategoryId) {
      updateData.masterCategoryId = null;
      updateData.categoryName = null;
      updateData.categorySort = 0;
      updateData.saleHoursStart = null;
      updateData.saleHoursEnd = null;
    } else {
      const category = await (prisma as any).masterCategory.findUnique({
        where: { id: masterCategoryId },
      });
      if (!category || category.centralId !== centralId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Categoría maestra no encontrada o no pertenece a la Central',
          },
          { status: 400 }
        );
      }
      updateData.masterCategoryId = category.id;
      updateData.categoryName = category.name;
      updateData.categorySort = category.sort;
      updateData.saleHoursStart = category.saleHoursStart;
      updateData.saleHoursEnd = category.saleHoursEnd;
    }
  }
  if (specs !== undefined) updateData.specs = specs ?? null;
    if (typeof isGloballyAvailable === 'boolean') {
      updateData.isGloballyAvailable = isGloballyAvailable;
    }

    if (basePrice !== undefined) {
      const basePriceCents = Math.round(parseFloat(String(basePrice)) * 100);
      if (basePriceCents < 0) {
        return NextResponse.json(
          { success: false, error: 'basePrice debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.basePrice = basePriceCents;
    }

  if (promotionPrice !== undefined) {
    if (promotionPrice === null || promotionPrice === '') {
      updateData.promotionPrice = null;
    } else {
      const promoCents = Math.round(parseFloat(String(promotionPrice)) * 100);
      if (promoCents < 0) {
        return NextResponse.json(
          { success: false, error: 'promotionPrice debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.promotionPrice = promoCents;
    }
  }

    // Actualizar MasterProduct
    const masterProduct = await (prisma as any).masterProduct.update({
      where: { id },
      data: updateData,
    });

    // Si se cambiaron campos que afectan a las tiendas (precio, promo, destacado, prep, specs o disponibilidad),
    // sincronizar BranchProducts para asegurar consistencia
    if (
      isGloballyAvailable !== undefined ||
      basePrice !== undefined ||
      promotionPrice !== undefined ||
      typeof isFeatured === 'boolean' ||
      prepMinutes !== undefined ||
      specs !== undefined
    ) {
      await syncMasterProductToBranches(id);
    }

    // Sincronizar opciones maestras a productos locales
    // Esto asegura que cualquier cambio en el producto se refleje en las opciones locales
    await syncMasterOptionsToLocalProducts(id);

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

    if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = (user as any).centralId;
    const { id } = await params;

    // Verificar que el producto pertenece a la Central del usuario
    const existing = await (prisma as any).masterProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (existing.centralId !== centralId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para eliminar este producto' },
        { status: 403 }
      );
    }

    // Eliminar (CASCADE eliminará BranchProducts automáticamente)
    await (prisma as any).masterProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
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

