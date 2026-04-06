'use client';

import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { PickuMascot } from '@/components/ui/PickuMascot';

export interface ProductUI {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promotionPrice?: number | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  prepMinutes: number;
  isFeatured?: boolean;

  optionGroups?: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    required: boolean;
    options: Array<{
      id: string;
      name: string;
      priceDelta: number;
      isDefault?: boolean;
    }>;
  }>;

  badges?: Array<{
    badge: {
      id: string;
      name: string;
      icon?: string | null;
      color: string;
    };
  }>;
}

interface ProductCardProps {
  product: ProductUI;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const basePrice =
    product.promotionPrice && product.promotionPrice < product.price
      ? product.promotionPrice
      : product.price;

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer p-3 transition hover:shadow-lg"
    >
      <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg bg-gray-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <PickuMascot
              variant="chef"
              size="lg"
              className="opacity-80"
            />
          </div>
        )}
      </div>

      <h3 className="text-sm font-semibold text-gray-900">
        {product.name}
      </h3>

      <div className="mt-1">
        {product.promotionPrice && product.promotionPrice < product.price ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-600">
              {formatCurrency(product.promotionPrice)}
            </span>
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          </div>
        ) : (
          <span className="font-bold text-primary-600">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>
    </div>
  );
}