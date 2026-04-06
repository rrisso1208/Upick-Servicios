/**
 * Client component for places list with search functionality
 *
 * ✅ Qué hace:
 * - Recibe places y cities desde el server (page.tsx)
 * - Maneja estado de UI: búsqueda y filtro por ciudad
 * - Filtra en memoria (sin llamar a la API)
 * - Renderiza tarjetas <Link> hacia /[place.slug]
 *
 * ⚠️ Por qué es "use client":
 * - Usa useState
 * - Tiene eventos onChange / onClick
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';     // navegación interna
import Image from 'next/image';   // imágenes optimizadas por Next
import { Building2, Search, X, MapPin, ChevronDown } from 'lucide-react'; // íconos
import { PickuMascot } from '@/components/ui/PickuMascot';  // mascota UI
import { Footer } from '@/components/layout/Footer';         // footer global

/**
 * Tipos (interfaces) de datos que este componente espera.
 * Estos vienen de Prisma (pero aquí los definieron manualmente).
 */

interface City {
  id: string;
  name: string;
  code?: string | null;
  _count: {
    places: number; // prisma devuelve _count.places
  };
}

interface Place {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;

  cityId?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  city?: {
    id: string;
    name: string;
  } | null;

  _count: {
    restaurants: number;
  };
}

/**
 * Props:
 * - places y cities vienen desde el Server Component (HomePage)
 * - errorMessage puede venir si hubo problema con la BD (fallback)
 */
interface PlacesClientProps {
  places: Place[];
  cities: City[];
  errorMessage?: string | null;
}

