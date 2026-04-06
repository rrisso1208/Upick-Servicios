/**
 * Restaurant Admin - Commission & Revenue Dashboard
 *
 * Página CLIENT-SIDE del panel admin del restaurante.
 * - Permite filtrar por rango de fechas
 * - Pide métricas al backend (/api/admin/commission-metrics)
 * - Muestra ventas, comisión, IVA comisión, neto y número de pedidos
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../../components/layout/Header';
import { DollarSign, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../../providers/AuthProvider';

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
/**
 * Tipado del objeto que esperamos del backend.
 * (Esto ayuda a autocompletar y evitar errores al acceder a propiedades)
 */
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

export default function CommissionPage() {
  // metrics: respuesta completa del backend para pintar UI
  const [metrics, setMetrics] = useState<CommissionMetrics | null>(null);

  // loading: controla spinner / pantallas de carga
  const [loading, setLoading] = useState(true);

  // Filtro de fechas (formato: YYYY-MM-DD, compatible con <input type="date" />)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Bandera para evitar que el segundo useEffect dispare fetch antes de setear fechas default
  const [isInitialized, setIsInitialized] = useState(false);
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'week' | 'month'>('month');


  /**
   * Set default date range to last 30 days on mount
   * - Se ejecuta solo una vez ([])
   * - Define las fechas por defecto (últimos 30 días)
   */
  useEffect(() => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Convertimos a YYYY-MM-DD para el input date
    setDateFrom(formatDateLocal(monthAgo));
    setDateTo(formatDateLocal(today));

    // Marca que ya se inicializó el rango, para habilitar el fetch en el siguiente effect
    setIsInitialized(true);
  }, []);

  /**
   * Efecto que ejecuta fetch cuando:
   * 1) ya inicializamos fechas (isInitialized)
   * 2) hay dos fechas (rango válido) O no hay fechas (preset "Todos")
   */
  useEffect(() => {
    // Only fetch after initial dates are set
    if (!isInitialized) return;

    // Fetch metrics when:
    // 1. Both dates are set (specific range)
    // 2. Both dates are empty (all data - "all" preset)
    const hasBothDates = dateFrom && dateTo;
    const hasNoDates = !dateFrom && !dateTo;

    if (hasBothDates || hasNoDates) {
      fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, isInitialized]);

  /**
   * Llama al backend para traer métricas.
   * - Obtiene la sesión de Supabase y, si existe, envía Bearer token en Authorization.
   * - Pasa dateFrom/dateTo como query params si existen.
   */
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Obtener la sesión actual (si el usuario está logueado)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Construimos headers opcionales (Authorization)
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Query params para filtrar por rango de fechas
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      // Llamada al endpoint del backend
      const response = await fetch(
        `/api/admin/commission-metrics?${params.toString()}`,
        {
          headers,
          credentials: 'include', // permite cookies si tu backend las usa
        }
      );

      const data = await response.json();

      // Si el backend reporta success, guardamos la data
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch commission metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formatea valores de dinero a COP.
   * Nota: divide entre 100 => asume que el backend manda montos en centavos.
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  /**
   * Presets rápidos para escoger rango:
   * - today: desde hoy
   * - week: últimos 7 días
   * - month: últimos 30 días
   * - all: sin filtros (envía query vacía)
   */
  const handleDateRangePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    setActivePreset(preset);

    const today = new Date();
    let from: Date;

    if (preset === 'all') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      setDateFrom(formatDateLocal(startOfYear));
      setDateTo(formatDateLocal(today));
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
    }

    setDateFrom(formatDateLocal(from));
    setDateTo(formatDateLocal(today));
  };

  /**
   * Render: loading
   * Muestra spinner y header mientras se cargan datos.
   */
  if (loading) {
    return (
      <>
        <Header title="Ingresos y Comisiones" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  /**
   * Render: si no hay metrics (falló la carga o backend no respondió success)
   */
  if (!metrics) {
    return (
      <>
        <Header title="Ingresos y Comisiones" />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <p className="text-gray-600">No se pudieron cargar las métricas</p>
        </main>
      </>
    );
  }

  const restaurantPaysIva =
    (metrics.restaurant.commissionIvaPayer || 'RESTAURANT') === 'RESTAURANT';

  /**
   * Render principal: dashboard completo
   */
  return (
    <>
      <Header title="Ingresos y Comisiones" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Ingresos y Comisiones</h1>
          <p className="mt-2 text-gray-600">
            Visualiza tus ventas, la comisión de la plataforma y el monto neto
            que recibes
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Porcentaje de comisión actual:{' '}
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

          {/* Botones de presets */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 sm:overflow-visible">
            {(['all', 'today', 'week', 'month'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleDateRangePreset(preset)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
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

          {/* Inputs manuales para fecha */}
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
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {formatCurrency(metrics.metrics.totalCommission)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {metrics.restaurant.commissionPercentage}% sobre ventas
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Neto a Recibir</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {formatCurrency(metrics.metrics.totalNetForRestaurant)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {restaurantPaysIva ? 'Después de comisión e IVA' : 'Después de comisión'}
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
          <h2 className="mb-4 text-lg font-semibold">Resumen de Ingresos</h2>
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
                  Ventas Brutas (vía plataforma)
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
                  Total Neto a Recibir
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-green-600">
                  {formatCurrency(metrics.metrics.totalNetForRestaurant)}
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          {/* Nota explicativa */}
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> La plataforma Upick se queda con el{' '}
              {metrics.restaurant.commissionPercentage}% de comisión sobre cada venta.
              {restaurantPaysIva ? (
                <> Además, se descuenta el IVA (19%) sobre esa comisión.</>
              ) : (
                <> El IVA (19%) sobre la comisión lo asume la plataforma (no se descuenta de tu neto).</>
              )}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
