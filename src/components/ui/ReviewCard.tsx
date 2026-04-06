/**
 * Review Card Component
 * Displays a single review (public version - only shows rating, no comments)
 */

'use client';

import { Star } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  createdAt: Date | string;
  product?: {
    id: string;
    name: string;
  } | null;
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= review.rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {review.product && (
        <span className="text-sm text-gray-500">{review.product.name}</span>
      )}
    </div>
  );
}
