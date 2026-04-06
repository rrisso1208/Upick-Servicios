/**
 * Helper function to get Supabase session token for API requests
 * This ensures cookies are sent with fetch requests
 */

import { supabase } from '../providers/AuthProvider';

export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting session token:', error);
  }

  return headers;
}

