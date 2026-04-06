import { nanoid } from 'nanoid';
import { hashPickupCode } from './hash';

/**
 * Generate a 6-digit alphanumeric pickup code
 * Note: This returns the plain code. Use hashPickupCode() to store it securely.
 */
export function generatePickupCode(): string {
  return nanoid(6).toUpperCase();
}

/**
 * Generate and hash a pickup code
 * Returns both the plain code (for display) and hash (for storage)
 */
export async function generatePickupCodeWithHash(): Promise<{
  code: string;
  hash: string;
}> {
  const code = generatePickupCode();
  const hash = await hashPickupCode(code);
  return { code, hash };
}

/**
 * Format amount in cents to COP string
 */
export function formatCurrency(amountInCents: number): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display (in Colombia timezone)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota', // Colombia timezone
  }).format(d);
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate Colombian phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  // Colombia: 10 digits, starts with 3
  const cleaned = phone.replace(/\D/g, '');
  return /^3\d{9}$/.test(cleaned);
}

/**
 * Parse cents to number (for display)
 */
export function centsToNumber(cents: number): number {
  return cents / 100;
}

/**
 * Convert number to cents (for storage)
 */
export function numberToCents(num: number): number {
  return Math.round(num * 100);
}

