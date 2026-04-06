/**
 * Reviews List Component
 * Displays public reviews (ratings only, no comments)
 */

'use client';

import { useState, useEffect } from 'react';
import { ReviewCard } from './ReviewCard';
import { Pagination } from './Pagination';
import { Star, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  createdAt: string;
  product?: {
    id: string;
    name: string;
  } | null;
}

interface ReviewsListProps {
  restaurantId: string;
  itemsPerPage?: number;
}

export function ReviewsList({
  restaurantId,
  itemsPerPage = 10,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [restaurantId, currentPage]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        const allReviews = data.data.reviews;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedReviews = allReviews.slice(startIndex, endIndex);

        setReviews(paginatedReviews);
        setTotalPages(Math.ceil(allReviews.length / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <Star className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-gray-600">Aún no hay reseñas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={reviews.length * totalPages}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
