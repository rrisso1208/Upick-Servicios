/**
 * Superadmin - Restaurant Commission Metrics Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../../../components/layout/Header';
import {
  DollarSign,
  TrendingUp,
  Download,
  Loader2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../../../../providers/AuthProvider';

interface CommissionMetrics {
  restaurant: {
    id: string;
    name: string;
    commissionPercentage: string;
    commissionIvaPayer?: 'RESTAURANT' | 'PLATFORM';
  };
  dateRange: {
    from: string;
    to: string;
  };
  metrics: {
    totalGrossSales: number;
    totalCommission: number;
    totalIvaOnCommission: number;
    totalNetForRestaurant: number;
    totalOrders: number;
    totalRestaurantSales: number;
  };
}



export default function RestaurantCommissionPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const [metrics, setMetrics] = useState<CommissionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'week' | 'month' | null>('month');



  // Set default date range to last 30 days on mount
  useEffect(() => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    setDateFrom(monthAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(
        `/api/superadmin/restaurants/${restaurantId}/commission-metrics?${params.toString()}`,
        {
          headers,
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch commission metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const handleDateRangePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    setActivePreset(preset);

    const today = new Date();
    let from: Date;

    if (preset === 'all') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      setDateFrom(startOfYear.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
      return;
    }

    switch (preset) {
      case 'today':
        from = new Date(today);
        from.setHours(0, 0, 0, 0);
        break;

      case 'week':
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        break;

      case 'month':
        from = new Date(today);
        from.setDate(today.getDate() - 30);
        break;

      default:
        return;
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <>
        <Header title="Métricas de Comisión" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!metrics) {
    return (
      <>
        <Header title="Métricas de Comisión" />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <p className="text-gray-600">No se pudieron cargar las métricas</p>
        </main>
      </>
    );
  }

  const restaurantPaysIva =
    (metrics.restaurant.commissionIvaPayer || 'RESTAURANT') === 'RESTAURANT';

  return (
    <>
      <Header title="Métricas de Comisión" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <h1 className="text-3xl font-bold">{metrics.restaurant.name}</h1>
          <p className="mt-2 text-gray-600">
            Porcentaje de comisión configurado:{' '}
            <span className="font-semibold">
              {metrics.restaurant.commissionPercentage}%
            </span>
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="card mb-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Rango de Fechas</h2>
          </div>
          <div className="mb-4 flex gap-2">
            {(['all', 'today', 'week', 'month'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleDateRangePreset(preset)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  preset === activePreset
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset === 'all'
                  ? 'Todos'
                  : preset === 'today'
                    ? 'Hoy'
                    : preset === 'week'
                      ? 'Últimos 7 días'
                      : 'Últimos 30 días'}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Desde
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
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Ventas Brutas</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {formatCurrency(metrics.metrics.totalRestaurantSales)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Total facturado vía plataforma
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Comisión de la Plataforma
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {formatCurrency(metrics.metrics.totalCommission)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {metrics.restaurant.commissionPercentage}% sobre ventas
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Total a Transferir al Restaurante
                </p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {formatCurrency(metrics.metrics.totalNetForRestaurant)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {restaurantPaysIva ? 'Neto después de comisión e IVA' : 'Neto después de comisión'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Número de Pedidos</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {metrics.metrics.totalOrders}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Pedidos confirmados
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="card mt-6">
          <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Concepto
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Ventas Brutas
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(metrics.metrics.totalRestaurantSales)}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Comisión de la Plataforma (
                    {metrics.restaurant.commissionPercentage}%)
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    -{formatCurrency(metrics.metrics.totalCommission)}
                  </td>
                </tr>
                {restaurantPaysIva ? (
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      IVA sobre la Comisión (19%)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      -{formatCurrency(metrics.metrics.totalIvaOnCommission)}
                    </td>
                  </tr>
                ) : (
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      IVA sobre la Comisión (19%)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-600">
                      Lo asume la plataforma
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    Total a Transferir al Restaurante
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-green-600">
                    {formatCurrency(metrics.metrics.totalNetForRestaurant)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
