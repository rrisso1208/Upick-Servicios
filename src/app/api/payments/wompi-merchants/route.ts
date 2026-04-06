import { NextResponse } from 'next/server';
import { env } from '../../../../lib/env';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

function normalizeWompiBaseUrl(raw: string) {
  // quita trailing slash
  let base = raw.replace(/\/+$/, '');

  // si no termina en /v1, se lo ponemos
  if (!base.endsWith('/v1')) base = `${base}/v1`;

  return base;
}

export async function GET() {
  try {
    logger.info('Fetching Wompi acceptance token...');

    // ✅ Mejor usar key server-side también (si la tienes)
    // Si solo tienes NEXT_PUBLIC_, igual sirve, pero asegúrate que exista en prod.
    const publicKey =
      env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || (env as any).WOMPI_PUBLIC_KEY;

    if (!publicKey) {
      logger.error('Wompi public key not configured');
      return NextResponse.json(
        { success: false, error: 'Wompi public key not configured' },
        { status: 500 }
      );
    }

    let apiUrl = env.WOMPI_API_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { success: false, error: 'WOMPI_API_URL not configured' },
        { status: 500 }
      );
    }

    // ✅ normaliza: asegura /v1
    apiUrl = normalizeWompiBaseUrl(apiUrl);

    // ✅ Ajuste ambiente vs key (tu lógica, pero con base normalizada)
    const isProdKey = publicKey.startsWith('pub_prod_');
    const isTestKey = publicKey.startsWith('pub_test_');

    if (isProdKey && apiUrl.includes('sandbox')) {
      apiUrl = 'https://production.wompi.co/v1';
      logger.warn(
        { apiUrl, publicKeyPrefix: publicKey.substring(0, 12) },
        'WOMPI_API_URL was sandbox but public key is prod, overriding'
      );
    } else if (isTestKey && apiUrl.includes('production')) {
      apiUrl = 'https://sandbox.wompi.co/v1';
      logger.warn(
        { apiUrl, publicKeyPrefix: publicKey.substring(0, 12) },
        'WOMPI_API_URL was production but public key is test, overriding'
      );
    }

    const endpoint = `${apiUrl}/merchants/${publicKey}`;

    logger.info(
      {
        publicKeyPrefix: publicKey.substring(0, 20) + '...',
        wompiApiUrl: apiUrl,
        endpoint,
      },
      'Calling Wompi merchants endpoint'
    );

    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const text = await response.text().catch(() => '');

    if (!response.ok) {
      logger.error(
        {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          bodyPreview: text.substring(0, 800),
        },
        'Failed to fetch merchant info from Wompi'
      );

      // ✅ Devuelve el error real (no “500 genérico”)
      return NextResponse.json(
        {
          success: false,
          error: `Wompi error ${response.status}`,
          details: text.substring(0, 1200),
          endpoint,
        },
        { status: 502 }
      );
    }

    const data = text ? JSON.parse(text) : null;

    const presignedAcceptance = data?.data?.presigned_acceptance;

    if (!presignedAcceptance?.acceptance_token) {
      logger.error(
        {
          endpoint,
          hasData: !!data,
          keys: data ? Object.keys(data) : [],
          dataKeys: data?.data ? Object.keys(data.data) : [],
        },
        'No presigned_acceptance.acceptance_token in Wompi response'
      );

      return NextResponse.json(
        { success: false, error: 'No acceptance token in Wompi response', raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        acceptanceToken: presignedAcceptance.acceptance_token,
        permalink: presignedAcceptance.permalink,
        type: presignedAcceptance.type,
      },
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error fetching Wompi merchant info'
    );
    return NextResponse.json(
      { success: false, error: 'Failed to fetch merchant info' },
      { status: 500 }
    );
  }
}