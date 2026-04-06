/**
 * Custom hook for fetching badges with SWR
 */

import { useSWRWithAuth } from './useSWRWithAuth';

interface Badge {
  id: string;
  name: string;
  icon?: string | null;
  color: string;
  description?: string | null;
}

interface BadgesResponse {
  success: boolean;
  data: {
    badges: Badge[];
  };
}

export function useBadges() {
  const { data, error, isLoading, mutate } = useSWRWithAuth<BadgesResponse>(
    '/api/admin/badges',
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes (badges don't change often)
    }
  );

  return {
    badges: data?.data?.badges || [],
    isLoading,
    isError: error,
    mutate,
  };
}
