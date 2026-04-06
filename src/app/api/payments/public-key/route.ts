import { NextResponse } from 'next/server';

/**
 * API endpoint to get Wompi public key
 * This ensures the public key is available to client components
 * even if NEXT_PUBLIC_* variables aren't properly exposed
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

    if (!publicKey) {
      return NextResponse.json(
        { success: false, error: 'Wompi public key not configured' },
        { status: 500 }
      );
    }

    // Validate format
    if (!publicKey.startsWith('pub_test_') && !publicKey.startsWith('pub_prod_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Wompi public key format' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicKey,
    });
  } catch (error) {
    console.error('Error getting Wompi public key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

