/**
 * Superadmin - All Orders Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Loader2,
  X,
  CheckCircle,
  Clock,
  Package,
  XCircle,
} from 'lucide-react';

interface Order {
  id: string;
  pickupCode: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  place: {
    id: string;
    name: string;
    slug: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      price: number;
    };
  }>;
  payment: {
    id: string;
    status: string;
    method: string | null;
    amount: number;
  } | null;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Place {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagado', className: 'badge-info' },
  in_progress: { label: 'En preparación', className: 'badge-warning' },
  ready: { label: 'Listo', className: 'badge-success' },
  delivered: { label: 'Entregado', className: 'badge-info' },
  cancelled: { label: 'Cancelado', className: 'badge-error' },
  refunded: { label: 'Reembolsado', className: 'badge-error' },
};

export default function SuperadminOrdersPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
      fetchRestaurants();
      fetchPlaces();
      fetchOrders();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchOrders();
    }
  }, [
    statusFilter,
    restaurantFilter,
    placeFilter,
    dateFrom,
    dateTo,
    searchTerm,
    minAmount,
    maxAmount,
  ]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/superadmin/restaurants');
      const data = await response.json();
      if (data.success) {
        setRestaurants(data.data.restaurants);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/superadmin/universities');
      const data = await response.json();
      if (data.success) {
        setPlaces(data.data.universities);
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (restaurantFilter !== 'all') {
        params.append('restaurantId', restaurantFilter);
      }
      if (placeFilter !== 'all') {
        params.append('placeId', placeFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (minAmount) {
        params.append(
          'minAmount',
          String(Math.floor(parseFloat(minAmount) * 100))
        );
      }
      if (maxAmount) {
        params.append(
          'maxAmount',
          String(Math.floor(parseFloat(maxAmount) * 100))
        );
      }
      params.append('limit', '100');

      const response = await fetch(
        `/api/superadmin/orders?${params.toString()}`
      );
      const data = await response.json();
      if (data.success) {
        setOrders(data.data.orders);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (restaurantFilter !== 'all')
        params.append('restaurantId', restaurantFilter);
      if (placeFilter !== 'all') params.append('placeId', placeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (searchTerm) params.append('search', searchTerm);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);

      const response = await fetch(
        `/api/superadmin/orders/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Pedidos exportados exitosamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar pedidos. Por favor intenta de nuevo.');
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setRestaurantFilter('all');
    setPlaceFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
  };

  if (authLoading || userRole !== 'superadmin') {
    return (
      <>
        <Header title="Pedidos - Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Pedidos - Superadmin" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Todos los Pedidos</h1>
            <p className="mt-2 text-gray-600">
              Vista centralizada de todos los pedidos del sistema
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
              Exportar
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código de pedido o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filtros Avanzados</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpiar filtros
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  <option value="paid">Pagado</option>
                  <option value="in_progress">En preparación</option>
                  <option value="ready">Listo</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Restaurante
                </label>
                <select
                  value={restaurantFilter}
                  onChange={(e) => setRestaurantFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Lugar</label>
                <select
                  value={placeFilter}
                  onChange={(e) => setPlaceFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Monto Mínimo (COP)
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Monto Máximo (COP)
                </label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {orders.length} de {total} pedidos
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card py-12 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No se encontraron pedidos</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Restaurante
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Lugar
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = statusConfig[order.status] || {
                    label: order.status,
                    className: 'badge-info',
                  };
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-primary-600">
                          {order.pickupCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {order.student.firstName} {order.student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.student.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{order.restaurant.name}</td>
                      <td className="px-4 py-3">{order.place.name}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ${((order.totalAmount || 0) / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            router.push(`/orders/${order.id}/receipt`)
                          }
                          className="text-primary-600 hover:text-primary-700"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
