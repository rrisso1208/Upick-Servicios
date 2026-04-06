/**
 * Hashing utilities for sensitive data
 * Uses bcrypt for hashing pickup codes
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a pickup code
 * @param code - Plain pickup code
 * @returns Hashed code
 */
export async function hashPickupCode(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

/**
 * Verify a pickup code against its hash
 * @param code - Plain pickup code to verify
 * @param hash - Hashed code to compare against
 * @returns true if codes match, false otherwise
 */
export async function verifyPickupCode(
  code: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Hash any sensitive string
 * @param text - Plain text to hash
 * @returns Hashed text
 */
export async function hashString(text: string): Promise<string> {
  return bcrypt.hash(text, SALT_ROUNDS);
}

/**
 * Verify a string against its hash
 * @param text - Plain text to verify
 * @param hash - Hashed text to compare against
 * @returns true if strings match, false otherwise
 */
export async function verifyString(text: string, hash: string): Promise<boolean> {
  return bcrypt.compare(text, hash);
}

