/**
 * POST /api/auth/2fa/verify
 * Verify 2FA token and enable 2FA for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verify2FAToken, generateBackupCodes } from '@/lib/two-factor';
import { hashString } from '@/lib/hash';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  token: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = verifySchema.parse(body);

    // Get user with 2FA secret
    const userWith2FA = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true },
    });

    if (!userWith2FA?.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA not set up. Please setup 2FA first.' },
        { status: 400 }
      );
    }

    // Verify token
    const isValid = verify2FAToken(
      validated.token,
      userWith2FA.twoFactorSecret
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashString(code))
    );

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    logger.info({ userId: user.id }, '2FA enabled');

    return NextResponse.json({
      success: true,
      data: {
        backupCodes, // Return plain codes only once
        message: '2FA enabled successfully. Save your backup codes securely.',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Failed to verify 2FA');
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
