/**
 * PATCH /api/superadmin/users/[id] - Update user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['student', 'restaurant_admin', 'superadmin']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    // Prevent changing superadmin role (security)
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (
      existingUser?.role === 'superadmin' &&
      validated.role &&
      validated.role !== 'superadmin'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede cambiar el rol de un superadmin',
        },
        { status: 403 }
      );
    }

    // Prevent creating new superadmins (only via direct DB)
    if (
      validated.role === 'superadmin' &&
      existingUser?.role !== 'superadmin'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede asignar rol de superadmin desde esta interfaz',
        },
        { status: 403 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: validated,
      include: {
        place: {
          select: {
            id: true,
            name: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        credits: {
          select: {
            balance: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}
