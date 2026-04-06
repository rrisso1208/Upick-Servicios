/**
 * Security helpers for API routes
 * Combines rate limiting and CSRF protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIP } from './rate-limit';
import { validateCSRFToken, requireCSRFToken } from './csrf';
import logger from './logger';

export interface SecurityOptions {
  rateLimiter?: (req: NextRequest, userId?: string) => {
    success: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
  };
  requireCSRF?: boolean;
  requireAuth?: boolean;
  getUserId?: (req: NextRequest) => Promise<string | undefined>;
}

/**
 * Security middleware for API routes
 * Applies rate limiting and CSRF protection
 */
export async function applySecurity(
  req: NextRequest,
  options: SecurityOptions = {}
): Promise<NextResponse | null> {
  const {
    rateLimiter,
    requireCSRF = true,
    requireAuth = false,
    getUserId,
  } = options;

  // Apply rate limiting if provided
  if (rateLimiter) {
    let userId: string | undefined;
    if (getUserId) {
      userId = await getUserId(req);
    }

    const rateLimitResult = rateLimiter(req, userId);

    if (!rateLimitResult.success) {
      logger.warn(
        {
          ip: getClientIP(req),
          userId,
          path: req.nextUrl.pathname,
        },
        'Rate limit exceeded'
      );

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(
            (rateLimitResult.resetAt - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }
  }

  // Apply CSRF protection for state-changing methods
  if (requireCSRF) {
    const method = req.method.toUpperCase();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      try {
        // Get CSRF token from header
        const headerToken = req.headers.get('X-CSRF-Token') || req.headers.get('x-csrf-token');
        
        if (!headerToken) {
          logger.warn(
            {
              ip: getClientIP(req),
              path: req.nextUrl.pathname,
              method,
              headerKeys: Array.from(req.headers.keys()),
            },
            'CSRF token missing from header'
          );
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }

        // Get token from cookie
        const { getCSRFToken } = await import('./csrf');
        const cookieToken = await getCSRFToken();

        if (!cookieToken) {
          logger.warn(
            {
              ip: getClientIP(req),
              path: req.nextUrl.pathname,
              method,
            },
            'CSRF token missing from cookie'
          );
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }

        // Compare tokens (constant-time comparison)
        const { constantTimeEquals } = await import('./csrf');
        const isValid = constantTimeEquals(headerToken, cookieToken);

        if (!isValid) {
          logger.warn(
            {
              ip: getClientIP(req),
              path: req.nextUrl.pathname,
              method,
              headerTokenPreview: headerToken.substring(0, 10) + '...',
              cookieTokenPreview: cookieToken.substring(0, 10) + '...',
            },
            'CSRF token mismatch'
          );
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }
      } catch (error) {
        logger.warn(
          {
            ip: getClientIP(req),
            path: req.nextUrl.pathname,
            method,
            error: error instanceof Error ? error.message : String(error),
          },
          'CSRF validation error'
        );

        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Return null if security checks pass
  return null;
}

/**
 * Helper to get user ID from request (for authenticated endpoints)
 */
export async function getUserIdFromRequest(
  req: NextRequest
): Promise<string | undefined> {
  try {
    // Try to get user from Supabase session
    const { createSupabaseServerClient } = await import('./auth');
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
  } catch {
    return undefined;
  }
}

