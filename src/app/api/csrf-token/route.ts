/**
 * API endpoint to get CSRF token for client-side use
 * This endpoint should be called from the client to get the CSRF token
 * which is stored in an httpOnly cookie
 */

import { NextResponse } from 'next/server';
import { getOrCreateCSRFToken } from '../../../lib/csrf';

export async function GET() {
  try {
    // Get or create CSRF token (stored in httpOnly cookie)
    // This function automatically sets the cookie
    const token = await getOrCreateCSRFToken();

    // Return token in response body for client-side use
    // The cookie is automatically set by getOrCreateCSRFToken via setCSRFToken
    return NextResponse.json(
      { csrfToken: token },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

