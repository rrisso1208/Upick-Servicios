/**
 * POST /api/auth/2fa/setup
 * Generate 2FA secret for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generate2FASecret, is2FARequired } from '@/lib/two-factor';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if 2FA is required for this role
    if (!is2FARequired(user.role)) {
      return NextResponse.json(
        { error: '2FA is not required for your role' },
        { status: 403 }
      );
    }

    // Generate 2FA secret
    const secretData = await generate2FASecret(user.email);

    // Store secret in database (not enabled yet, user needs to verify first)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secretData.secret,
        twoFactorEnabled: false,
      },
    });

    logger.info({ userId: user.id }, '2FA secret generated');

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: secretData.qrCodeUrl,
        manualEntryKey: secretData.manualEntryKey,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to setup 2FA');
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
}
