/**
 * Superadmin - Global Commissions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import toast from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Loader2,
  Store,
  Building2,
  ShoppingCart,
} from 'lucide-react';

interface CommissionData {
  totalCommission: number;
  totalRevenue: number;
  totalOrders: number;
  topRestaurants: Array<{
    name: string;
    commissionPercentage: number;
    commission: number;
    revenue: number;
    orderCount: number;
  }>;
  topPlaces: Array<{
    name: string;
    commission: number;
    revenue: number;
    orderCount: number;
  }>;
  comparisonStats?: {
    totalCommission: number;
    totalRevenue: number;
    commissionGrowth: number;
    revenueGrowth: number;
  } | null;
}

export default function SuperadminCommissionsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<
    'today' | 'week' | 'month' | 'custom' | 'all'
  >('month'); // Default to last month
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [places, setPlaces] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [restaurants, setRestaurants] = useState<
    Array<{ id: string; name: string; placeId: string }>
  >([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'superadmin') {
        router.push('/');
        return;
      }
      fetchPlaces();
      fetchRestaurants();
      fetchCommissions();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchCommissions();
    }
  }, [dateFilter, customDateFrom, customDateTo, selectedPlaceId, selectedRestaurantId]);

  // Reset restaurant selection when place changes
  useEffect(() => {
    if (selectedPlaceId) {
      setSelectedRestaurantId('');
    }
  }, [selectedPlaceId]);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/superadmin/universities');
      const result = await response.json();
      if (result.success) {
        // The API returns { data: { universities: places } }
        const placesData = result.data.universities || result.data.places || [];
        setPlaces(
          placesData.map((p: any) => ({
            id: p.id,
            name: p.name,
          }))
        );
      } else {
        console.error('Failed to fetch places:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/superadmin/restaurants', {
        headers,
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setRestaurants(
          result.data.restaurants.map((r: any) => ({
            id: r.id,
            name: r.name,
            placeId: r.placeId,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    switch (dateFilter) {
      case 'today':
        dateFrom = now.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFrom = weekAgo.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFrom = monthAgo.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;
      case 'custom':
        dateFrom = customDateFrom || null;
        dateTo = customDateTo || null;
        break;
      case 'all':
      default:
        dateFrom = null;
        dateTo = null;
        break;
    }

    return { dateFrom, dateTo };
  };

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (selectedPlaceId) params.append('placeId', selectedPlaceId);
      if (selectedRestaurantId)
        params.append('restaurantId', selectedRestaurantId);

      const response = await fetch(
        `/api/superadmin/commissions?${params.toString()}`
      );
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (selectedRestaurantId)
        params.append('restaurantId', selectedRestaurantId);

      // Get session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/superadmin/commissions/export?${params.toString()}`,
        {
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comisiones-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Comisiones exportadas exitosamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar comisiones. Por favor intenta de nuevo.');
    }
  };

  const handleExportExcel = async (singleRestaurant?: boolean) => {
    try {
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (selectedPlaceId) params.append('placeId', selectedPlaceId);

      // If single restaurant export, add restaurantId
      if (singleRestaurant && selectedRestaurantId) {
        params.append('restaurantId', selectedRestaurantId);
      }

      // Get session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/superadmin/commissions/export-excel?${params.toString()}`,
        {
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr =
        dateFrom && dateTo
          ? `${dateFrom}_${dateTo}`
          : dateFrom
            ? `${dateFrom}_hoy`
            : 'todo';
      a.download =
        singleRestaurant && selectedRestaurantId
          ? `comisiones-restaurante-${dateStr}-${new Date().toISOString().split('T')[0]}.xlsx`
          : `comisiones-todos-restaurantes-${dateStr}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(
        singleRestaurant
          ? 'Excel del restaurante exportado exitosamente'
          : 'Excel con todos los restaurantes exportado exitosamente'
      );
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Error al exportar Excel. Por favor intenta de nuevo.');
    }
  };

  if (authLoading || userRole !== 'superadmin') {
    return (
      <>
        <Header title="Comisiones - Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Comisiones - Superadmin" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Comisiones Globales</h1>
              <p className="mt-2 text-gray-600">
                Vista consolidada de todas las comisiones del sistema
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => handleExportExcel(false)}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Excel (Todos)
              </button>
              {selectedRestaurantId && (
                <button
                  onClick={() => handleExportExcel(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel (Restaurante)
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="card mb-6">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">Filtros</h3>
              </div>
              <div className="space-y-4">
                {/* Place Filter */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Building2 className="mr-2 inline h-4 w-4" />
                    Lugar
                  </label>
                  <select
                    value={selectedPlaceId}
                    onChange={(e) => setSelectedPlaceId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Todos los lugares</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Restaurant Filter */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Store className="mr-2 inline h-4 w-4" />
                    Restaurante
                  </label>
                  <select
                    value={selectedRestaurantId}
                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                    disabled={!selectedPlaceId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedPlaceId
                        ? 'Todos los restaurantes del lugar'
                        : 'Selecciona un lugar primero'}
                    </option>
                    {restaurants
                      .filter((restaurant) =>
                        selectedPlaceId
                          ? restaurant.placeId === selectedPlaceId
                          : true
                      )
                      .map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Date Filters */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Filtros de Fecha
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'Todos' },
                        { value: 'today', label: 'Hoy' },
                        { value: 'week', label: 'Última Semana' },
                        { value: 'month', label: 'Último Mes' },
                        { value: 'custom', label: 'Personalizado' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setDateFilter(option.value as any)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            dateFilter === option.value
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {dateFilter === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <span className="text-gray-600">hasta</span>
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : !data ? (
          <div className="card py-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No hay datos disponibles</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Comisiones</p>
                    <p className="mt-2 text-3xl font-bold">
                      ${((data.totalCommission || 0) / 100).toLocaleString()}
                    </p>
                    {data.comparisonStats && (
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            data.comparisonStats.commissionGrowth >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        />
                        <span
                          className={
                            data.comparisonStats.commissionGrowth >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {data.comparisonStats.commissionGrowth >= 0
                            ? '+'
                            : ''}
                          {data.comparisonStats.commissionGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-500">
                          vs período anterior
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-full bg-green-500 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ingresos Totales</p>
                    <p className="mt-2 text-3xl font-bold">
                      ${((data.totalRevenue || 0) / 100).toLocaleString()}
                    </p>
                    {data.comparisonStats && (
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            data.comparisonStats.revenueGrowth >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        />
                        <span
                          className={
                            data.comparisonStats.revenueGrowth >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {data.comparisonStats.revenueGrowth >= 0 ? '+' : ''}
                          {data.comparisonStats.revenueGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-500">
                          vs período anterior
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-full bg-blue-500 p-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Pedidos</p>
                    <p className="mt-2 text-3xl font-bold">
                      {data.totalOrders}
                    </p>
                  </div>
                  <div className="rounded-full bg-purple-500 p-3">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tasa de Comisión</p>
                    <p className="mt-2 text-3xl font-bold">
                      {data.totalRevenue > 0
                        ? (
                            (data.totalCommission / data.totalRevenue) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                  <div className="rounded-full bg-yellow-500 p-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Restaurants */}
              <div className="card">
                <h2 className="mb-4 text-xl font-bold">
                  Top 10 Restaurantes por Comisión
                </h2>
                {data.topRestaurants.length === 0 ? (
                  <p className="text-gray-600">No hay datos disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {data.topRestaurants.map((restaurant, index) => (
                      <div
                        key={restaurant.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-600">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{restaurant.name}</div>
                            <div className="text-xs text-gray-500">
                              {restaurant.orderCount} pedidos • $
                              {(
                                (restaurant.revenue || 0) / 100
                              ).toLocaleString()}{' '}
                              ingresos
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            $
                            {(
                              (restaurant.commission || 0) / 100
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {restaurant.commissionPercentage != null
                              ? Number(restaurant.commissionPercentage).toFixed(2)
                              : '0.00'}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Universities */}
              <div className="card">
                <h2 className="mb-4 text-xl font-bold">Comisiones por Lugar</h2>
                {data.topPlaces.length === 0 ? (
                  <p className="text-gray-600">No hay datos disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {data.topPlaces.map((place, index) => (
                      <div
                        key={place.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{place.name}</div>
                            <div className="text-xs text-gray-500">
                              {place.orderCount} pedidos • $
                              {((place.revenue || 0) / 100).toLocaleString()}{' '}
                              ingresos
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${((place.commission || 0) / 100).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {place.revenue > 0
                              ? (
                                  (place.commission / place.revenue) *
                                  100
                                ).toFixed(2)
                              : '0.00'}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
