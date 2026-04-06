/**
 * GET /api/student/payment-methods - Get saved payment methods
 * POST /api/student/payment-methods - Save payment method
 * DELETE /api/student/payment-methods - Delete payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const methods = await prisma.savedPaymentMethod.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { lastUsedAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: { methods },
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener métodos de pago' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      method,
      wompiPaymentSourceId,
      last4Digits,
      brand,
      bankName,
      isDefault,
    } = body;

    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Método de pago requerido' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const savedMethod = await prisma.savedPaymentMethod.create({
      data: {
        userId: user.id,
        method,
        wompiPaymentSourceId: wompiPaymentSourceId || null,
        last4Digits,
        brand,
        bankName,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedMethod,
    });
  } catch (error) {
    console.error('Error saving payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar método de pago' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const methodId = searchParams.get('id');

    if (!methodId) {
      return NextResponse.json(
        { success: false, error: 'ID del método de pago requerido' },
        { status: 400 }
      );
    }

    // Verify method belongs to user
    const method = await prisma.savedPaymentMethod.findFirst({
      where: {
        id: methodId,
        userId: user.id,
      },
    });

    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Método de pago no encontrado' },
        { status: 404 }
      );
    }

    await prisma.savedPaymentMethod.delete({
      where: { id: methodId },
    });

    return NextResponse.json({
      success: true,
      message: 'Método de pago eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar método de pago' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del método de pago requerido' },
        { status: 400 }
      );
    }

    // Verify method belongs to user
    const method = await prisma.savedPaymentMethod.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Método de pago no encontrado' },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedMethod = await prisma.savedPaymentMethod.update({
      where: { id },
      data: { isDefault: isDefault ?? method.isDefault },
    });

    return NextResponse.json({
      success: true,
      data: updatedMethod,
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar método de pago' },
      { status: 500 }
    );
  }
}
