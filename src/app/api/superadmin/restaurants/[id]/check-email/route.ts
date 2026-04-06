/**
 * POST /api/superadmin/restaurants/[id]/check-email - Check if email exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    let user = await getAuthUser();
    if (!user) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        user = await getAuthUserFromHeader(authHeader);
      }
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        exists: true,
        user: {
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role,
          restaurantName: existingUser.restaurant?.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar email' },
      { status: 500 }
    );
  }
}
