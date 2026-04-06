/**
 * Favorites page - Student favorites
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2, Heart, MapPin, Package, Trash2 } from 'lucide-react';
import { supabase } from '../../providers/AuthProvider';

interface Favorite {
  id: string;
  type: 'restaurant' | 'product';
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    location?: string | null;
    place?: {
      slug: string;
    } | null;
  } | null;
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    restaurant: {
      name: string;
      slug: string;
      place?: {
        slug: string;
      } | null;
    };
  } | null;
  createdAt: Date | string;
}

export default function FavoritesPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'restaurant' | 'product'>(
    'all'
  );

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (userRole === 'student') {
        fetchFavorites();
      }
    }
  }, [user, userRole, authLoading, activeTab]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const type = activeTab === 'all' ? null : activeTab;
      const url = type
        ? `/api/student/favorites?type=${type}`
        : '/api/student/favorites';

      // Get session token for Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setFavorites(data.data.favorites);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favorite: Favorite) => {
    try {
      const url =
        favorite.type === 'restaurant'
          ? `/api/student/favorites?restaurantId=${favorite.restaurant?.id}`
          : `/api/student/favorites?productId=${favorite.product?.id}`;

      // Get session token for Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setFavorites((prev) => prev.filter((f) => f.id !== favorite.id));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      alert('Error al eliminar de favoritos');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Favoritos" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  const restaurantFavorites = favorites.filter((f) => f.type === 'restaurant');
  const productFavorites = favorites.filter((f) => f.type === 'product');

  return (
    <>
      <Header title="Favoritos" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Favoritos</h1>
          <p className="mt-2 text-gray-600">
            Restaurantes y productos que te gustan
          </p>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos', count: favorites.length },
              {
                value: 'restaurant',
                label: 'Restaurantes',
                count: restaurantFavorites.length,
              },
              {
                value: 'product',
                label: 'Productos',
                count: productFavorites.length,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {favorites.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">
              No tienes favoritos aún
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Explora restaurantes y productos para agregarlos a favoritos
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary mt-6"
            >
              Explorar Restaurantes
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Restaurant Favorites */}
            {(activeTab === 'all' || activeTab === 'restaurant') &&
              restaurantFavorites.length > 0 && (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <MapPin className="h-5 w-5" />
                    Restaurantes ({restaurantFavorites.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {restaurantFavorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="card group cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => {
                          const placeSlug = favorite.restaurant?.place?.slug;
                          const restaurantSlug = favorite.restaurant?.slug;
                          if (placeSlug && restaurantSlug) {
                            router.push(`/${placeSlug}/${restaurantSlug}`);
                          } else {
                            console.error(
                              'Missing place or restaurant slug in favorite'
                            );
                          }
                        }}
                      >
                        {favorite.restaurant?.imageUrl && (
                          <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={favorite.restaurant.imageUrl}
                              alt={favorite.restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {favorite.restaurant?.name}
                            </h3>
                            {favorite.restaurant?.location && (
                              <p className="mt-1 text-sm text-gray-600">
                                {favorite.restaurant.location}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(favorite);
                            }}
                            className="ml-2 rounded-full p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Product Favorites */}
            {(activeTab === 'all' || activeTab === 'product') &&
              productFavorites.length > 0 && (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <Package className="h-5 w-5" />
                    Productos ({productFavorites.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {productFavorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="card group cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => {
                          const placeSlug =
                            favorite.product?.restaurant.place?.slug;
                          const restaurantSlug =
                            favorite.product?.restaurant.slug;
                          if (placeSlug && restaurantSlug) {
                            router.push(`/${placeSlug}/${restaurantSlug}`);
                          } else {
                            console.error(
                              'Missing place or restaurant slug in favorite'
                            );
                          }
                        }}
                      >
                        {favorite.product?.imageUrl && (
                          <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={favorite.product.imageUrl}
                              alt={favorite.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {favorite.product?.name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {favorite.product?.restaurant.name}
                            </p>
                            <p className="mt-2 text-lg font-bold text-primary-600">
                              $
                              {(
                                (favorite.product?.price || 0) / 100
                              ).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(favorite);
                            }}
                            className="ml-2 rounded-full p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
