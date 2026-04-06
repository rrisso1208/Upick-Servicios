/**
 * Custom SWR hook with authentication (FIXED)
 *
 * ✅ Fixes:
 * - Uses the SINGLE Supabase client from AuthProvider (no duplicate createClient)
 * - Avoids calling getSession() on every request (token cache + lock)
 */

import useSWR from 'swr';
import { supabase } from '../providers/AuthProvider';

interface SWROptions {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  dedupingInterval?: number;
  refreshInterval?: number;
}

// ---- Token cache (module-level) ----
let cachedAccessToken: string | null = null;
let cachedAtMs = 0;
const TOKEN_CACHE_TTL_MS = 60_000;

// Prevent multiple concurrent getSession() calls
let sessionPromise: Promise<string | null> | null = null;

async function getAccessTokenCached(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still fresh
  if (cachedAccessToken && now - cachedAtMs < TOKEN_CACHE_TTL_MS) {
    return cachedAccessToken;
  }

  // If there's already an in-flight session load, await it
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;

      const token = data.session?.access_token ?? null;

      cachedAccessToken = token;
      cachedAtMs = Date.now();

      return token;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

async function fetcherWithAuth(url: string) {
  const token = await getAccessTokenCached();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // @ts-expect-error - Adding status property to Error
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function useSWRWithAuth<T>(url: string | null, options?: SWROptions) {
  return useSWR<T>(url, fetcherWithAuth, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
    ...options,
  });
}

