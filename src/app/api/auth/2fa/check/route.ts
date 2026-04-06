/**
 * POST /api/auth/2fa/check
 * Check if 2FA token is valid (for login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verify2FAToken } from '@/lib/two-factor';
import { verifyString } from '@/lib/hash';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const checkSchema = z.object({
  userId: z.string(),
  token: z.string(),
  backupCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = checkSchema.parse(body);

    // Get user with 2FA data
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    // Check backup code first if provided
    if (validated.backupCode && user.twoFactorBackupCodes) {
      let backupCodeMatched = false;
      const remainingBackupCodes: string[] = [];

      for (const hashedCode of user.twoFactorBackupCodes) {
        const isValid = await verifyString(validated.backupCode, hashedCode);
        if (isValid) {
          backupCodeMatched = true;
          // Don't add this code to remaining codes
        } else {
          remainingBackupCodes.push(hashedCode);
        }
      }

      if (backupCodeMatched) {
        // Remove used backup code
        await prisma.user.update({
          where: { id: validated.userId },
          data: {
            twoFactorBackupCodes: remainingBackupCodes,
          },
        });

        logger.info({ userId: validated.userId }, '2FA verified with backup code');
        return NextResponse.json({ success: true, verified: true });
      }
    }

    // Verify TOTP token
    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA secret not found' },
        { status: 400 }
      );
    }

    const isValid = verify2FAToken(validated.token, user.twoFactorSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      );
    }

    logger.info({ userId: validated.userId }, '2FA verified with TOTP');
    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Failed to check 2FA');
    return NextResponse.json(
      { error: 'Failed to check 2FA' },
      { status: 500 }
    );
  }
}

