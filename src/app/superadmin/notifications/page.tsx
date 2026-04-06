/**
 * Superadmin Notifications Page
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2, Bell, AlertCircle, CreditCard, Package, Calendar, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

type TabType = 'unread' | 'read' | 'all';

export default function NotificationsPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('unread');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (userRole !== 'superadmin') {
        router.push('/');
      } else {
        fetchNotifications();
      }
    }
  }, [user, userRole, authLoading, router, activeTab, dateFrom, dateTo, clientName]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
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

      // Build query parameters
      const params = new URLSearchParams();
      if (activeTab === 'unread') {
        params.append('isRead', 'false');
      } else if (activeTab === 'read') {
        params.append('isRead', 'true');
      }
      
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      if (clientName) {
        params.append('clientName', clientName);
      }

      const response = await fetch(`/api/superadmin/notifications?${params.toString()}`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
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

      const response = await fetch(`/api/superadmin/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh notifications to get updated list
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CANCELLATION':
        return <Package className="h-5 w-5 text-red-600" />;
      case 'REFUND_REQUEST':
        return <CreditCard className="h-5 w-5 text-orange-600" />;
      case 'CREDIT_ADJUSTMENT':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'CASE_OPENED':
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      case 'CREDIT_PAYMENT':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'ORDER_CANCELLED_CREDITS':
        return <Package className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Notificaciones" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Notificaciones" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notificaciones
              </h1>
              <p className="mt-2 text-gray-600">
                {unreadCount > 0
                  ? `${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`
                  : 'Todas las notificaciones han sido leídas'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('unread')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'unread'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              No Leídos
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'read'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Leídos
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Todas
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="input w-full pl-10"
                />
                {clientName && (
                  <button
                    onClick={() => setClientName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {(dateFrom || dateTo || clientName) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setClientName('');
              }}
              className="mt-4 text-sm text-primary-600 hover:text-primary-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">No hay notificaciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`card cursor-pointer transition-all ${!notification.isRead
                    ? 'border-l-4 border-l-primary-600 bg-primary-50/50'
                    : ''
                  }`}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                        {notification.metadata && (
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            {notification.metadata.customerName && (
                              <div>
                                <span className="font-medium">Cliente:</span>{' '}
                                {notification.metadata.customerName}
                              </div>
                            )}
                            {notification.metadata.contactInfo && (
                              <div>
                                <span className="font-medium">Contacto:</span>{' '}
                                {notification.metadata.contactInfo}
                              </div>
                            )}
                            {notification.metadata.paymentMethodDisplay && (
                              <div>
                                <span className="font-medium">
                                  Método de pago:
                                </span>{' '}
                                {notification.metadata.paymentMethodDisplay}
                              </div>
                            )}
                            {notification.metadata.refundAmount && (
                              <div>
                                <span className="font-medium">
                                  Monto a reembolsar:
                                </span>{' '}
                                $
                                {(
                                  notification.metadata.refundAmount / 100
                                ).toLocaleString()}
                              </div>
                            )}
                            {notification.metadata.caseNumber && (
                              <div>
                                <span className="font-medium">Número de Caso:</span>{' '}
                                {notification.metadata.caseNumber}
                              </div>
                            )}
                            {notification.metadata.pickupCode && (
                              <div>
                                <span className="font-medium">Código de Pedido:</span>{' '}
                                {notification.metadata.pickupCode}
                              </div>
                            )}
                            {notification.metadata.restaurantName && (
                              <div>
                                <span className="font-medium">Restaurante:</span>{' '}
                                {notification.metadata.restaurantName}
                              </div>
                            )}
                            {notification.metadata.orderId && (
                              <div className="pt-1 text-xs text-gray-400">
                                ID Pedido: {notification.metadata.orderId}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          {format(
                            new Date(notification.createdAt),
                            "d 'de' MMMM 'a las' h:mm a",
                            { locale: es }
                          )}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                        >
                          Marcar como leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
