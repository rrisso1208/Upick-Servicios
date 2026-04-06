/**
 * Wompi Payment Gateway Integration
 * Documentation: https://docs.wompi.co
 */

import { env } from '../env';
import logger from '../logger';
import crypto from 'crypto';

export interface WompiTransactionRequest {
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method?: {
    type: 'PSE' | 'CARD';
    user_type?: number; // 0=person, 1=company (for PSE)
    user_legal_id_type?: string; // CC, NIT, etc
    user_legal_id?: string;
    financial_institution_code?: string;
  };
  reference: string; // Order ID
  redirect_url?: string;
  payment_source_id?: number;
}

export async function createPaymentSourceFromToken(params: {
  token: string;
  customerEmail: string;
  acceptanceToken: string;
}) {
  const resp = await fetch(`${env.WOMPI_API_URL}/payment_sources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
    },
    body: JSON.stringify({
      type: 'CARD',
      token: params.token,
      customer_email: params.customerEmail,
      acceptance_token: params.acceptanceToken,
    }),
  });

  const text = await resp.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!resp.ok) {
    throw new Error(
      `Failed to create payment_source: ${resp.status} ${data?.error?.reason || data?.message || text}`
    );
  }

  return data; // normalmente { data: { id, ... } }
}


export async function getMerchantAcceptanceToken() {
  // OJO: esto usa PUBLIC KEY
  const resp = await fetch(`${env.WOMPI_API_URL}/merchants/${env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
  const json = await resp.json();
  const token = json?.data?.presigned_acceptance?.acceptance_token;
  if (!token) throw new Error('Missing acceptance_token from merchants');
  return token as string;
}

export interface WompiTransactionResponse {
  data: {
    id: string;
    created_at: string;
    amount_in_cents: number;
    reference: string;
    currency: string;
    payment_method_type: string;
    redirect_url?: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
    status_message: string;
    finalized_at?: string; // Timestamp when transaction was finalized
    payment_link_id?: string;
    payment_link?: {
      id: string;
      url: string;
    };
    payment_source_id?: string; // ID of the payment source (token) if tokenized
  };
}

export interface WompiWebhookPayload {
  event: string; // e.g., "transaction.updated"
  data: {
    transaction: {
      id: string;
      status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
      reference: string;
      amount_in_cents: number;
      currency: string;
      payment_method_type: string;
      created_at: string;
      finalized_at?: string;
      status_message?: string;
      customer_email?: string;
      redirect_url?: string;
      shipping_address?: unknown;
      payment_link_id?: string | null;
      payment_source_id?: string | null;
      payment_method?: {
        type: string;
        extra?: Record<string, unknown>;
      };
    };
  };
  environment: 'test' | 'prod';
  signature: {
    checksum: string;
    properties: string[]; // e.g., ["transaction.id", "transaction.status", "transaction.amount_in_cents"]
  };
  timestamp: number; // UNIX timestamp used for signature
  sent_at: string; // ISO 8601 date string
}

/**
 * Create a payment session (payment link)
 */
export async function createPaymentSession(
  orderId: string,
  amountInCents: number,
  customerEmail: string,
  method: 'PSE' | 'CARD' = 'CARD',
  paymentData?: {
    token?: string; // For CARD
    installments?: number; // For CARD
    financial_institution_code?: string; // For PSE
    user_type?: number; // For PSE (0=person, 1=company)
    user_legal_id_type?: string; // For PSE
    user_legal_id?: string; // For PSE
  },
  integritySignature?: string, // Optional integrity signature for widget
  paymentSourceId?: string | number, // Optional payment_source_id for saved payment methods
  options?: { redirectUrl?: string }
): Promise<WompiTransactionResponse> {
  // Wompi minimum amount validation
  const WOMPI_MIN_AMOUNT = 1000; // 10 COP in cents
  if (amountInCents < WOMPI_MIN_AMOUNT) {
    throw new Error(
      `Amount ${amountInCents} is below Wompi minimum of ${WOMPI_MIN_AMOUNT} cents`
    );
  }

  // Ensure amount is a positive integer
  const validatedAmount = Math.max(
    WOMPI_MIN_AMOUNT,
    Math.floor(Math.abs(amountInCents))
  );

  // Build payment_method based on method type and provided data
  const payload: any = {
    amount_in_cents: validatedAmount,
    currency: 'COP',
    customer_email: customerEmail,
    reference: orderId,
    redirect_url:
      options?.redirectUrl ??
      `${env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/payment-result`,
  };

  // If payment_source_id is provided, use it (for saved payment methods)
  if (paymentSourceId) {
    payload.payment_source_id = paymentSourceId;
  }
  // Otherwise, add payment_method if we have the required data
  else if (method === 'CARD' && paymentData?.token) {
    payload.payment_method = {
      type: 'CARD',
      token: paymentData.token,
      installments: paymentData.installments || 1,
    };
  } else if (method === 'PSE' && paymentData?.financial_institution_code) {
    payload.payment_method = {
      type: 'PSE',
      financial_institution_code: paymentData.financial_institution_code,
      user_type: paymentData.user_type ?? 0,
      user_legal_id_type: paymentData.user_legal_id_type,
      user_legal_id: paymentData.user_legal_id,
      payment_description: `Pedido ${orderId}`,
    };
  }
  // If no payment data provided, Wompi will handle method selection in checkout

  const payloadString = JSON.stringify(payload);

  logger.info(
    {
      orderId,
      amountInCents: validatedAmount,
      method,
      originalAmount: amountInCents,
      payload: payloadString,
      payloadParsed: JSON.parse(payloadString),
      hasPaymentMethod: !!payload.payment_method,
      paymentMethodType: payload.payment_method?.type,
    },
    'Creating Wompi payment session'
  );

  try {
    // Use transactions endpoint directly - this is the correct endpoint for creating payment links
    // The payment_links endpoint requires additional fields (name, description, etc.) that we don't need
    const endpoint = `${env.WOMPI_API_URL}/transactions`;

    logger.info(
      {
        endpoint,
        payloadSize: payloadString.length,
        hasPaymentMethod: !!payload.payment_method,
        paymentMethodType: payload.payment_method?.type,
      },
      'Sending request to Wompi transactions endpoint'
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      logger.error(
        {
          status: response.status,
          error: errorText,
          errorData,
          payload: {
            ...payload,
            amount_in_cents: validatedAmount,
          },
        },
        'Wompi API error'
      );
      throw new Error(
        `Wompi API error: ${response.status} - ${errorData?.message || errorText}`
      );
    }

    const data: WompiTransactionResponse = await response.json();
    logger.info({ transactionId: data.data.id }, 'Wompi session created');

    return data;
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to create Wompi session');
    throw error;
  }
}

/**
 * Verify webhook signature according to Wompi documentation
 * https://docs.wompi.co/docs/colombia/eventos/
 *
 * Steps:
 * 1. Concatenate values of properties in the order specified
 * 2. Concatenate timestamp
 * 3. Concatenate secret
 * 4. Apply SHA256 to the entire concatenated string
 */
export function verifyWebhookSignature(payload: WompiWebhookPayload): boolean {
  const { signature, timestamp, ...eventData } = payload;
  const secret = env.WOMPI_WEBHOOK_SECRET;

  if (!secret) {
    logger.error('WOMPI_WEBHOOK_SECRET is not configured');
    return false;
  }

  try {
    // Step 1: Concatenate values of properties in the order specified (NOT sorted!)
    // Important: Use the order from signature.properties, not sorted
    const values = signature.properties.map((prop) => {
      // Navigate through the data object using the property path
      // e.g., "transaction.id" -> data.transaction.id
      const keys = prop.split('.');
      let value: unknown = eventData.data;

      for (const key of keys) {
        if (
          key === 'transaction' &&
          typeof value === 'object' &&
          value !== null
        ) {
          value = (value as Record<string, unknown>)?.[key];
        } else if (typeof value === 'object' && value !== null) {
          value = (value as Record<string, unknown>)?.[key];
        } else {
          logger.warn(
            { prop, key, value },
            'Property path not found in webhook data'
          );
          return '';
        }
      }

      return String(value || '');
    });

    // Step 2: Concatenate timestamp
    const timestampString = String(timestamp || '');

    // Step 3: Concatenate secret
    const concatenated = values.join('') + timestampString + secret;

    // Step 4: Apply SHA256 (NOT HMAC!)
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex')
      .toUpperCase(); // Wompi uses uppercase hex

    const isValid = expectedChecksum === signature.checksum.toUpperCase();

    if (!isValid) {
      logger.warn(
        {
          expected: expectedChecksum,
          received: signature.checksum,
          properties: signature.properties,
          timestamp,
          concatenatedLength: concatenated.length,
        },
        'Invalid webhook signature'
      );
    } else {
      logger.info(
        { transactionId: payload.data.transaction.id },
        'Webhook signature verified'
      );
    }

    return isValid;
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error verifying webhook signature'
    );
    return false;
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<WompiTransactionResponse> {
  const response = await fetch(
    `${env.WOMPI_API_URL}/transactions/${transactionId}`,
    {
      headers: {
        Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get transaction: ${response.status}`);
  }

  return response.json();
}

/**
 * Get transaction by reference (Order ID)
 * useful when we don't have the transaction ID
 */
export async function getTransactionByReference(
  reference: string
): Promise<WompiTransactionResponse | null> {
  try {
    const response = await fetch(
      `${env.WOMPI_API_URL}/transactions?reference=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // The endpoint returns a list of transactions, we take the latest one
    if (data.data && data.data.length > 0) {
      // Sort by created_at desc just in case
      const transactions = data.data.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return { data: transactions[0] };
    }

    return null;
  } catch (error) {
    logger.error({ error, reference }, 'Failed to get transaction by reference');
    return null;
  }
}

/**
 * Calculate gateway fee (example: 2.9% + $0.30 for cards, 1.5% for PSE)
 * Adjust based on actual Wompi pricing
 */
export function calculateGatewayFee(
  amountInCents: number,
  method: 'PSE' | 'CARD'
): number {
  if (method === 'CARD') {
    // Example: 2.9% + 900 cents (COP)
    return Math.round(amountInCents * 0.029 + 900);
  }
  if (method === 'PSE') {
    // Example: 1.5%
    return Math.round(amountInCents * 0.015);
  }
  return 0;
}
