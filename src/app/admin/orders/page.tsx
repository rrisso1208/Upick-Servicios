/**
 * Restaurant admin - Orders KDS/Kanban with Realtime Updates
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { OrderCard } from '../../../components/ui/OrderCard';
import { Loader2, RefreshCw, Bell, QrCode, Calendar, X } from 'lucide-react';
import {
  useRealtimeOrders,
  RealtimeOrder,
} from '../../../hooks/useRealtimeOrders';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { QRScannerModal } from '../../../components/admin/QRScannerModal';
import logger from '../../../lib/logger';
import { OrderStatus } from '@prisma/client';

type Order = RealtimeOrder & {
  id: string;
  pickupCode: string;
  pickupSlotStart: Date | string;
  status: OrderStatus;
  totalAmount: number;
  readyAt?: Date | string | null;
  student: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  type: 'eat_in' | 'takeout';
  items: Array<{
    quantity: number;
    notes?: string | null;
    product: {
      name: string;
    };
    options?: Array<{
      productOption: {
        name: string;
        group: {
          name: string;
        };
      };
    }>;
  }>;
};

const statusColumns = [
  { status: 'paid', title: 'Pendientes', color: 'bg-blue-100' },
  { status: 'in_progress', title: 'En preparación', color: 'bg-yellow-100' },
  { status: 'ready', title: 'Listos', color: 'bg-green-100' },
  { status: 'delivered', title: 'Entregados', color: 'bg-gray-100' },
];

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function canMarkReady(order: Order) {
  const now = new Date();
  const pickup = new Date(order.pickupSlotStart);

  const diffMinutes = (pickup.getTime() - now.getTime()) / (1000 * 60);

  return diffMinutes <= 10;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    'auth' | 'assignment' | 'connection' | null
  >(null);

  const [showQRScanner, setShowQRScanner] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [dateFilter, setDateFilter] = useState<{
    from: string;
    to: string;
  } | null>({
    from: todayStr,
    to: todayStr,
  });

  type DatePreset = 'today' | 'last7' | 'last30' | null;

  const [activePreset, setActivePreset] = useState<DatePreset>('today');


  // ✅ Presets
  const setTodayFilter = () => {
    const todayStr = toYYYYMMDD(new Date());
    setDateFilter({ from: todayStr, to: todayStr });
    setActivePreset('today');
  };

  const setLastDaysFilter = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    setDateFilter({ from: toYYYYMMDD(from), to: toYYYYMMDD(to) });
    setActivePreset(days === 7 ? 'last7' : 'last30');
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setActivePreset(null);
  };

  const presetClass = (preset: DatePreset) =>
    activePreset === preset
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300';

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audio] = useState(() => {
    if (typeof window === 'undefined') return null as any;
    const a = new Audio('/sounds/new-order.mp3');
    a.preload = 'auto';
    return a;
  });

  // Intento de desbloquear contexto de audio sin sonar fuerte
  const unlockAudioContext = async () => {
    try {
      if (!audio) return;
      // We play and immediately pause just to let the browser know the user interacted
      audio.volume = 0; // mute temporarily
      await audio.play();
      audio.pause();
      audio.volume = 1; // restore volume
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Restaurar preferencia guardada
    const savedPref = localStorage.getItem('upick_admin_sound_enabled');
    if (savedPref === 'true') {
      setSoundEnabled(true);
    }

    const unlock = async () => {
      // Auto-unlock solo si no está explícitamente en "false" (apagado por el usuario)
      const currentPref = localStorage.getItem('upick_admin_sound_enabled');
      if (currentPref !== 'false') {
        const ok = await unlockAudioContext();
        if (ok) {
          setSoundEnabled(true);
          localStorage.setItem('upick_admin_sound_enabled', 'true');
        }
      }
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock as any);
      window.removeEventListener('keydown', unlock as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'restaurant_admin') {
        router.push('/');
        return;
      }
      fetchRestaurantId();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (restaurantId) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, dateFilter]);

  // Set up polling as fallback for real-time updates (every 10 seconds)
  useEffect(() => {
    if (!restaurantId) return;

    const pollInterval = setInterval(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const params = new URLSearchParams({
          status: 'paid,in_progress,ready,delivered',
        });

        if (dateFilter?.from) params.append('dateFrom', dateFilter.from);
        if (dateFilter?.to) params.append('dateTo', dateFilter.to);

        const response = await fetch(`/api/admin/orders?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success) {
          const fetchedOrders = data.data.orders || [];

          setOrders((prevOrders) => {
            const prevOrderIds = new Set(prevOrders.map((o) => o.id));

            const hasNewOrders = fetchedOrders.some(
              (o: Order) => !prevOrderIds.has(o.id)
            );

            const hasStatusChanges = prevOrders.some((prevOrder) => {
              const fetchedOrder = fetchedOrders.find(
                (o: Order) => o.id === prevOrder.id
              );
              return fetchedOrder && fetchedOrder.status !== prevOrder.status;
            });

            if (hasNewOrders || hasStatusChanges) {
              const newCount = fetchedOrders.filter(
                (o: Order) => o.status === 'paid'
              ).length;
              setNewOrdersCount(newCount);
              return fetchedOrders;
            }

            return prevOrders;
          });
        }
      } catch (error) {
        logger.error({ error }, '[AdminOrdersPage] Polling error');
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [restaurantId, dateFilter]);

  const fetchRestaurantId = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/restaurant-id', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setRestaurantId(data.data.restaurantId);
        setError(null);
        setErrorType(null);
      } else {
        logger.error({ error: data.error }, 'Failed to fetch restaurant ID');
        setLoading(false);
        setError(data.error || 'No se pudo obtener el restaurante');

        if (data.needsAssignment) setErrorType('assignment');
        else if (response.status === 401) setErrorType('auth');
        else setErrorType('connection');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch restaurant ID');
      setLoading(false);
      setError('Error de conexión. Por favor recarga la página.');
      setErrorType('connection');
    }
  };

  const fetchOrders = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams({
        status: 'paid,in_progress,ready,delivered',
      });

      if (dateFilter?.from) params.append('dateFrom', dateFilter.from);
      if (dateFilter?.to) params.append('dateTo', dateFilter.to);

      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const fetchedOrders = data.data.orders || [];

        // Registrar IDs iniciales para no sonar la notificación en la carga al abrir pestaña
        if (seenIdsRef.current) {
          fetchedOrders.forEach((o: Order) => seenIdsRef.current.add(o.id));
        }

        setOrders(fetchedOrders);

        const newCount = fetchedOrders.filter(
          (o: Order) => o.status === 'paid'
        ).length;
        setNewOrdersCount(newCount);
      } else {
        logger.error({ error: data.error, restaurantId }, 'Failed to fetch orders');
        if (response.status === 401) {
          alert('Error de autenticación. Por favor inicia sesión nuevamente.');
          router.push('/auth/login');
        }
      }
    } catch (error) {
      logger.error({ error, restaurantId }, 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Use realtime updates
  const realtimeOrders = useRealtimeOrders<Order>(restaurantId || '', orders);

  // Función para imprimir automáticamente en la app Android
  const printOrderToAndroid = (order: Order) => {
    // Verificar si estamos en la app Android
    if (typeof window !== 'undefined' && (window as any).AndroidPrinter) {
      try {
        const printData = {
          id: order.id,
          pickupCode: order.pickupCode,
          customerName:
            `${order.student?.firstName || ''} ${order.student?.lastName || ''}`.trim() ||
            order.student?.email ||
            'Cliente',
          type: order.type,
          serviceMode: order.type, // 'eat_in' o 'takeout'
          items: order.items.map((item) => ({
            name: item.product?.name || 'Producto',
            quantity: item.quantity,
            price: 0, // No mostramos precio en comanda
            toppings: [],
            options:
              item.options?.map(
                (opt) =>
                  `${opt.productOption?.group?.name || ''}: ${opt.productOption?.name || ''}`
              ) || [],
            notes: item.notes || null,
          })),
          total: (order.totalAmount || 0) / 100,
          paymentMethod: 'Pagado',
        };

        (window as any).AndroidPrinter.printOrder(JSON.stringify(printData));
        logger.info(
          { orderId: order.id, pickupCode: order.pickupCode },
          'Orden enviada a impresora Android'
        );
      } catch (error) {
        logger.error(
          { error, orderId: order.id },
          'Error al enviar orden a impresora Android'
        );
      }
    }
  };

  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!restaurantId) return;

    const seen = seenIdsRef.current;

    // 👉 SOLO pedidos nuevos Y en estado paid
    const newPaidOrders = realtimeOrders.filter(
      (o) => !seen.has(o.id) && o.status === 'paid'
    );

    if (newPaidOrders.length > 0) {
      setNewOrdersCount((prev) => prev + newPaidOrders.length);

      // 🔔 Notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        newPaidOrders.forEach((order) => {
          new Notification('Nuevo Pedido', {
            body: `Pedido #${order.pickupCode} - $${(
              (order.totalAmount || 0) / 100
            ).toLocaleString()}`,
            icon: '/favicon.ico',
          });
        });
      }

      // 🔊 Sonido
      if (soundEnabled) {
        // En este punto, no queremos mutarlo, queremos reproducirlo normal.
        if (audio) {
          audio.currentTime = 0;
          audio.volume = 1;
          audio.play().catch(() => { });
        }
      }

      // 🖨️ Auto-imprimir nuevos pedidos en la app Android
      newPaidOrders.forEach((order) => {
        printOrderToAndroid(order);
      });
    }

    // Marcar como vistos (para no repetir notificaciones)
    realtimeOrders.forEach((o) => seen.add(o.id));

    // Siempre sincronizamos el estado local
    setOrders(realtimeOrders);
  }, [realtimeOrders, restaurantId, soundEnabled]);



  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: newStatus, readyAt: data.data?.readyAt || o.readyAt }
              : o
          )
        );
        await fetchOrders();
      }
    } catch (error) {
      logger.error({ error, orderId, newStatus }, 'Failed to update order status');
    }
  };

  const handleMarkNoShow = async (orderId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/no-show`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        alert('Pedido marcado como "no se presentó" y removido de la vista');
      } else {
        alert(data.error || 'Error al marcar como no se presentó');
      }
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to mark order as no-show');
      alert('Error al marcar como no se presentó');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Panel de Pedidos" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user || userRole !== 'restaurant_admin') {
    return null;
  }

  if (error) {
    return (
      <>
        <Header title="Panel de Pedidos" />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <div className="card mx-auto max-w-2xl">
            <div className="text-center">
              {errorType === 'auth' && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    Error de Autenticación
                  </h2>
                  <p className="mb-6 text-gray-600">{error}</p>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="btn-primary"
                  >
                    Iniciar Sesión
                  </button>
                </>
              )}

              {errorType === 'assignment' && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    Restaurante No Asignado
                  </h2>
                  <p className="mb-4 text-gray-600">{error}</p>
                  <div className="mb-6 rounded-lg bg-blue-50 p-4 text-left text-sm text-blue-800">
                    <p className="mb-2 font-semibold">Para solucionar esto:</p>
                    <ol className="list-inside list-decimal space-y-1">
                      <li>Contacta al superadmin de la plataforma</li>
                      <li>
                        Pídele que te asigne un restaurante desde el panel de
                        superadmin
                      </li>
                      <li>Una vez asignado, recarga esta página</li>
                    </ol>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="btn-secondary"
                    >
                      Recargar Página
                    </button>
                    <button onClick={() => router.push('/')} className="btn-primary">
                      Ir al Inicio
                    </button>
                  </div>
                </>
              )}

              {errorType === 'connection' && (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <span className="text-3xl">❌</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    Error de Conexión
                  </h2>
                  <p className="mb-6 text-gray-600">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-primary"
                  >
                    Recargar Página
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Panel de Pedidos" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-24">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Panel de Pedidos (KDS)
              </h1>
              <p className="mt-2 text-gray-600">
                Gestiona los pedidos de tu restaurante
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {newOrdersCount > 0 && (
                <div className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-100 px-4 py-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-600">
                    {newOrdersCount} nuevo{newOrdersCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <button
                onClick={async () => {
                  if (soundEnabled) {
                    setSoundEnabled(false);
                    localStorage.setItem('upick_admin_sound_enabled', 'false');
                  } else {
                    const ok = await unlockAudioContext();
                    if (ok) {
                      setSoundEnabled(true);
                      localStorage.setItem('upick_admin_sound_enabled', 'true');
                    } else {
                      alert('Tu navegador bloqueó el sonido. Haz click en la página y vuelve a intentar.');
                    }
                  }
                }}
                className={`${soundEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'btn-secondary'} flex w-full items-center justify-center sm:w-auto px-4 py-2 rounded-md font-medium transition-colors`}
                title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
              >
                {soundEnabled ? '🔊 Sonido Activado' : '🔇 Activar sonido'}
              </button>

              <button
                onClick={() => setShowQRScanner(true)}
                className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
                title="Escanear QR de entrega"
              >
                <QrCode className="h-4 w-4" />
                Escanear QR
              </button>

              <button
                onClick={async () => {
                  setNewOrdersCount(0);
                  await fetchOrders();
                }}
                className="btn-secondary flex w-full items-center justify-center sm:w-auto"
                title="Refrescar"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="ml-2 sm:hidden">Refrescar</span>
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filtrar por fecha:</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={setTodayFilter}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${presetClass('today')}`}
              >
                Hoy
              </button>

              <button
                onClick={() => setLastDaysFilter(7)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${presetClass('last7')}`}
              >
                Últimos 7 días
              </button>

              <button
                onClick={() => setLastDaysFilter(30)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${presetClass('last30')}`}
              >
                Últimos 30 días
              </button>

              <button
                onClick={clearDateFilter}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${presetClass(null)}`}
              >
                Todos
              </button>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <label className="text-sm text-gray-600">Desde:</label>
              <input
                type="date"
                value={dateFilter?.from || ''}
                onChange={(e) =>
                  setDateFilter({
                    from: e.target.value,
                    to: dateFilter?.to || '',
                  })
                }
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-auto"
              />
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <label className="text-sm text-gray-600">Hasta:</label>
              <input
                type="date"
                value={dateFilter?.to || ''}
                onChange={(e) =>
                  setDateFilter({
                    from: dateFilter?.from || '',
                    to: e.target.value,
                  })
                }
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-auto"
              />
            </div>

            {dateFilter && (dateFilter.from || dateFilter.to) && (
              <button
                onClick={() => setDateFilter(null)}
                className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                title="Limpiar filtro"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statusColumns.map((column) => {
            const columnOrders = orders.filter((o) => o.status === column.status);

            return (
              <div key={column.status} className="flex flex-col">
                <div className={`rounded-t-lg ${column.color} p-4`}>
                  <h3 className="font-semibold">{column.title}</h3>
                  <p className="text-sm text-gray-600">
                    {columnOrders.length} pedido{columnOrders.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex-1 space-y-3 rounded-b-lg bg-gray-50 p-4">
                  {columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => { }}
                      onStatusChange={handleStatusChange}
                      onMarkNoShow={handleMarkNoShow}
                      showAdminActions={true}
                    />
                  ))}
                  {columnOrders.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400">Sin pedidos</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions Info */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">💡 Tip:</p>
          <p className="mt-1">
            Los pedidos se actualizan automáticamente en tiempo real. Las
            notificaciones del navegador te alertarán de nuevos pedidos.
          </p>
        </div>
      </main>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={() => {
          fetchOrders();
        }}
      />
    </>
  );
}
