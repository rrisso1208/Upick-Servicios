/**
 * Client component for restaurants list with search functionality
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Store, Search, X, Utensils, Truck } from 'lucide-react';
import { FavoriteButton } from '@/components/ui/FavoriteButton';

interface FoodCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  description?: string | null;
  location?: string | null;
  deliveryInternalEnabled?: boolean;
  type?: string;
  products: Array<{
    id: string;
    name: string;
  }>;
  foodCategories: Array<{
    foodCategory: FoodCategory;
  }>;
}

interface RestaurantsClientProps {
  restaurants: Restaurant[];
  universitySlug: string;
  placeCategory?: string | null;
}

const placeTypeLabels: Record<string, string> = {
  RESTAURANT: 'Restaurante',
  SERVICE: 'Servicio',
  DISCOTECA: 'Discoteca',
};


const SHOW_CATEGORY_FILTERS = false;

export function RestaurantsClient({
                                    restaurants,
                                    universitySlug,
                                    placeCategory,
                                  }: RestaurantsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);

  const availableVerticals = Array.from(
    new Set(restaurants.map((r) => r.type).filter(Boolean))
  ) as string[];


  useEffect(() => {
    // Fetch food categories
    fetch('/api/food-categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFoodCategories(data.data.categories);
        }
      })
      .catch((error) => {
        console.error('Error fetching food categories:', error);
      });
  }, []);

  const filteredRestaurants = restaurants.filter((restaurant) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const restaurantName = restaurant.name.toLowerCase();
      const productNames = restaurant.products
        .map((p) => p.name.toLowerCase())
        .join(' ');
      const matchesSearch =
        restaurantName.includes(searchLower) ||
        productNames.includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Filter by food category
    if (selectedCategoryId) {
      const hasCategory = (restaurant.foodCategories || []).some((fc: any) => {
        // soporta:
        // - { foodCategory: { id } }
        // - { foodCategoryId }
        // - { id } (por si ya viene directo)
        const id =
          fc?.foodCategory?.id ||
          fc?.foodCategoryId ||
          fc?.id ||
          fc?.food_category_id;

        return id === selectedCategoryId;
      });

      if (!hasCategory) return false;
    }

    // Filter by vertical type
    if (selectedVertical && restaurant.type !== selectedVertical) {
      return false;
    }

    return true;
  });

  return (
    <div className="w-full max-w-full">
      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="mb-3">
          <Link
            href="https://www.upickcol.com/restaurantes-para-universitarios"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 active:scale-95 transition"
          >
            <MapPin className="h-4 w-4" />
            Comercios UPick cercanos
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary-600" />
          <input
            type="text"
            placeholder="Buscar por nombre, producto o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10 pr-4"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Vertical Filters (Red Buttons) */}
      {availableVerticals.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {availableVerticals.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVertical(selectedVertical === v ? null : v)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 border-2 ${
                selectedVertical === v
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-200'
                  : 'bg-white text-primary-600 border-primary-100 hover:border-primary-300'
              }`}
            >
              {placeTypeLabels[v] || v}s
            </button>
          ))}
        </div>
      )}


      {/* Food Categories Filter - Horizontal Scroll */}
      {SHOW_CATEGORY_FILTERS && foodCategories.length > 0 && (
        <div className="mb-6 overflow-hidden">
          <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {/* Hide scrollbar but keep functionality */}
            <style jsx>{`
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                selectedCategoryId === null
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/30'
                  : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <Utensils className="mr-2 inline h-4 w-4" />
              Todas
            </button>
            {foodCategories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === category.id ? null : category.id
                  )
                }
                className={`flex-shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                  selectedCategoryId === category.id
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/30'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Restaurants Grid */}
      <div className="grid w-full max-w-full gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {filteredRestaurants.map((restaurant, index) => {
          // Validate imageUrl - must be a non-empty string
          const hasValidImage =
            restaurant.imageUrl &&
            typeof restaurant.imageUrl === 'string' &&
            restaurant.imageUrl.trim().length > 0 &&
            (restaurant.imageUrl.startsWith('http://') ||
              restaurant.imageUrl.startsWith('https://'));

          return (
            <Link
              key={restaurant.id}
              href={`/${universitySlug}/${restaurant.slug}`}
              className="card-interactive group w-full max-w-full overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {hasValidImage ? (
                <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <Image
                    src={restaurant.imageUrl!}
                    alt={restaurant.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={85}
                    loading="lazy"
                    className="object-cover transition-all duration-500 group-hover:scale-110"
                    style={{
                      objectPosition: restaurant.imagePosition || 'center',
                      transform: `scale(${restaurant.imageScale || 1.0})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute right-2 top-2 z-10">
                    <FavoriteButton
                      type="restaurant"
                      restaurantId={restaurant.id}
                      size="md"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative mb-4 flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 transition-all duration-300 group-hover:from-primary-50 group-hover:to-primary-100/50">
                  <Store className="h-16 w-16 text-gray-400 transition-colors duration-300 group-hover:text-primary-500" />
                  <div className="absolute right-2 top-2">
                    <FavoriteButton
                      type="restaurant"
                      restaurantId={restaurant.id}
                      size="md"
                    />
                  </div>
                </div>
              )}

              <div className="relative space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 transition-colors duration-200 group-hover:text-primary-600">
                        {restaurant.name}
                      </h3>
                      {restaurant.type && (
                        <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                          {placeTypeLabels[restaurant.type] || restaurant.type}
                        </span>
                      )}

                      {restaurant.deliveryInternalEnabled && placeCategory && (
                        <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          <Truck className="h-3.5 w-3.5" />
                          <span>Domicilio en {placeCategory}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <FavoriteButton
                      type="restaurant"
                      restaurantId={restaurant.id}
                      size="sm"
                    />
                  </div>
                </div>

                {restaurant.description && (
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {restaurant.description}
                  </p>
                )}

                {restaurant.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{restaurant.location}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filteredRestaurants.length === 0 && searchTerm && (
        <div className="py-12 text-center text-gray-500">
          No hay resultados que coincidan con &quot;{searchTerm}&quot;
        </div>
      )}

      {restaurants.length === 0 && !searchTerm && (
        <div className="py-12 text-center text-gray-500">
          No hay Comercios UPick disponibles en este campus
        </div>
      )}
    </div>
  );
}