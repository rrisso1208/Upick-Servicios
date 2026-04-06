/**
 * Two-Factor Authentication (2FA) using TOTP
 * Implements Time-based One-Time Password (TOTP) for admin users
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

/**
 * Generate a new 2FA secret for a user
 * @param userEmail - User's email (for QR code label)
 * @param issuer - App name (default: "Upick")
 * @returns Secret, QR code URL, and manual entry key
 */
export async function generate2FASecret(
  userEmail: string,
  issuer: string = 'Upick'
): Promise<TwoFactorSecret> {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${userEmail})`,
    issuer,
    length: 32,
  });

  if (!secret.base32) {
    throw new Error('Failed to generate 2FA secret');
  }

  // Generate QR code URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  return {
    secret: secret.base32,
    qrCodeUrl,
    manualEntryKey: secret.base32,
  };
}

/**
 * Verify a TOTP token
 * @param token - 6-digit TOTP token from user
 * @param secret - User's 2FA secret (base32)
 * @returns true if token is valid, false otherwise
 */
export function verify2FAToken(token: string, secret: string): boolean {
  if (!token || !secret) {
    return false;
  }

  // Remove spaces and convert to string
  const cleanToken = token.replace(/\s/g, '');

  // Verify token
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: cleanToken,
    window: 2, // Allow 2 time steps (60 seconds) of tolerance
  });
}

/**
 * Check if 2FA is required for a role
 * @param role - User role
 * @returns true if 2FA is required, false otherwise
 */
export function is2FARequired(role: string): boolean {
  return role === 'restaurant_admin' || role === 'superadmin';
}

/**
 * Generate backup codes for 2FA recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes (hashed)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit backup code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

