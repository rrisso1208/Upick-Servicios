/**
 * Restaurant Admin - Metrics Dashboard (Improved)
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  Package,
  Clock,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/providers/AuthProvider';

interface Metrics {
  totalRevenue: number;
  totalCommission: number;
  totalOrders: number;
  averageTicket: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  peakHours: string[];
  comparison: {
    revenueChange: number;
    commissionChange: number;
    ordersChange: number;
    ticketChange: number;
  };
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/metrics?period=${period}`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/export?period=${period}`, {
        headers,
        credentials: 'include',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${period}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Error al exportar datos');
    }
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    const Icon = isPositive ? ArrowUp : ArrowDown;
    return (
      <span
        className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
      >
        <Icon className="h-4 w-4" />
        {Math.abs(change)}%
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Header title="Métricas" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  const stats = [
    {
      title: 'Pedidos',
      value: metrics?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      change: metrics?.comparison.ordersChange,
    },
    {
      title: 'Ticket Promedio',
      value: `$${Math.max(0, (metrics?.averageTicket || 0) / 100).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      change: metrics?.comparison.ticketChange,
    },
  ];

  return (
    <>
      <Header title="Métricas" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Métricas y Reportes</h1>
            <p className="mt-2 text-gray-600">
              Analiza el desempeño de tu restaurante
            </p>
          </div>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </button>
        </div>

        {/* Period Filter */}
        <div className="card mb-6">
          <div className="flex gap-2">
            {['today', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${period === p
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {p === 'today'
                  ? 'Hoy'
                  : p === 'week'
                    ? 'Esta semana'
                    : 'Este mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    {stat.change !== undefined && stat.change !== 0 && (
                      <p className="mt-2 text-sm">
                        {formatChange(stat.change)}
                      </p>
                    )}
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Orders by Status */}
          {metrics?.ordersByStatus && (
            <div className="card">
              <h3 className="mb-4 text-lg font-semibold">Pedidos por Estado</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(metrics.ordersByStatus).map(
                  ([status, count]) => (
                    <div key={status} className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm capitalize text-gray-600">
                        {status === 'paid'
                          ? 'Pendientes'
                          : status === 'in_progress'
                            ? 'En preparación'
                            : status === 'ready'
                              ? 'Listos'
                              : status === 'delivered'
                                ? 'Entregados'
                                : status}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{count}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Peak Hours */}
          {metrics?.peakHours && metrics.peakHours.length > 0 && (
            <div className="card">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                Horas Pico
              </h3>
              <div className="space-y-2">
                {metrics.peakHours.map((hour, index) => (
                  <div
                    key={hour}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <span className="font-medium">
                      #{index + 1} {hour}
                    </span>
                    <span className="text-sm text-gray-600">
                      Mayor actividad
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        {metrics?.topProducts && metrics.topProducts.length > 0 && (
          <div className="card mt-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" />
              Productos Más Vendidos
            </h3>
            <div className="space-y-3">
              {metrics.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${Math.max(0, product.revenue / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Ingresos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
