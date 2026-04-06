/**
 * POST /api/superadmin/restaurants/[id]/assign-admin - Assign or create admin for restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: restaurantId } = await params;
    const body = await req.json();
    const { email, firstName, lastName, phoneNumber, createNew } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { place: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    if (createNew) {
      // Create new admin user
      if (!firstName || !lastName) {
        return NextResponse.json(
          { success: false, error: 'Nombre y apellido son requeridos' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un usuario con ese email' },
          { status: 400 }
        );
      }

      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          role: 'restaurant_admin',
          restaurantId,
          placeId: restaurant.placeId,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { user },
        message: `Administrador creado. El usuario debe registrarse en Supabase con el email: ${email}`,
      });
    } else {
      // Assign existing user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado con ese email' },
          { status: 404 }
        );
      }

      // Update user to be admin of this restaurant
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'restaurant_admin',
          restaurantId,
          placeId: restaurant.placeId,
        },
      });

      return NextResponse.json({
        success: true,
        data: { user: updatedUser },
        message: 'Administrador asignado exitosamente',
      });
    }
  } catch (error) {
    console.error('Error assigning admin:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar administrador' },
      { status: 500 }
    );
  }
}

