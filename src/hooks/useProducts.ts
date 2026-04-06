/**
 * Custom hook for fetching products with SWR
 */

import { useSWRWithAuth } from './useSWRWithAuth';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promotionPrice?: number | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  prepMinutes: number;
  isActive: boolean;
  isFeatured: boolean;
  sort: number;
  // POS/display fields
  displayName?: string | null;
  menuSource?: 'POS' | 'MANUAL';
  posItemId?: string | null;
  posLastSyncedAt?: string | null;
  category: {
    id: string;
    name: string;
    sort: number;
  };
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
  };
}

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWRWithAuth<ProductsResponse>(
    '/api/admin/products',
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    products: data?.data?.products || [],
    isLoading,
    isError: error,
    mutate, // For manual revalidation
  };
}
