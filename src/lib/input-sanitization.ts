/**
 * Input sanitization utilities
 * Prevents XSS and basic injection attacks
 */

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove control characters (except newlines and tabs for text areas)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize email - validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const sanitized = sanitizeString(email).toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize number - ensures input is a valid number
 */
export function sanitizeNumber(
  input: string | number | null | undefined
): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }

  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Sanitize integer
 */
export function sanitizeInteger(
  input: string | number | null | undefined
): number | null {
  const num = sanitizeNumber(input);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Sanitize URL - validates and sanitizes URLs
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const sanitized = sanitizeString(url);

  try {
    const parsed = new URL(sanitized);
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return sanitized;
  } catch {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Sanitize object - recursively sanitizes string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === 'string'
            ? sanitizeString(item)
            : typeof item === 'object' && item !== null
              ? sanitizeObject(item)
              : item
        );
      } else {
        sanitized[key] = sanitizeObject(sanitized[key]);
      }
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize ID (CUID format)
 */
export function sanitizeId(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(id);

  // CUID format: starts with 'c' followed by 24 alphanumeric characters
  // Or any string that looks like a valid ID (alphanumeric, hyphens, underscores)
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(sanitized) || sanitized.length > 100) {
    return null;
  }

  return sanitized;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize text content for comments, reviews, and notes
 * Removes HTML tags and escapes special characters to prevent XSS
 */
export function sanitizeTextContent(
  input: string | null | undefined,
  options?: {
    allowNewlines?: boolean;
    maxLength?: number;
  }
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove HTML tags completely
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Decode HTML entities before escaping
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Escape HTML characters
  sanitized = escapeHtml(sanitized);

  // Handle newlines
  if (options?.allowNewlines) {
    // Replace newlines with <br> for display (but keep them escaped)
    // In practice, you'd handle this in the UI layer
    sanitized = sanitized.replace(/\n/g, '\n');
  } else {
    // Remove newlines
    sanitized = sanitized.replace(/\n/g, ' ').replace(/\r/g, ' ');
  }

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Apply max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized.trim();
}

/**
 * Sanitize review comment - allows newlines but prevents XSS
 */
export function sanitizeReviewComment(
  input: string | null | undefined
): string {
  return sanitizeTextContent(input, {
    allowNewlines: true,
    maxLength: 2000, // Reasonable limit for reviews
  });
}

/**
 * Sanitize order notes - allows newlines but prevents XSS
 */
export function sanitizeOrderNotes(input: string | null | undefined): string {
  return sanitizeTextContent(input, {
    allowNewlines: true,
    maxLength: 500, // Reasonable limit for order notes
  });
}

/**
 * Sanitize image URL - validates it's a safe image URL
 * Only allows URLs from trusted domains (Supabase, etc.)
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  allowedDomains?: string[]
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const sanitized = sanitizeUrl(url);
  if (!sanitized) {
    return '';
  }

  try {
    const parsed = new URL(sanitized);

    // Default allowed domains
    const defaultAllowed = [
      'supabase.co',
      'supabase.in',
      'storage.googleapis.com',
      'amazonaws.com',
    ];

    const domains = allowedDomains || defaultAllowed;

    // Check if domain is allowed
    const isAllowed = domains.some((domain) =>
      parsed.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      return '';
    }

    // Only allow common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some((ext) =>
      parsed.pathname.toLowerCase().endsWith(ext)
    );

    if (!hasImageExtension && !parsed.pathname.includes('/storage/')) {
      // Allow storage paths even without extension
      return '';
    }

    return sanitized;
  } catch {
    return '';
  }
}

/**
 * Sanitize phone number - validates and formats phone numbers
 */
export function sanitizePhoneNumber(
  input: string | null | undefined
): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');

  // Validate length (Colombian phone numbers: 10 digits)
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return digits;
}