function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function PlacesClient({ places, cities, errorMessage }: PlacesClientProps) {
  /**
   * Estado local (solo UI):
   * - searchTerm: texto de búsqueda
   * - selectedCityId: filtro por ciudad
   */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        console.log("User denied geolocation");
      }
    );
  }, []);

  /**
   * FILTRO DE LUGARES EN MEMORIA
   *
   * Recorre todos los places y decide cuáles mostrar.
   * Reglas:
   * 1) Si hay ciudad seleccionada => solo los que coincidan por cityId
   * 2) Si hay searchTerm => filtra por nombre que incluya el texto
   */

  const sortedPlaces = useMemo(() => {
    if (!userLocation) return places;

    return [...places].sort((a, b) => {
      if (!a.latitude || !a.longitude) return 1;
      if (!b.latitude || !b.longitude) return -1;

      const distA = getDistance(
        userLocation.lat,
        userLocation.lng,
        a.latitude,
        a.longitude
      );

      const distB = getDistance(
        userLocation.lat,
        userLocation.lng,
        b.latitude,
        b.longitude
      );

      return distA - distB;
    });
  }, [places, userLocation]);

  const filteredPlaces = sortedPlaces.filter((place) => {
    // 1) filtro por ciudad
    if (selectedCityId && place.cityId !== selectedCityId) {
      return false;
    }

    // 2) filtro por búsqueda (por nombre)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const placeName = place.name.toLowerCase();
      return placeName.includes(searchLower);
    }

    // Si no hay filtros activos, lo mostramos
    return true;
  });

  return (
    <>
      {/* MAIN: contenido principal */}
      <main className="container-modern min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:py-16">

        {/* ======================
            HERO SECTION (intro)
           ====================== */}
        <div className="mb-16 animate-fade-in-up sm:mb-20 pt-10 sm:pt-0">
          <div className="flex flex-col-reverse items-center justify-center gap-12 sm:flex-row sm:gap-12 lg:gap-16">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Bienvenido a <span className="text-gradient">UPick</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 sm:text-xl">
                Ordena tu comida y evita las filas.
                <br className="hidden sm:block" />
                ¡Tu tiempo vale oro!
              </p>
            </div>

            {/* Mascota Picku con bubble */}
            <div className="hidden sm:flex relative flex-shrink-0 z-20 mt-2 sm:mt-0">
              {/* Bubble de texto (hola soy Picku) */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 z-30 animate-bounce-slow sm:-left-20 sm:translate-x-0 sm:-top-12 lg:-left-28">
                <div className="relative rounded-2xl bg-white px-4 py-2 shadow-2xl ring-1 ring-gray-900/10">
                  <p className="whitespace-nowrap text-[12px] font-bold text-gray-900 sm:text-sm lg:text-lg">
                    ¡Hola! Soy Picku 🦘
                  </p>
                  {/* "Piquito" del globo */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-white ring-1 ring-gray-900/10 border-b border-r border-gray-100 sm:left-auto sm:right-8"></div>
                </div>
              </div>

              {/* Mascota UPICK*/}
              <div className="transition-transform duration-500 hover:scale-105 hover:rotate-2">
                <PickuMascot
                  variant="jumping"
                  size="xl"
                  className="mix-blend-multiply sm:scale-125 lg:scale-150"
                />
              </div>
            </div>
          </div>
        </div>

        {/*
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">


          {cities.length > 0 && (
            <div className="relative w-full sm:w-auto sm:min-w-[200px]">
              <MapPin className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary-500" />

              <ChevronDown className="absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)} // actualiza filtro
                className="input relative w-full rounded-full border-gray-200 bg-white py-3 pl-12 pr-10 shadow-sm transition-all duration-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:shadow-md appearance-none z-0"
              >

                <option value="">Todas las ciudades</option>


                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city._count.places})
                  </option>
                ))}
              </select>
            </div>
          )}

           BARRA DE BÚSQUEDA
          <div className="relative w-full max-w-2xl sm:flex-1">
            <Search className="absolute left-4 z-10 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500" />

            <input
              type="text"
              placeholder="¿Qué se te antoja hoy? Busca un lugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // actualiza búsqueda
              className="input w-full rounded-full border-gray-200 bg-white py-3 pl-12 pr-12 shadow-sm transition-all duration-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:shadow-md"
            />

            Si hay texto, muestra botón X para limpiar
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div> */}

        {/* ======================
            PLACES GRID (tarjetas)
           ====================== */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((place, index) => {
            /**
             * Validación defensiva del imageUrl
             * - Solo permite mostrar imagen si:
             *   - es string no vacío
             *   - comienza por http/https
             *
             * Esto evita que Next/Image falle con valores raros.
             */
            const hasValidImage =
              place.imageUrl &&
              typeof place.imageUrl === 'string' &&
              place.imageUrl.trim().length > 0 &&
              (place.imageUrl.startsWith('http://') ||
                place.imageUrl.startsWith('https://'));

            return (
              /**
               * Cada tarjeta es un Link hacia "/{slug}"
               * Ej: /javeriana, /campus-univalle, etc.
               */
              <Link
                key={place.id}
                href={`/${place.slug}`}
                className="card-interactive group animate-fade-in-up overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                // Delay por índice para animación escalonada
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Si hay imagen válida => card con imagen */}
                {hasValidImage ? (
                  <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                    <Image
                      src={place.imageUrl || ''}
                      alt={place.name}
                      fill
                      /**
                       * sizes ayuda a Next a elegir tamaño correcto
                       * según el viewport (mejor performance)
                       */
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      quality={85}
                      loading="lazy"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      style={{
                        // punto de enfoque (center, top, etc.)
                        objectPosition: place.imagePosition || 'center',
                        // escala extra (si place.imageScale viene de BD)
                        transform: `scale(${place.imageScale || 1.0})`,
                      }}
                    />

                    {/* Oscurecimiento tipo gradient para que el texto se lea */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-70" />

                    {/* Texto abajo dentro de la imagen */}
                    <div className="absolute bottom-0 left-0 p-4 text-white">
                      <h3 className="text-2xl font-bold drop-shadow-md">
                        {place.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                        <p className="text-sm font-medium text-white/90">
                          {place._count.restaurants} Comercios UPick
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /**
                   * Si NO hay imagen válida:
                   * - muestra fondo gradient + icono Building2
                   * - igual muestra nombre y cantidad de restaurantes
                   */
                  <div className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100/50">
                    <Building2 className="h-20 w-20 text-primary-300" />
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {place.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {place._count.restaurants} Comercios UPick
                      </p>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* ======================
            EMPTY STATE: búsqueda sin resultados
           ====================== */}
        {filteredPlaces.length === 0 && searchTerm && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
            <PickuMascot variant="thinking" size="xl" className="mb-6 opacity-90" />
            <h3 className="text-xl font-semibold text-gray-900">
              Mmm... no encuentro &quot;{searchTerm}&quot;
            </h3>
            <p className="mt-2 text-gray-500">
              ¿Intentamos buscar con otro nombre?
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-6 btn-secondary"
            >
              Ver todos los lugares
            </button>
          </div>
        )}

        {/* ======================
            EMPTY STATE: no hay places (o error de BD)
           ====================== */}
        {places.length === 0 && !searchTerm && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
            {errorMessage ? (
              <>
                <PickuMascot variant="thinking" size="xl" className="mb-6 opacity-90" />
                <h3 className="mb-2 text-xl font-semibold text-red-600">
                  ¡Ups! Algo salió mal
                </h3>
                <p className="mb-6 text-gray-500 max-w-md mx-auto">
                  {errorMessage}
                </p>
                <p className="text-sm text-gray-400">
                  Picku está intentando reconectar los cables...
                </p>
              </>
            ) : (
              <>
                <PickuMascot variant="chef" size="xl" className="mb-6" />
                <h3 className="text-xl font-semibold text-gray-900">
                  ¡Estamos preparando todo!
                </h3>
                <p className="mt-2 text-gray-500">
                  Aún no hay lugares disponibles, pero pronto estaremos listos.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer global (fuera del main) */}
      <Footer />
    </>
  );
}
