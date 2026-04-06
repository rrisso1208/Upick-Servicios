/**
 * GET /api/student/invoice-data - Get saved invoice data for current user
 * POST /api/student/invoice-data - Save/update invoice data for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth (for server-side requests)
    if (!user) {
      user = await getAuthUser();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const invoiceData = await prisma.invoiceData.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: { invoiceData },
    });
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos de facturación',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth (for server-side requests)
    if (!user) {
      user = await getAuthUser();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      personType,
      documentType,
      documentNumber,
      businessName,
      address,
      city,
      department,
      phone,
      email,
      regime,
    } = body;

    const normalizedPhone =
      typeof phone === 'string' ? phone.replace(/\D/g, '') : phone;

    // Validate required fields
    if (
      !personType ||
      !documentType ||
      !documentNumber ||
      !businessName ||
      !address ||
      !city ||
      !department ||
      !email
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos',
        },
        { status: 400 }
      );
    }

    // Email validation removed - users can use any email for invoicing

    // Régimen tributario es opcional para personas jurídicas

    // Upsert invoice data (create or update)
    const invoiceData = await prisma.invoiceData.upsert({
      where: { userId: user.id },
      update: {
        personType,
        documentType,
        documentNumber,
        businessName,
        address,
        city,
        department,
        phone: normalizedPhone || null,
        email,
        regime: regime || null,
      },
      create: {
        userId: user.id,
        personType,
        documentType,
        documentNumber,
        businessName,
        address,
        city,
        department,
        phone: normalizedPhone || null,
        email,
        regime: regime || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoiceData,
      message: 'Datos de facturación guardados exitosamente',
    });
  } catch (error: any) {
    console.error('Error saving invoice data:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe información de facturación para este usuario',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Error al guardar datos de facturación',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
