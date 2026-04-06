/**
 * PATCH /api/admin/coupons/[id] - Update coupon
 * DELETE /api/admin/coupons/[id] - Delete coupon
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().int().positive().optional(),
  minOrderAmount: z.number().int().nonnegative().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  oneTimePerUser: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateCouponSchema.parse(body);

    // Verify coupon belongs to restaurant
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon || coupon.restaurantId !== restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Update coupon - build update data object
    const updateData: any = {};

    if (validated.code !== undefined) {
      updateData.code = validated.code.toUpperCase();
    }
    if (validated.discountType !== undefined) {
      updateData.discountType = validated.discountType;
    }
    if (validated.discountValue !== undefined) {
      updateData.discountValue = validated.discountValue;
    }
    if (validated.minOrderAmount !== undefined) {
      updateData.minOrderAmount = validated.minOrderAmount;
    }
    if (validated.maxUses !== undefined) {
      updateData.maxUses = validated.maxUses;
    }
    if (validated.oneTimePerUser !== undefined) {
      updateData.oneTimePerUser = validated.oneTimePerUser;
    }
    if (validated.validFrom !== undefined) {
      updateData.validFrom = new Date(validated.validFrom);
    }
    if (validated.validUntil !== undefined) {
      updateData.validUntil = new Date(validated.validUntil);
    }
    if (validated.isActive !== undefined) {
      updateData.isActive = validated.isActive;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { coupon: updatedCoupon },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify coupon belongs to restaurant
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon || coupon.restaurantId !== restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Cupón no encontrado' },
        { status: 404 }
      );
    }

    // Delete coupon
    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Cupón eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
