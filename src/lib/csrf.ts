/**
 * CSRF Protection utilities
 * Implements token-based CSRF protection for state-changing operations
 */

import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

const CSRF_TOKEN_COOKIE_NAME = 'csrf-token';
const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return nanoid(32);
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  });
}

/**
 * Get or create CSRF token
 * If token doesn't exist, creates a new one
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  let token = await getCSRFToken();
  if (!token) {
    token = generateCSRFToken();
    await setCSRFToken(token);
  }
  return token;
}

/**
 * Validate CSRF token from request
 * @param request - Next.js request object (Request or NextRequest)
 * @returns true if token is valid, false otherwise
 */
export async function validateCSRFToken(
  request: Request | { headers: Headers | { get: (name: string) => string | null } }
): Promise<boolean> {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  const method = 'method' in request ? request.method.toUpperCase() : 'POST';
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Get token from header - handle both Request and NextRequest
  const headers = request.headers;
  const headerToken = headers.get
    ? headers.get(CSRF_TOKEN_HEADER_NAME)
    : (headers as any)[CSRF_TOKEN_HEADER_NAME.toLowerCase()] || (headers as any)[CSRF_TOKEN_HEADER_NAME];

  if (!headerToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = await getCSRFToken();

  if (!cookieToken) {
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return constantTimeEquals(headerToken, cookieToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware helper to validate CSRF token in API routes
 * Throws error if validation fails
 */
export async function requireCSRFToken(
  request: Request | { headers: Headers | { get: (name: string) => string | null } }
): Promise<void> {
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    throw new Error('Invalid CSRF token');
  }
}

/**
 * Get CSRF token for client-side use
 * This should be called from a Server Component or API route
 * and passed to the client
 */
export async function getCSRFTokenForClient(): Promise<string> {
  return await getOrCreateCSRFToken();
}

