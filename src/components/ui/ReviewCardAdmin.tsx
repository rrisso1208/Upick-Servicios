/**
 * Review Card Component for Admin
 * Displays full review with comments
 */

'use client';

import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: Date | string;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  product?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    pickupCode: string;
    createdAt: Date | string;
  } | null;
}

interface ReviewCardAdminProps {
  review: Review;
}

export function ReviewCardAdmin({ review }: ReviewCardAdminProps) {
  const userName =
    review.user.firstName && review.user.lastName
      ? `${review.user.firstName} ${review.user.lastName}`
      : review.user.email.split('@')[0];

  const formattedDate = format(
    new Date(review.createdAt),
    "d 'de' MMMM, yyyy 'a las' h:mm a",
    { locale: es }
  );

  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="font-semibold text-gray-900">{userName}</p>
            <span className="text-xs text-gray-500">({review.user.email})</span>
          </div>
          {review.product && (
            <p className="text-sm text-gray-500">
              Producto: {review.product.name}
            </p>
          )}
          {review.order && (
            <p className="text-xs text-gray-400">
              Pedido #{review.order.pickupCode} - {formattedDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= review.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-sm font-medium text-gray-700">Comentario:</p>
          <p className="text-gray-700">{review.comment}</p>
        </div>
      )}
      {!review.comment && (
        <p className="mt-2 text-xs italic text-gray-400">Sin comentario</p>
      )}
    </div>
  );
}
