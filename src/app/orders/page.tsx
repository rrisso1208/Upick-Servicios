/**
 * My Orders page - Student order history (Improved)
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { OrderCard } from '@/components/ui/OrderCard';
import { CancelOrderModal } from '@/components/ui/CancelOrderModal';
import { PickuMascot } from '@/components/ui/PickuMascot';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/providers/AuthProvider';
import { VerticalPurchasePanel } from '@/components/orders/VerticalPurchasePanel';
import { VerticalHistory } from '@/components/orders/VerticalHistory';
import {
  Loader2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Order {
  id: string;
  pickupCode: string;
  pickupSlotStart: Date | string;
  status: string;
  totalAmount: number;
  type: 'eat_in' | 'takeout'; // Order type - deprecated
  serviceMode?: 'eat_in' | 'takeaway' | 'internal_delivery'; // Service mode
  deliveryCost?: number; // Delivery cost in cents
  createdAt: Date | string;
  restaurant: {
    name: string;
    slug: string;
  };
  deliveryPoint?: {
    id: string;
    name: string;
    category?: string | null;
  } | null;
  items: Array<{
    quantity: number;
    product: {
      name: string;
    };
  }>;
}

const statusFilters = [
  { value: 'all', label: 'Todos', icon: Filter },
  { value: 'paid', label: 'Pagados', icon: CheckCircle },
  { value: 'in_progress', label: 'En preparación', icon: Clock },
  { value: 'ready', label: 'Listos', icon: CheckCircle },
  { value: 'delivered', label: 'Entregados', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelados', icon: XCircle },
  { value: 'payment_failed', label: 'Pago fallido', icon: XCircle },
];

export default function MyOrdersPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [selectedOrderForCancel, setSelectedOrderForCancel] =
    useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (userRole === 'student') {
        fetchOrders();
      }
    }
  }, [user, userRole, authLoading, statusFilter, dateFilter, router]);

  // Refresh orders when component mounts or when returning from payment
  useEffect(() => {
    if (user && userRole === 'student' && !authLoading) {
      fetchOrders();
    }
  }, [user?.id]); // Refresh when user ID changes (e.g., after login)

  // Refresh orders when page becomes visible (user returns from payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        user &&
        userRole === 'student'
      ) {
        console.log('[MyOrders] Page became visible, refreshing orders...');
        fetchOrders();
      }
    };

    // Also refresh on focus (when user switches back to tab)
    const handleFocus = () => {
      if (user && userRole === 'student') {
        console.log('[MyOrders] Window focused, refreshing orders...');
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, userRole]);

  const fetchOrders = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    try {
      if (showLoading) setLoading(true);

      console.log(
        '[MyOrders] Fetching orders for user:',
        user?.id,
        user?.email
      );

      // Get session token for Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
        console.log('[MyOrders] Adding Authorization header');
      } else {
        console.warn(
          '[MyOrders] No session token available, relying on cookies'
        );
      }

      const response = await fetch('/api/orders/my-orders', {
        headers,
        credentials: 'include', // Ensure cookies are sent as fallback
      });
      const data = await response.json();

      console.log('[MyOrders] Response:', {
        success: data.success,
        orderCount: data.data?.orders?.length || 0,
        orders: data.data?.orders?.map((o: Order) => ({
          id: o.id,
          pickupCode: o.pickupCode,
          status: o.status,
          createdAt: o.createdAt,
        })),
        cancelledOrders:
          data.data?.orders?.filter((o: Order) => o.status === 'cancelled')
            .length || 0,
      });

      if (data.success) {
        let filteredOrders = data.data.orders;

        // Log order statuses for debugging
        const statusCounts = filteredOrders.reduce(
          (acc: Record<string, number>, o: Order) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          },
          {}
        );
        console.log('[MyOrders] Order status counts:', statusCounts);

        // Filter by status
        if (statusFilter !== 'all') {
          filteredOrders = filteredOrders.filter(
            (o: Order) => o.status === statusFilter
          );
        }

        // Filter by date
        if (dateFilter !== 'all') {
          const now = new Date();
          const filterDate = new Date();

          if (dateFilter === 'today') {
            filterDate.setHours(0, 0, 0, 0);
          } else if (dateFilter === 'week') {
            filterDate.setDate(now.getDate() - 7);
          } else if (dateFilter === 'month') {
            filterDate.setMonth(now.getMonth() - 1);
          }

          filteredOrders = filteredOrders.filter((o: Order) => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= filterDate;
          });
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredOrders = filteredOrders.filter((o: Order) => {
            return (
              o.pickupCode.toLowerCase().includes(query) ||
              o.restaurant.name.toLowerCase().includes(query) ||
              o.items.some((item) =>
                item.product.name.toLowerCase().includes(query)
              )
            );
          });
        }

        setOrders(filteredOrders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      setDeletingOrderId(orderId);

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

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // Remove order from local state
        setOrders((prevOrders) =>
          prevOrders.filter((order) => order.id !== orderId)
        );
        // Optionally show a success message
        console.log('Pedido eliminado exitosamente');
      } else {
        alert(data.error || 'Error al eliminar el pedido');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar el pedido');
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Mis Pedidos" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Mis Pedidos" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <Suspense fallback={null}>
          <VerticalPurchasePanel />
        </Suspense>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
            <p className="mt-2 text-gray-600">
              Historial de tus pedidos anteriores
            </p>
          </div>
          <button
            onClick={async () => {
              console.log('[MyOrders] Manual refresh triggered');
              setIsRefreshing(true);
              await fetchOrders({ showLoading: false });
              setIsRefreshing(false);
            }}
            disabled={loading || isRefreshing}
            className="btn-secondary flex items-center gap-2"
            title="Refrescar lista de pedidos"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            {isRefreshing ? 'Refrescando...' : 'Refrescar'}
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
              <input
                type="text"
                placeholder="Buscar por código, restaurante o producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Status Filters */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Estado
            </label>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      statusFilter === filter.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha
            </label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'today', label: 'Hoy' },
                { value: 'week', label: 'Esta semana' },
                { value: 'month', label: 'Este mes' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    dateFilter === filter.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {orders.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {orders.length} pedido{orders.length !== 1 ? 's' : ''}
            </div>
            <div className="grid gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="relative transition-transform hover:scale-[1.01]"
                >
                  <div
                    onClick={() => router.push(`/orders/${order.id}/receipt`)}
                    className="cursor-pointer"
                  >
                    <OrderCard
                      order={order}
                      showReceiptButton={true}
                      onCancel={
                        // CRITICAL: Only allow cancellation of paid orders
                        order.status !== 'cancelled' &&
                        order.status !== 'refunded' &&
                        order.status !== 'delivered' &&
                        order.status !== 'awaiting_payment' &&
                        order.status !== 'payment_failed'
                          ? () => setSelectedOrderForCancel(order)
                          : undefined
                      }
                    />
                  </div>
                  {/* Delete button for orders with awaiting_payment status */}
                  {order.status === 'awaiting_payment' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id);
                      }}
                      disabled={deletingOrderId === order.id}
                      className="absolute right-4 top-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Eliminar pedido pendiente de pago"
                    >
                      {deletingOrderId === order.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Cancel Order Modal */}
            {selectedOrderForCancel && (
              <CancelOrderModal
                order={selectedOrderForCancel}
                isOpen={!!selectedOrderForCancel}
                onClose={() => setSelectedOrderForCancel(null)}
                onCancelSuccess={async () => {
                  // Refresh orders after successful cancellation
                  console.log('[MyOrders] Order cancelled, refreshing list...');
                  setSelectedOrderForCancel(null);
                  // Wait a bit to ensure DB transaction is complete
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  // Force refresh - fetch fresh data
                  await fetchOrders();
                  // Log the cancelled order status
                  setTimeout(() => {
                    const cancelledOrder = orders.find(
                      (o) => o.id === selectedOrderForCancel?.id
                    );
                    console.log('[MyOrders] Cancelled order status check:', {
                      orderId: selectedOrderForCancel?.id,
                      foundInList: !!cancelledOrder,
                      status: cancelledOrder?.status,
                      allOrdersCount: orders.length,
                    });
                  }, 500);
                }}
              />
            )}
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-12">
            {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' ? (
              <div className="text-center">
                <p className="text-lg text-gray-600">
                  No se encontraron pedidos
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Intenta cambiar los filtros de búsqueda
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  className="btn-secondary mt-4"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  <PickuMascot
                    variant="waving"
                    size="3xl"
                    showText
                    text="¡Aún no tienes pedidos!"
                  />
                </div>
                <p className="mt-4 text-lg text-gray-600">
                  Explora los restaurantes y haz tu primer pedido
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary mt-6"
                >
                  Explorar Restaurantes
                </button>
              </div>
            )}
          </div>
        )}

        <VerticalHistory />
      </main>
      <Footer />
    </>
  );
}
