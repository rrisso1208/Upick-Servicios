/**
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis-based solutions like Upstash
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      Object.keys(store).forEach((key) => {
        if (store[key].resetAt < now) {
          delete store[key];
        }
      });
    },
    5 * 60 * 1000
  );
}

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Custom identifier (defaults to IP)
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, maxRequests } = options;
  const now = Date.now();
  const key = identifier;

  // Get or create entry
  let entry = store[key];

  // If entry doesn't exist or window has expired, reset
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    store[key] = entry;
  }

  // Increment count
  entry.count += 1;

  // Check if limit exceeded
  const success = entry.count <= maxRequests;

  return {
    success,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: maxRequests,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  // Try various headers (for proxies/load balancers)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (won't work in serverless, but helps in development)
  return 'unknown';
}

/**
 * Rate limit middleware for Next.js API routes
 * Supports both IP-based and user-based rate limiting
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, userId?: string): RateLimitResult => {
    // Use user ID if provided and available, otherwise fall back to IP
    const identifier = userId || getClientIP(req);
    return rateLimit(identifier, options);
  };
}

/**
 * Rate limiter that supports authenticated users
 * Falls back to IP-based limiting for unauthenticated requests
 */
export function createUserRateLimiter(
  options: RateLimitOptions,
  authenticatedOptions?: RateLimitOptions
) {
  return (req: Request, userId?: string): RateLimitResult => {
    if (userId && authenticatedOptions) {
      // Use more generous limits for authenticated users
      return rateLimit(userId, authenticatedOptions);
    }
    // Use IP-based limiting for unauthenticated requests
    return rateLimit(getClientIP(req), options);
  };
}

/**
 * Common rate limiters
 * Following security recommendations:
 * - Crear pedidos: 10/min por IP
 * - Login/Signup: 5/min por IP
 * - API calls: 100/min por usuario autenticado
 */
export const rateLimiters = {
  // Order creation: 10 requests per minute per IP
  orderCreation: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Auth endpoints: 5 requests per minute per IP
  auth: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),

  // Authenticated API calls: 100 requests per minute per user
  // Falls back to 60/min per IP for unauthenticated
  authenticated: createUserRateLimiter(
    {
      windowMs: 60 * 1000,
      maxRequests: 60, // For unauthenticated requests
    },
    {
      windowMs: 60 * 1000,
      maxRequests: 100, // For authenticated users
    }
  ),

  // Strict: 10 requests per minute (for sensitive operations)
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Standard: 60 requests per minute (legacy, use authenticated instead)
  standard: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
  }),

  // Generous: 100 requests per minute (legacy, use authenticated instead)
  generous: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),

  // Export endpoints: 5 requests per 5 minutes
  export: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 5,
  }),

  // Webhook endpoints: No rate limiting (validated by signature instead)
  webhook: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000, // Very high limit, validation is done via signature
  }),
};
