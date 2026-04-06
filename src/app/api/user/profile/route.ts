/**
 * PATCH /api/user/profile
 * Update user profile (firstName, lastName, phoneNumber)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import { z } from 'zod';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().nullable().optional(),
  documentType: z.enum(['CC', 'CE', 'NIT', 'TI', 'PP']).nullable().optional(),
  documentNumber: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Invalid or expired token' },
          { status: 401 }
        );
      }
    } else {
      try {
        user = await getAuthUser();
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized - No valid authentication found',
          },
          { status: 401 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const updateData: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string | null;
      documentType?: 'CC' | 'CE' | 'NIT' | 'TI' | 'PP' | null;
      documentNumber?: string | null;
    } = {};

    if (validated.firstName !== undefined) {
      updateData.firstName = validated.firstName;
    }
    if (validated.lastName !== undefined) {
      updateData.lastName = validated.lastName;
    }
    if (validated.phoneNumber !== undefined) {
      // Normalize phone number: remove spaces and non-digit characters
      const cleaned = validated.phoneNumber
        ? validated.phoneNumber.replace(/\D/g, '')
        : null;
      updateData.phoneNumber = cleaned || null;
    }
    if (validated.documentType !== undefined) {
      updateData.documentType = validated.documentType;
    }
    if (validated.documentNumber !== undefined) {
      updateData.documentNumber = validated.documentNumber;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        documentType: true,
        documentNumber: true,
        role: true,
      },
    });

    logger.info(
      {
        userId: user.id,
        updatedFields: Object.keys(updateData),
      },
      'User profile updated'
    );

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        { error: error.errors },
        'Validation error updating profile'
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error updating user profile'
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar perfil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
