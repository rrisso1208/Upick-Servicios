/**
 * Superadmin Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
  Building2,
  Store,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Loader2,
  Utensils,
  RefreshCw,
  Calendar,
  Bell,
  FileText,
  Network,
} from 'lucide-react';

interface Stats {
  universities: number;
  restaurants: number;
  totalOrders: number;
  totalRevenue: number;
  totalServiceFeeRevenue: number; // Revenue from service fees (100% Upi)
  totalCommission: number;
  comparisonStats?: {
    totalOrders: number;
    totalRevenue: number;
    totalServiceFeeRevenue: number;
    totalCommission: number;
    ordersGrowth: number;
    revenueGrowth: number;
    commissionGrowth: number;
  } | null;
  recentOrders?: Array<{
    id: string;
    pickupCode: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    student: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    restaurant: {
      name: string;
    };
    university: {
      name: string;
    };
  }>;
  topRestaurants?: Array<{
    name: string;
    revenue: number;
  }>;
  topUniversities?: Array<{
    name: string;
    orderCount: number;
  }>;
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    'today' | 'week' | 'month' | 'custom' | 'all'
  >('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      // If role is null, it's still loading - wait for it
      if (userRole === null) {
        return;
      }
      if (userRole !== 'superadmin') {
        router.push('/');
        return;
      }
      fetchStats();
    }
  }, [
    user,
    userRole,
    authLoading,
    router,
    dateFilter,
    customDateFrom,
    customDateTo,
  ]);

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

  const fetchStats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const { dateFrom, dateTo } = getDateRange();
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      // Get session token for Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/superadmin/stats?${params.toString()}`,
        {
          headers,
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchStats(true);
  };

  if (authLoading) {
    return (
      <>
        <Header title="Dashboard Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  // Show loading if role is still being fetched, but with a timeout message
  if (userRole === null) {
    return (
      <>
        <Header title="Dashboard Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-4 text-gray-600">Cargando permisos...</p>
          </div>
        </div>
      </>
    );
  }

  if (userRole !== 'superadmin') {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <>
        <Header title="Dashboard Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard Superadmin" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Global</h1>
              <p className="mt-2 text-gray-600">
                Vista general del sistema Upick
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2"
              title="Refrescar estadísticas"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? 'Refrescando...' : 'Refrescar'}
            </button>
          </div>

          {/* Date Filters */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Filtros de Fecha</h3>
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
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${dateFilter === option.value
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

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            {
              title: 'Lugares',
              value: stats?.universities ?? 0,
              icon: Building2,
              color: 'bg-blue-500',
              link: '/superadmin/universities',
            },
            {
              title: 'Restaurantes',
              value: stats?.restaurants ?? 0,
              icon: Store,
              color: 'bg-green-500',
              link: '/superadmin/restaurants',
            },
            {
              title: 'Pedidos Totales',
              value: stats?.totalOrders ?? 0,
              icon: ShoppingCart,
              color: 'bg-purple-500',
              growth: stats?.comparisonStats?.ordersGrowth,
            },
            {
              title: 'Ingresos Totales',
              value: `$${((stats?.totalRevenue ?? 0) / 100).toLocaleString('es-CO')}`,
              icon: DollarSign,
              color: 'bg-yellow-500',
              growth: stats?.comparisonStats?.revenueGrowth,
            },
            {
              title: 'Revenue por Service Fee',
              value: `$${((stats?.totalServiceFeeRevenue ?? 0) / 100).toLocaleString('es-CO')}`,
              icon: DollarSign,
              color: 'bg-purple-500',
              growth: stats?.comparisonStats?.totalServiceFeeRevenue 
                ? ((stats?.totalServiceFeeRevenue ?? 0) - stats.comparisonStats.totalServiceFeeRevenue) / stats.comparisonStats.totalServiceFeeRevenue * 100
                : undefined,
            },
            {
              title: 'Comisiones',
              value: `$${((stats?.totalCommission ?? 0) / 100).toLocaleString('es-CO')}`,
              icon: TrendingUp,
              color: 'bg-red-500',
              growth: stats?.comparisonStats?.commissionGrowth,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            const growth = (stat as any).growth;
            return (
              <div
                key={stat.title}
                className="card cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => stat.link && router.push(stat.link)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                    {growth !== undefined && growth !== null && (
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <TrendingUp
                          className={`h-4 w-4 ${growth >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                        />
                        <span
                          className={
                            growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {growth >= 0 ? '+' : ''}
                          {growth.toFixed(1)}%
                        </span>
                        <span className="text-gray-500">
                          vs período anterior
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/superadmin/universities')}
                className="btn-secondary w-full justify-start"
              >
                <Building2 className="mr-2 h-5 w-5" />
                Gestionar Lugares
              </button>
              <button
                onClick={() => router.push('/superadmin/restaurants')}
                className="btn-secondary w-full justify-start"
              >
                <Store className="mr-2 h-5 w-5" />
                Gestionar Restaurantes
              </button>
              <button
                onClick={() => router.push('/superadmin/food-categories')}
                className="btn-secondary w-full justify-start"
              >
                <Utensils className="mr-2 h-5 w-5" />
                Gestionar Categorías de Comida
              </button>
              <button
                onClick={() => router.push('/superadmin/notifications')}
                className="btn-secondary w-full justify-start"
              >
                <Bell className="mr-2 h-5 w-5" />
                Ver Notificaciones
              </button>
              <button
                onClick={() => router.push('/superadmin/orders')}
                className="btn-secondary w-full justify-start"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Ver Todos los Pedidos
              </button>
              <button
                onClick={() => router.push('/superadmin/users')}
                className="btn-secondary w-full justify-start"
              >
                <Users className="mr-2 h-5 w-5" />
                Gestionar Usuarios
              </button>
              <button
                onClick={() => router.push('/superadmin/commissions')}
                className="btn-secondary w-full justify-start"
              >
                <DollarSign className="mr-2 h-5 w-5" />
                Ver Comisiones Globales
              </button>
              <button
                onClick={() => router.push('/superadmin/centrals')}
                className="btn-secondary w-full justify-start"
              >
                <Network className="mr-2 h-5 w-5" />
                Gestionar Centrales y Franquicias
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Estado del Sistema</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="font-semibold text-green-600">Operativo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Versión:</span>
                <span className="font-semibold">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ambiente:</span>
                <span className="font-semibold">
                  {process.env.NODE_ENV === 'production'
                    ? 'Producción'
                    : 'Desarrollo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última actualización:</span>
                <span className="font-semibold">
                  {new Date().toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          {stats?.recentOrders && stats.recentOrders.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-xl font-bold">Pedidos Recientes</h2>
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                    onClick={() => router.push(`/orders/${order.id}/receipt`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-600">
                          #{order.pickupCode}
                        </span>
                        <span className="text-sm text-gray-600">
                          {order.restaurant.name}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {order.student.firstName} {order.student.lastName} •{' '}
                        {order.university.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${((order.totalAmount || 0) / 100).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/superadmin/orders')}
                className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ver todos los pedidos
              </button>
            </div>
          )}

          {/* Top Restaurants */}
          {stats?.topRestaurants && stats.topRestaurants.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-xl font-bold">Top 5 Restaurantes</h2>
              <div className="space-y-2">
                {stats.topRestaurants.map((restaurant, index) => (
                  <div
                    key={restaurant.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-600">
                        {index + 1}
                      </div>
                      <span className="font-medium">{restaurant.name}</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${((restaurant.revenue || 0) / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Places */}
          {stats?.topUniversities && stats.topUniversities.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-xl font-bold">Top 5 Lugares</h2>
              <div className="space-y-2">
                {stats.topUniversities.map((university, index) => (
                  <div
                    key={university.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <span className="font-medium">{university.name}</span>
                    </div>
                    <span className="font-semibold text-blue-600">
                      {university.orderCount} pedidos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
