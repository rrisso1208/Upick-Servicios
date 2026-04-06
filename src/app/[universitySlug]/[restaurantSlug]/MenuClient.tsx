/**
 * Client component for restaurant menu with cart functionality
 *
 * ✅ Este componente corre en el navegador (use client)
 * ✅ Aquí sí hay estado (search, overload status, cart re-render)
 * ✅ Aquí se renderiza todo el menú y se conectan:
 *    - ProductCard (agrega al carrito)
 *    - CartButton (muestra el carrito y navega a checkout)
 *    - ReviewsList (consulta reseñas)
 *    - /api/restaurants/:slug/overload (para bloquear pedidos si está saturado)
 *    '
 */

'use client';

import { useState, useEffect } from 'react';

// UI Cards / botones
import { ProductCard } from '@/components/ui/ProductCard';
import { CartButton } from '@/components/ui/CartButton';

// Rating / Reviews UI
import { RatingDisplay } from '@/components/ui/RatingDisplay';
import { ReviewsList } from '@/components/ui/ReviewsList';

// Clients for other verticals
import { ServiceClient } from './ServiceClient';
import { DiscotecaClient } from './DiscotecaClient';

// Mascota
import { PickuMascot } from '@/components/ui/PickuMascot';

// Iconos
import {
  MapPin,
  Clock,
  AlertTriangle,
  Star,
  Search,
  X,
  Percent,
  Award,
} from 'lucide-react';

// Helper de carrito (aquí realmente NO se usa, pero está importado)
import { getCart } from '../../../lib/cart';
import { ProductModal } from '@/components/ui/ProductModal';

interface MenuClientProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    type: string;
    location?: string | null;
    description?: string | null;

    // estado de saturación
    isOverloaded?: boolean;
    overloadUntil?: Date | null;

    // reviews
    averageRating?: number | null;
    reviewCount?: number | null;

    // relación con el lugar/sede
    place: {
      id: string;
      name: string;
      slug: string;
    };

    // categorías con productos
    categories: Array<{
      id: string;
      name: string;
      description?: string | null;

      // horarios por categoría (si existen)
      saleHoursStart?: string | null; // HH:MM
      saleHoursEnd?: string | null; // HH:MM

      products: Array<{
        id: string;
        name: string;
        description?: string | null;
        price: number;
        promotionPrice?: number | null;

        // imagen
        imageUrl?: string | null;
        imagePosition?: string | null;
        imageScale?: number | null;

        prepMinutes: number;
        isFeatured?: boolean;

        // specs: JSON con info adicional
        specs?: any;

        // opciones (tamaños, extras, etc)
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
            isDefault: boolean;
          }>;
        }>;

        // badges
        badges?: Array<{
          badge: {
            id: string;
            name: string;
            icon?: string | null;
            color: string;
          };
        }>;
      }>;
    }>;
  };
}

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function MenuClient({ restaurant }: MenuClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const handleCartUpdate = () => {
    window.dispatchEvent(new Event('cart-updated'));
  };

  if (restaurant.type === 'SERVICE') {
    return <ServiceClient restaurant={restaurant} />;
  }
  
  if (restaurant.type === 'DISCOTECA') {
    return (
      <>
        <DiscotecaClient 
          restaurant={restaurant} 
          onProductSelect={setSelectedProduct}
        />
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            isOpen={true}
            hubId={restaurant.place.slug}
            onClose={() => setSelectedProduct(null)}
            onCartUpdate={handleCartUpdate}
          />
        )}

        {/* CartButton */}
        <div className="hidden md:block">
          <CartButton universitySlug={restaurant.place.slug} hubId={restaurant.place.slug} />
        </div>

        <div className="md:hidden">
          <CartButton
            universitySlug={restaurant.place.slug}
            hubId={restaurant.place.slug}
            variant="mobile-bar"
          />
        </div>
      </>
    );
  }

  // Comportamiento original para RESTAURANT o null
  return (
    <>
      <RestaurantMenuClient 
        restaurant={restaurant} 
        onProductSelect={setSelectedProduct}
      />
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          isOpen={true}
          hubId={restaurant.place.slug}
          onClose={() => setSelectedProduct(null)}
          onCartUpdate={handleCartUpdate}
        />
      )}
    </>
  );
}

