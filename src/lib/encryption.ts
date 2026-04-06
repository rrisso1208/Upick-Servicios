/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption at rest
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for authentication tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * In production, this should be a strong, randomly generated key
 * stored securely (e.g., in Vercel environment variables)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    // Fallback: generate a key from DATABASE_URL (not secure, but better than nothing)
    // In production, ENCRYPTION_KEY must be set
    const fallback = process.env.DATABASE_URL || 'fallback-key-change-in-production';
    return crypto
      .createHash('sha256')
      .update(fallback)
      .digest();
  }

  // If key is provided, use it directly (should be 64 hex characters = 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise, hash it to get 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted data as hex string (format: iv:salt:tag:encrypted)
 */
export function encrypt(text: string): string {
  if (!text) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key from master key and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha256');

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return format: iv:salt:tag:encrypted
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted data as hex string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, saltHex, tagHex, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    // Derive key from master key and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha256');

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt invoice data fields
 */
export function encryptInvoiceData(data: {
  documentNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}): {
  documentNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
} {
  return {
    documentNumber: data.documentNumber ? encrypt(data.documentNumber) : undefined,
    phone: data.phone ? encrypt(data.phone) : undefined,
    email: data.email ? encrypt(data.email) : undefined,
    address: data.address ? encrypt(data.address) : undefined,
  };
}

/**
 * Decrypt invoice data fields
 */
export function decryptInvoiceData(data: {
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): {
  documentNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
} {
  return {
    documentNumber: data.documentNumber ? decrypt(data.documentNumber) : undefined,
    phone: data.phone ? decrypt(data.phone) : undefined,
    email: data.email ? decrypt(data.email) : undefined,
    address: data.address ? decrypt(data.address) : undefined,
  };
}

/**
 * Encrypt contact information (phone, email)
 */
export function encryptContactInfo(data: {
  phone?: string;
  email?: string;
}): {
  phone?: string;
  email?: string;
} {
  return {
    phone: data.phone ? encrypt(data.phone) : undefined,
    email: data.email ? encrypt(data.email) : undefined,
  };
}

/**
 * Decrypt contact information
 */
export function decryptContactInfo(data: {
  phone?: string | null;
  email?: string | null;
}): {
  phone?: string;
  email?: string;
} {
  return {
    phone: data.phone ? decrypt(data.phone) : undefined,
    email: data.email ? decrypt(data.email) : undefined,
  };
}

