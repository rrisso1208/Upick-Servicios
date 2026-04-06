/**
 * React hook to get CSRF token for client-side use
 * Fetches token from API and stores it in state
 */

import { useEffect, useState } from 'react';

export function useCSRFToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch('/api/csrf-token');
        if (response.ok) {
          const data = await response.json();
          setToken(data.csrfToken);
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    }

    fetchToken();
  }, []);

  return token;
}

/**
 * Helper function to get CSRF token for use in fetch requests
 * This should be called before making POST/PATCH/PUT/DELETE requests
 */
export async function getCSRFTokenForRequest(): Promise<string | null> {
  try {
    // Fetch with credentials to ensure cookies are sent and received
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
    console.error('Failed to get CSRF token:', response.status, response.statusText);
    return null;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