interface RestaurantMenuClientProps extends MenuClientProps {
  onProductSelect: (product: any) => void;
}

function RestaurantMenuClient({ restaurant, onProductSelect }: RestaurantMenuClientProps) {

  const [isOverloaded, setIsOverloaded] = useState(
    restaurant.isOverloaded || false
  );
  const [overloadUntil, setOverloadUntil] = useState<Date | null>(
    restaurant.overloadUntil ? new Date(restaurant.overloadUntil) : null
  );

  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    const checkOverload = async () => {
      try {
        const response = await fetch(
          `/api/restaurants/${restaurant.slug}/overload`
        );
        const data = await response.json();

        if (data.success) {
          setIsOverloaded(data.data.isOverloaded);
          setOverloadUntil(
            data.data.overloadUntil ? new Date(data.data.overloadUntil) : null
          );
        }
      } catch (error) {
        console.error('Failed to check overload status:', error);
      }
    };

    checkOverload();
    const interval = setInterval(checkOverload, 30000);
    return () => clearInterval(interval);
  }, [restaurant.slug]);

  const handleCartUpdate = () => {
    window.dispatchEvent(new Event('cart-updated'));
  };

  const isCurrentlyOverloaded = Boolean(
    isOverloaded && overloadUntil && new Date() < overloadUntil
  );

  const minutesLeft =
    isCurrentlyOverloaded && overloadUntil
      ? Math.ceil((overloadUntil.getTime() - new Date().getTime()) / 60000)
      : 0;

  // (función no usada en render, pero la dejaste; no la quito)
  const isCategoryAvailable = (category: {
    saleHoursStart?: string | null;
    saleHoursEnd?: string | null;
  }): boolean => {
    if (!category.saleHoursStart && !category.saleHoursEnd) return true;

    const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;
    const utcNow = Date.now();
    const colombiaNowMs = utcNow + COLOMBIA_OFFSET_MS;
    const colombiaNow = new Date(colombiaNowMs);

    const currentHour = colombiaNow.getUTCHours();
    const currentMinute = colombiaNow.getUTCMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;

    if (category.saleHoursStart) {
      const [startHour, startMin] = category.saleHoursStart
        .split(':')
        .map(Number);
      const startMinutes = startHour * 60 + startMin;
      if (currentMinutes < startMinutes) return false;
    }

    if (category.saleHoursEnd) {
      const [endHour, endMin] = category.saleHoursEnd.split(':').map(Number);
      const endMinutes = endHour * 60 + endMin;
      if (currentMinutes >= endMinutes) return false;
    }

    return true;
  };

  const filteredCategories = restaurant.categories
    .map((category) => ({
      ...category,
      products: category.products.filter((product) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const productName = product.name.toLowerCase();
          const productDescription = product.description?.toLowerCase() || '';
          return (
            productName.includes(searchLower) ||
            productDescription.includes(searchLower)
          );
        }
        return true;
      }),
    }))
    .filter((category) => category.products.length > 0);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const headerOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      {/* ============================
          Sticky Category Nav
         ============================ */}
      <div className="sticky top-16 z-40 mb-6 border-b border-gray-200 bg-white/95 py-3 backdrop-blur-sm sm:rounded-lg sm:border sm:px-6">
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:gap-4 sm:px-0">
          {/* Promociones */}
          {(() => {
            const allProducts = restaurant.categories.flatMap((cat) => cat.products);
            const hasPromotions = allProducts.some(
              (p) => p.promotionPrice && p.promotionPrice < p.price
            );
            if (!hasPromotions) return null;

            return (
              <button
                onClick={() => {
                  const element = document.getElementById('category-promociones');
                  if (element) {
                    const headerOffset = 140;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition =
                      elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  }
                }}
                className="whitespace-nowrap rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 active:bg-red-300"
              >
                Promociones
              </button>
            );
          })()}

          {/* Destacados */}
          {(() => {
            const allProducts = restaurant.categories.flatMap((cat) => cat.products);
            const hasFeatured = allProducts.some((p) => p.isFeatured);
            if (!hasFeatured) return null;

            return (
              <button
                onClick={() => {
                  const element = document.getElementById('category-destacados');
                  if (element) {
                    const headerOffset = 140;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition =
                      elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  }
                }}
                className="whitespace-nowrap rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-200 active:bg-yellow-300"
              >
                Destacados
              </button>
            );
          })()}

          {/* Categorías */}
          {filteredCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              className="whitespace-nowrap rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-600 active:bg-primary-100"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto min-h-screen max-w-7xl px-3 pb-32 sm:px-4 sm:py-8">
        {/* ============================
            Restaurant Header
           ============================ */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {restaurant.name}
              </h1>

              {restaurant.averageRating !== null &&
                restaurant.averageRating !== undefined &&
                restaurant.reviewCount !== null &&
                restaurant.reviewCount !== undefined &&
                restaurant.reviewCount > 0 && (
                  <div className="mt-2">
                    <RatingDisplay
                      rating={restaurant.averageRating}
                      reviewCount={restaurant.reviewCount}
                      size="md"
                      showCount={true}
                    />
                  </div>
                )}

              {restaurant.description && (
                <p className="mt-2 text-gray-600">{restaurant.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3 sm:gap-4">
                {restaurant.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{restaurant.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mascota */}
            <div className="relative mt-6 flex-shrink-0 self-center overflow-visible sm:mt-0 sm:block sm:self-auto">
              <div className="animate-bounce-slow absolute -top-15 left-10 z-10 sm:left-10 sm:-top-8">
                <div className="relative rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-gray-900/5">
                  <p className="whitespace-nowrap text-xs font-medium text-gray-900 sm:text-sm">
                    ¡Qué rico! 😋
                  </p>
                  <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-gray-200/50 bg-white ring-1 ring-gray-900/5"></div>
                </div>
              </div>
              <div className="transition-transform duration-500 hover:rotate-2 hover:scale-105">
                <PickuMascot
                  variant="querico"
                  size="xl"
                  className="mix-blend-multiply sm:scale-125 lg:scale-150"
                />
              </div>
            </div>
          </div>

          {/* Overload Banner */}
          {isCurrentlyOverloaded && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    Restaurante a full capacidad
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Por el momento no estamos recibiendo pedidos. Intenta nuevamente
                    en {minutesLeft} {minutesLeft === 1 ? 'minuto' : 'minutos'}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================
            Search Bar
           ============================ */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary-600" />
            <input
              type="text"
              placeholder="Buscar plato del menú..."
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

        {/* ============================
            Promociones
           ============================ */}
        {(() => {
          const allProducts = restaurant.categories.flatMap((cat) => cat.products);

          const promotionalProducts = allProducts.filter(
            (p) => p.promotionPrice && p.promotionPrice < p.price
          );

          const filteredPromotional = searchTerm
            ? promotionalProducts.filter((product) => {
              const searchLower = searchTerm.toLowerCase();
              const productName = product.name.toLowerCase();
              const productDescription = product.description?.toLowerCase() || '';
              return (
                productName.includes(searchLower) ||
                productDescription.includes(searchLower)
              );
            })
            : promotionalProducts;

          if (filteredPromotional.length === 0) return null;

          return (
            <div className="mb-8 scroll-mt-32 sm:mb-12" id="category-promociones">
              <div className="mb-4 border-b pb-3 sm:mb-6">
                <div className="flex items-center gap-2">
                  <Percent className="h-6 w-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    Promociones
                  </h2>
                </div>
              </div>

              {/* Carrusel horizontal (ancho fijo por card) */}
              <div className="-mx-3 overflow-x-auto pb-4 sm:mx-0">
                <div className="flex gap-4 px-3 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
                  {filteredPromotional.map((product) => (
                    <div
                      key={product.id}
                      className="basis-[280px] w-[280px] max-w-[280px] flex-shrink-0 sm:basis-[300px] sm:w-[300px] sm:max-w-[300px]"
                    >
                      <ProductCard
                        product={product}
                        onClick={() => onProductSelect(product)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================
            Destacados
           ============================ */}
        {(() => {
          const allProducts = restaurant.categories.flatMap((cat) => cat.products);
          const featuredProducts = allProducts.filter((p) => p.isFeatured);

          const filteredFeatured = searchTerm
            ? featuredProducts.filter((product) => {
              const searchLower = searchTerm.toLowerCase();
              const productName = product.name.toLowerCase();
              const productDescription = product.description?.toLowerCase() || '';
              return (
                productName.includes(searchLower) ||
                productDescription.includes(searchLower)
              );
            })
            : featuredProducts;

          if (filteredFeatured.length === 0) return null;

          return (
            <div className="mb-8 scroll-mt-32 sm:mb-12" id="category-destacados">
              <div className="mb-4 border-b pb-3 sm:mb-6">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-yellow-600" />
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    Productos Destacados
                  </h2>
                </div>
              </div>

              {/* Carrusel horizontal (ancho fijo por card) */}
              <div className="-mx-3 overflow-x-auto pb-4 sm:mx-0">
                <div className="flex gap-4 px-3 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
                  {filteredFeatured.map((product) => (
                    <div
                      key={product.id}
                      className="basis-[280px] w-[280px] max-w-[280px] flex-shrink-0 sm:basis-[300px] sm:w-[300px] sm:max-w-[300px]"
                    >
                      <ProductCard
                        product={product}
                        onClick={() => onProductSelect(product)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================
            Render por categorías
           ============================ */}
        {filteredCategories.length === 0 && searchTerm ? (
          <div className="py-12 text-center text-gray-500">
            No se encontraron platos que coincidan con &quot;{searchTerm}&quot;
          </div>
        ) : (
          filteredCategories.map((category) => {
            const visibleProducts = category.products; // ✅ ya NO hay "ver más"

            return (
              <div
                key={category.id}
                id={`category-${category.id}`}
                className="mb-8 scroll-mt-32 sm:mb-12"
              >
                <div className="mb-4 border-b pb-3 sm:mb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {/* ✅ Título + botón Ocultar/Mostrar */}
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          className="cursor-pointer select-none text-xl font-bold text-gray-900 sm:text-2xl"
                        >
                          {category.name}
                        </h2>

                      </div>

                      {category.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {category.description}
                        </p>
                      )}

                      {(category.saleHoursStart || category.saleHoursEnd) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            Disponible: {category.saleHoursStart || '00:00'} -{' '}
                            {category.saleHoursEnd || '23:59'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ Si está colapsado, no muestra productos */}

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => onProductSelect(product)}
                    />
                  ))}
                </div>


                {category.products.length === 0 && (
                  <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                    No hay productos disponibles en esta categoría
                  </div>
                )}
              </div>
            );
          })
        )}

        {restaurant.categories.length === 0 && (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <p className="text-lg text-gray-600">
              Este restaurante aún no tiene menú disponible
            </p>
          </div>
        )}

        {/* Reviews */}
        {restaurant.reviewCount !== null &&
          restaurant.reviewCount !== undefined &&
          restaurant.reviewCount > 0 && (
            <div className="mb-12">
              <div className="mb-6 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-gray-900">Reseñas</h2>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Calificaciones de nuestros clientes
                </p>
              </div>
              <ReviewsList restaurantId={restaurant.id} />
            </div>
          )}
      </main>

      <div className="hidden md:block">
        <CartButton universitySlug={restaurant.place.slug} hubId={restaurant.place.slug} />
      </div>

      <div className="md:hidden">
        <CartButton
          universitySlug={restaurant.place.slug}
          hubId={restaurant.place.slug}
          variant="mobile-bar"
        />
      </div>
    </>
  );
}
