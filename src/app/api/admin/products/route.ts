/**
 * GET /api/admin/products - Get restaurant products
 * POST /api/admin/products - Create product
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';
import logger from '../../../../lib/logger';
import { rateLimiters } from '../../../../lib/rate-limit';
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeUrl,
} from '../../../../lib/input-sanitization';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        category: {
          restaurantId,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            sort: true,
          },
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
      orderBy: [
        { category: { sort: 'asc' } },
        { sort: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimiters.standard(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
        },
      }
    );
  }

  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Sanitize inputs
    const name = sanitizeString(body.name);
    const displayName = body.displayName
      ? sanitizeString(body.displayName)
      : null; // Nombre comercial personalizado
    const description = sanitizeString(body.description);
    const price = sanitizeNumber(body.price);
    const categoryId = body.categoryId ? sanitizeString(body.categoryId) : null;
    const prepMinutes = sanitizeInteger(body.prepMinutes);
    const imageUrl = body.imageUrl ? sanitizeUrl(body.imageUrl) : null;
    const imagePosition = sanitizeString(body.imagePosition || 'center');
    const imageScale = sanitizeNumber(body.imageScale || 1.0);
    const isFeatured = Boolean(body.isFeatured);
    const promotionPrice = body.promotionPrice
      ? sanitizeNumber(body.promotionPrice)
      : null;
    const inventoryEnabled =
      body.inventoryEnabled === true || body.inventoryEnabled === 'true';
    const inventoryQuantity =
      inventoryEnabled &&
      body.inventoryQuantity !== null &&
      body.inventoryQuantity !== undefined &&
      body.inventoryQuantity !== ''
        ? sanitizeInteger(body.inventoryQuantity)
        : null;
    const inventoryAlertThreshold =
      inventoryEnabled &&
      body.inventoryAlertThreshold !== null &&
      body.inventoryAlertThreshold !== undefined &&
      body.inventoryAlertThreshold !== ''
        ? sanitizeInteger(body.inventoryAlertThreshold)
        : null;

    logger.info(
      {
        name,
        price,
        categoryId,
        prepMinutes,
        restaurantId,
      },
      'Creating product'
    );

    if (!name || price === undefined || price === null || !categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos',
          details:
            `Missing: ${!name ? 'name' : ''} ${price === undefined || price === null ? 'price' : ''} ${!categoryId ? 'categoryId' : ''}`.trim(),
        },
        { status: 400 }
      );
    }

    // Validate price is a number
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El precio debe ser un número válido mayor a 0',
        },
        { status: 400 }
      );
    }

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Categoría no válida o no pertenece a este restaurante',
        },
        { status: 400 }
      );
    }

    // Get max sort value for this category to add new product at the end
    const maxSort = await prisma.product.findFirst({
      where: { categoryId },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        displayName: displayName?.trim() || null, // Nombre comercial personalizado
        description: description?.trim() || null,
        price: Math.round(priceNum * 100), // Convert to cents
        promotionPrice: promotionPrice
          ? Math.round(
              (typeof promotionPrice === 'string'
                ? parseFloat(promotionPrice)
                : promotionPrice) * 100
            )
          : null,
        restaurantId, // Required field
        categoryId,
        prepMinutes: prepMinutes ? parseInt(String(prepMinutes)) : 10,
        imageUrl: imageUrl?.trim() || null,
        imagePosition: imagePosition || 'center',
        imageScale: imageScale || 1.0,
        isFeatured: isFeatured === true,
        isActive: true,
        sort: (maxSort?.sort ?? -1) + 1,
        inventoryEnabled,
        inventoryQuantity:
          inventoryEnabled && inventoryQuantity !== null
            ? parseInt(String(inventoryQuantity))
            : null,
        inventoryAlertThreshold:
          inventoryEnabled && inventoryAlertThreshold !== null
            ? parseInt(String(inventoryAlertThreshold))
            : null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error('Error creating product:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Return more detailed error for debugging
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear producto',
        details: error.message || 'Unknown error',
        code: error.code,
      },
      { status: 500 }
    );
  }
}
