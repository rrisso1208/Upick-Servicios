/**
 * POST /api/auth/magic-link
 * Send magic link for passwordless authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/auth';
import { z } from 'zod';
import logger from '../../../../lib/logger';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Send magic link via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      logger.error({ error: error.message }, 'Failed to send magic link');
      return NextResponse.json(
        { success: false, error: 'Failed to send magic link' },
        { status: 400 }
      );
    }

    logger.info({ email }, 'Magic link sent');

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Magic link error');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

