/**
 * Custom hook for fetching categories with SWR
 */

import { useSWRWithAuth } from './useSWRWithAuth';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  saleHoursStart?: string | null;
  saleHoursEnd?: string | null;
  sort: number;
  isActive: boolean;
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWRWithAuth<CategoriesResponse>(
    '/api/admin/categories',
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    categories: data?.data?.categories || [],
    isLoading,
    isError: error,
    mutate, // For manual revalidation
  };
}
