/**
 * GET /api/central-admin/products - Listar MasterProducts de la Central del usuario
 * POST /api/central-admin/products - Crear MasterProduct
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { syncMasterProductToBranches, syncMasterOptionsToLocalProducts } from '../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

/**
 * GET - Listar MasterProducts de la Central del usuario
 */
export async function GET(req: NextRequest) {
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

    const masterProducts = await (prisma as any).masterProduct.findMany({
      where: {
        centralId,
      },
      include: {
        masterCategory: true,
        _count: {
          select: {
            branchProducts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { masterProducts },
    });
  } catch (error) {
    console.error('Error fetching master products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos maestros' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear MasterProduct y sincronizar a todos los restaurantes de la Central
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
      const {
        name,
        description,
        imageUrl,
        imagePosition = 'center',
        imageScale = 1.0,
        sku,
        basePrice,
        promotionPrice,
        isFeatured = false,
        prepMinutes = 10,
        masterCategoryId,
        specs,
        isGloballyAvailable = true,
      } = body;

    // Validaciones
    if (!name || basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos (name, basePrice)' },
        { status: 400 }
      );
    }

    // Convertir basePrice a centavos si viene en pesos
    const basePriceCents = Math.round(parseFloat(String(basePrice)) * 100);

    if (basePriceCents < 0) {
      return NextResponse.json(
        { success: false, error: 'basePrice debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Verificar que la Central existe
    const central = await (prisma as any).central.findUnique({
      where: { id: centralId },
    });

    if (!central) {
      return NextResponse.json(
        { success: false, error: 'Central no encontrada' },
        { status: 404 }
      );
    }

    // Crear MasterProduct y sincronizar en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear MasterProduct
      let categoryData: any = {};
      if (masterCategoryId) {
        const category = await (tx as any).masterCategory.findUnique({
          where: { id: masterCategoryId },
        });
        if (!category || category.centralId !== centralId) {
          throw new Error('Categoría maestra no encontrada o no pertenece a la Central');
        }
        categoryData = {
          masterCategoryId: category.id,
          categoryName: category.name,
          categorySort: category.sort,
          saleHoursStart: category.saleHoursStart,
          saleHoursEnd: category.saleHoursEnd,
        };
      }

      const masterProduct = await (tx as any).masterProduct.create({
        data: {
          centralId,
          name,
          description: description || null,
          imageUrl: imageUrl || null,
          imagePosition,
          imageScale,
          sku: sku || null,
          basePrice: basePriceCents,
          promotionPrice:
            promotionPrice !== undefined && promotionPrice !== null
              ? Math.round(parseFloat(String(promotionPrice)) * 100)
              : null,
          isFeatured,
          prepMinutes,
          specs: specs ?? null,
          isGloballyAvailable,
          ...categoryData,
        },
      });

      // 2. Sincronizar a todos los restaurantes de la Central
      await syncMasterProductToBranches(masterProduct.id, tx);

      // 3. Sincronizar opciones maestras a productos locales (si hay opciones)
      // La función syncMasterOptionsToLocalProducts obtiene todos los restaurantes internamente
      await syncMasterOptionsToLocalProducts(masterProduct.id, tx);

      return masterProduct;
    });

    return NextResponse.json({
      success: true,
      data: { masterProduct: result },
    });
  } catch (error: any) {
    console.error('Error creating master product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear producto maestro',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

