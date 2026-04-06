/**
 * Restaurant Admin - Reviews Management
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../../components/layout/Header';
import { ReviewCardAdmin } from '../../../components/ui/ReviewCardAdmin';
import { RatingDisplay } from '../../../components/ui/RatingDisplay';
import { Pagination } from '../../../components/ui/Pagination';
import { MessageSquare, Loader2, Star, Search, Download } from 'lucide-react';
import { supabase } from '../../../providers/AuthProvider';

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
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
    createdAt: string;
  } | null;
}

interface RestaurantStats {
  averageRating: number;
  reviewCount: number;
}

export default function ReviewsManagementPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/reviews', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setReviews(data.data.reviews);

        // Calculate stats
        if (data.data.reviews.length > 0) {
          const avgRating =
            data.data.reviews.reduce(
              (sum: number, r: Review) => sum + r.rating,
              0
            ) / data.data.reviews.length;
          setStats({
            averageRating: avgRating,
            reviewCount: data.data.reviews.length,
          });
        } else {
          setStats({ averageRating: 0, reviewCount: 0 });
        }
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesRating = !filterRating || r.rating === filterRating;
    const matchesSearch =
      !searchQuery ||
      r.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRating && matchesSearch;
  });

  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  const handleExport = () => {
    const csvContent = [
      ['Fecha', 'Usuario', 'Email', 'Rating', 'Producto', 'Comentario'].join(
        ','
      ),
      ...filteredReviews.map((r) =>
        [
          new Date(r.createdAt).toLocaleDateString('es-CO'),
          `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'N/A',
          r.user.email,
          r.rating,
          r.product?.name || 'Restaurante',
          `"${(r.comment || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reseñas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === rating).length / reviews.length) *
          100
        : 0,
  }));

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Reseñas y Calificaciones
          </h1>
          <p className="mt-2 text-gray-600">
            Revisa las calificaciones y comentarios de tus clientes
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calificación Promedio</p>
                  <RatingDisplay
                    rating={stats.averageRating}
                    reviewCount={stats.reviewCount}
                    size="lg"
                    showCount={false}
                  />
                </div>
                <Star className="h-12 w-12 text-yellow-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Reseñas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.reviewCount}
                  </p>
                </div>
                <MessageSquare className="h-12 w-12 text-primary-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Comentarios</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {reviews.filter((r) => r.comment).length}
                  </p>
                </div>
                <MessageSquare className="h-12 w-12 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {reviews.length > 0 && (
          <div className="card mb-6">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en comentarios, emails o productos..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input w-full pl-10"
                />
              </div>
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>

            <h2 className="mb-4 text-lg font-semibold">
              Distribución de Calificaciones
            </h2>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <button
                  key={rating}
                  onClick={() => {
                    setFilterRating(filterRating === rating ? null : rating);
                    setCurrentPage(1);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors ${
                    filterRating === rating
                      ? 'border-2 border-primary-600 bg-primary-50'
                      : 'border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex w-20 items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {rating}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="h-2 flex-1 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-600">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {filterRating
                ? `Reseñas con ${filterRating} estrellas`
                : searchQuery
                  ? `Resultados de búsqueda`
                  : 'Todas las Reseñas'}{' '}
              ({filteredReviews.length})
            </h2>
            {(filterRating || searchQuery) && (
              <button
                onClick={() => {
                  setFilterRating(null);
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">
                {filterRating || searchQuery
                  ? 'No se encontraron reseñas con los filtros aplicados'
                  : 'Aún no hay reseñas'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {paginatedReviews.map((review) => (
                  <ReviewCardAdmin key={review.id} review={review} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredReviews.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
