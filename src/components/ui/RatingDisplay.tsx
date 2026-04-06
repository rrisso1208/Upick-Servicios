/**
 * Rating Display Component
 * Shows average rating with stars
 */

'use client';

import { Star } from 'lucide-react';

interface RatingDisplayProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function RatingDisplay({
  rating,
  reviewCount,
  size = 'md',
  showCount = true,
}: RatingDisplayProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const starSize = sizeClasses[size];
  const roundedRating = Math.round(rating * 10) / 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">
          {roundedRating.toFixed(1)}
        </span>
        {showCount && reviewCount > 0 && (
          <span className="text-sm text-gray-500">
            ({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})
          </span>
        )}
      </div>
    </div>
  );
}
