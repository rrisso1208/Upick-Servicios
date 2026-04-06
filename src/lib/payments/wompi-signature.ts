/**
 * Wompi Integrity Signature Generator
 * Documentation: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 *
 * Generates SHA256 hash for transaction integrity validation
 * Format: <Reference><Amount><Currency><IntegritySecret>
 */

import crypto from 'crypto';
import { env } from '../env';
import logger from '../logger';

/**
 * Generate integrity signature for Wompi widget/checkout
 * @param reference - Unique payment reference (order ID)
 * @param amountInCents - Amount in cents
 * @param currency - Currency code (default: COP)
 * @param expirationTime - Optional expiration time (ISO string)
 * @returns SHA256 hash signature
 */
export function generateIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = 'COP',
  expirationTime?: string
): string {
  // Get integrity secret from environment
  // This is different from WOMPI_PRIVATE_KEY and WOMPI_PUBLIC_KEY
  // It should be obtained from: Dashboard → Desarrolladores → Secretos para integración técnica
  // Try multiple sources: direct env, then env object, then webhook secret as fallback
  const integritySecret =
    process.env.WOMPI_INTEGRITY_SECRET ||
    env.WOMPI_WEBHOOK_SECRET ||
    process.env.WOMPI_WEBHOOK_SECRET ||
    '';

  if (!integritySecret) {
    const errorMessage =
      'WOMPI_INTEGRITY_SECRET and WOMPI_WEBHOOK_SECRET are not configured. Please set WOMPI_INTEGRITY_SECRET in your environment variables and redeploy.';
    logger.error({
      message: errorMessage,
      hasEnvIntegritySecret: !!process.env.WOMPI_INTEGRITY_SECRET,
      hasEnvWebhookSecret: !!process.env.WOMPI_WEBHOOK_SECRET,
      hasEnvObjectWebhookSecret: !!env.WOMPI_WEBHOOK_SECRET,
    });
    throw new Error(errorMessage);
  }

  logger.debug(
    {
      integritySecretLength: integritySecret.length,
      integritySecretPrefix: integritySecret.substring(0, 20) + '...',
    },
    'Using integrity secret for signature generation'
  );

  // Concatenate values in order: Reference + Amount + Currency + IntegritySecret
  // If expirationTime is provided, add it: Reference + Amount + Currency + ExpirationTime + IntegritySecret
  let stringToSign = `${reference}${amountInCents}${currency}`;

  if (expirationTime) {
    stringToSign += expirationTime;
  }

  stringToSign += integritySecret;

  // Generate SHA256 hash
  const signature = crypto
    .createHash('sha256')
    .update(stringToSign)
    .digest('hex');

  logger.debug(
    {
      reference,
      amountInCents,
      currency,
      expirationTime,
      signatureLength: signature.length,
    },
    'Generated Wompi integrity signature'
  );

  return signature;
}
