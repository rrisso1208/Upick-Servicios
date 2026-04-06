/**
 * POST /api/coupons/validate
 * Validate and get coupon details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  restaurantId: z.string().cuid(),
  orderAmount: z.number().int().min(0), // Order amount in cents
});

export async function POST(req: NextRequest) {
  try {
    // Try getting user from header first, then from cookies
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = validateCouponSchema.parse(body);

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: validated.code.toUpperCase() },
      include: {
        restaurant: true,
        place: true,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cupón no está activo' },
        { status: 400 }
      );
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return NextResponse.json(
        { success: false, error: 'Cupón fuera de vigencia' },
        { status: 400 }
      );
    }

    // Check if coupon applies to this restaurant
    if (coupon.restaurantId && coupon.restaurantId !== validated.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Cupón no válido para este restaurante' },
        { status: 400 }
      );
    }

    // Check minimum order amount
    if (
      coupon.minOrderAmount &&
      validated.orderAmount < coupon.minOrderAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `El pedido mínimo es ${(coupon.minOrderAmount / 100).toFixed(2)} COP`,
        },
        { status: 400 }
      );
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, error: 'Cupón agotado' },
        { status: 400 }
      );
    }

    // Check if user already used this coupon (oneTimePerUser)
    if (coupon.oneTimePerUser) {
      const existingRedemption = await prisma.couponRedemption.findFirst({
        where: {
          couponId: coupon.id,
          userId: user.id,
        },
      });

      if (existingRedemption) {
        return NextResponse.json(
          { success: false, error: 'Ya has usado este cupón anteriormente' },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.floor(
        (validated.orderAmount * coupon.discountValue) / 100
      );
    } else {
      discountAmount = Math.min(coupon.discountValue, validated.orderAmount);
    }

    return NextResponse.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    console.error('Error validating coupon:', error);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
