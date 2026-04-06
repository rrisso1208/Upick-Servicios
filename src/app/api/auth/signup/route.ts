/**
 * POST /api/auth/signup
 * Create user record in database after Supabase signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { z } from 'zod';
import logger from '../../../../lib/logger';
import { rateLimiters } from '../../../../lib/rate-limit';
import {
  sanitizeEmail,
  sanitizeString,
  sanitizePhoneNumber,
} from '../../../../lib/input-sanitization';
import { applySecurity } from '../../../../lib/api-security';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

const signupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().min(7).max(20), // obligatorio
  documentNumber: z.string().min(5).max(30), // obligatorio (cédula)
  documentType: z
    .enum(['CC', 'TI', 'CE', 'PP', 'NIT'])
    .default('CC'),
  role: z.enum(['student', 'restaurant_admin', 'superadmin']).default('student'),

  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
  acceptedAt: z.string(),
  termsVersion: z.string(),
  privacyVersion: z.string(),

  placeId: z.string().cuid().optional(),
  universityId: z.string().cuid().optional(),
  restaurantId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  // Apply security: rate limiting (5/min for auth) and CSRF protection
  const securityResponse = await applySecurity(req, {
    rateLimiter: rateLimiters.auth,
    requireCSRF: true,
  });

  if (securityResponse) {
    return securityResponse;
  }

  try {
    const body = await req.json();
    const validated = signupSchema.parse(body);

    if (!validated.acceptedTerms || !validated.acceptedPrivacy) {
      return NextResponse.json(
        { success: false, error: 'Debe aceptar términos y política de privacidad' },
        { status: 400 }
      );
    }

    // Sanitize and normalize email
    const sanitizedEmail = sanitizeEmail(validated.email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    const normalizedEmail = sanitizedEmail;
    const sanitizedFirstName = sanitizeString(validated.firstName);
    const sanitizedLastName = sanitizeString(validated.lastName);

    // Sanitizar teléfono
    const sanitizedPhone = sanitizePhoneNumber(validated.phoneNumber);
    if (!sanitizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Teléfono inválido' },
        { status: 400 }
      );
    }

    // Sanitizar número de documento (cédula)
    const sanitizedDocumentNumber = sanitizeString(validated.documentNumber);
    if (!sanitizedDocumentNumber) {
      return NextResponse.json(
        { success: false, error: 'Número de documento inválido' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      logger.info(
        { userId: existing.id, email: existing.email },
        'User already exists in database, updating information'
      );

      const updatedUser = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          firstName: sanitizedFirstName || existing.firstName,
          lastName: sanitizedLastName || existing.lastName,
          phoneNumber: sanitizedPhone,
          documentNumber: sanitizedDocumentNumber,
          documentType: validated.documentType, // ✅ NUEVO
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        phoneNumber: sanitizedPhone,
        documentNumber: sanitizedDocumentNumber,
        documentType: validated.documentType,
        role: validated.role,
        placeId: validated.placeId || validated.universityId,
        restaurantId: validated.restaurantId,
        isActive: true,

        acceptedTerms: validated.acceptedTerms,
        acceptedPrivacy: validated.acceptedPrivacy,
        acceptedAt: new Date(validated.acceptedAt),
        termsVersion: validated.termsVersion,
        privacyVersion: validated.privacyVersion,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User created');

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Signup failed');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}