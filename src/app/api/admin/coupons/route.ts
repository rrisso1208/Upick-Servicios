/**
 * GET /api/admin/coupons - Get restaurant coupons
 * POST /api/admin/coupons - Create coupon
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createCouponSchema = z.object({
  code: z.string().min(3).max(50),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().int().min(1),
  minOrderAmount: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  oneTimePerUser: z.boolean().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { coupons },
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createCouponSchema.parse(body);

    // Validate dates
    const validFrom = new Date(validated.validFrom);
    const validUntil = new Date(validated.validUntil);

    if (validUntil <= validFrom) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de fin debe ser posterior a la de inicio',
        },
        { status: 400 }
      );
    }

    // Validate discount value
    if (
      validated.discountType === 'percentage' &&
      validated.discountValue > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento porcentual no puede ser mayor a 100%',
        },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: validated.code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'El código de cupón ya existe' },
        { status: 400 }
      );
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: validated.code.toUpperCase(),
        restaurantId,
        discountType: validated.discountType,
        discountValue: validated.discountValue,
        minOrderAmount: validated.minOrderAmount || null,
        maxUses: validated.maxUses || null,
        oneTimePerUser: validated.oneTimePerUser || false,
        validFrom,
        validUntil,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { coupon },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
