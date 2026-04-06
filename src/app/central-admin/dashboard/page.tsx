/**
 * Central Admin Dashboard
 * Dashboard con métricas agregadas de todos los restaurantes de la Central
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Store,
  Loader2,
  Calendar,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface DashboardData {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  restaurants: Array<{
    id: string;
    name: string;
    slug: string;
    place: {
      id: string;
      name: string;
      city?: {
        id: string;
        name: string;
      } | null;
    };
    sales: number;
    orderCount: number;
    averageTicket: number;
  }>;
}

export default function CentralAdminDashboard() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [places, setPlaces] = useState<Array<{ id: string; name: string; cityId: string | null }>>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'central_admin') {
        router.push('/');
        return;
      }
      fetchFilters();
      fetchData();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (userRole === 'central_admin') {
      fetchData();
    }
  }, [dateFrom, dateTo, selectedCityId, selectedPlaceId]);

  const fetchFilters = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/central-admin/filters', {
        cache: 'no-store',
        headers,
      });

      const result = await response.json();

      if (result.success) {
        setCities(result.data.cities || []);
        setPlaces(result.data.places || []);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (selectedCityId) params.append('cityId', selectedCityId);
      if (selectedPlaceId) params.append('placeId', selectedPlaceId);

      const response = await fetch(
        `/api/central-admin/dashboard?${params.toString()}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }
      );

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        console.error('Error fetching dashboard:', result.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !data) {
    return (
      <>
        <Header />
        <div className="container-modern flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Métricas agregadas de todos tus restaurantes
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Actualizar
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ciudad
            </label>
            <select
              value={selectedCityId}
              onChange={(e) => {
                setSelectedCityId(e.target.value);
                setSelectedPlaceId(''); // Reset place when city changes
              }}
              className="input w-full"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hub
            </label>
            <select
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(e.target.value)}
              className="input w-full"
              disabled={!selectedCityId && cities.length > 0}
            >
              <option value="">Todos los Hubs</option>
              {places
                .filter((place) => !selectedCityId || place.cityId === selectedCityId)
                .map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <>
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Ventas
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {formatCurrency(data.totalSales)}
                    </p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Pedidos
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {data.totalOrders.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Ticket Promedio
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {formatCurrency(data.averageTicket)}
                    </p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="card rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Restaurantes
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {data.restaurants.length}
                    </p>
                  </div>
                  <div className="rounded-full bg-orange-100 p-3">
                    <Store className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="card rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Ranking de Restaurantes
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ordenados por ventas (mayor a menor)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Restaurante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ubicación
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ventas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Pedidos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ticket Promedio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.restaurants.map((restaurant, index) => (
                      <tr
                        key={restaurant.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {restaurant.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{restaurant.place.name}</span>
                            {restaurant.place.city && (
                              <span className="text-gray-400">
                                - {restaurant.place.city.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(restaurant.sales)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {restaurant.orderCount.toLocaleString('es-CO')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {formatCurrency(restaurant.averageTicket)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.restaurants.length === 0 && (
                <div className="p-12 text-center">
                  <Store className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-sm text-gray-500">
                    No hay datos para mostrar
                  </p>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}

