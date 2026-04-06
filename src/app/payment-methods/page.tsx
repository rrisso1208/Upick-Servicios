/**
 * Payment Methods Management Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '../../providers/AuthProvider';
import {
  CreditCard,
  Loader2,
  Trash2,
  Star,
  StarOff,
  Plus,
  Wallet,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SavedPaymentMethod {
  id: string;
  method: 'CARD' | 'PSE';
  wompiPaymentSourceId: string | null;
  last4Digits: string | null;
  brand: string | null;
  bankName: string | null;
  isDefault: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export default function PaymentMethodsPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (userRole === 'student') {
        fetchMethods();
      }
    }
  }, [user, userRole, authLoading, router]);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/student/payment-methods', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setMethods(data.data.methods);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (
      !confirm(
        '¿Estás seguro de eliminar este método de pago? No podrás usarlo en futuros pedidos.'
      )
    ) {
      return;
    }

    try {
      setDeletingId(methodId);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/student/payment-methods?id=${methodId}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchMethods();
      } else {
        alert(data.error || 'Error al eliminar método de pago');
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      alert('Error al eliminar método de pago');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/student/payment-methods', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: methodId,
          isDefault: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchMethods();
      } else {
        alert(data.error || 'Error al establecer método predeterminado');
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      alert('Error al establecer método predeterminado');
    }
  };

  const getMethodDisplay = (method: SavedPaymentMethod) => {
    if (method.method === 'CARD') {
      return {
        icon: <CreditCard className="h-6 w-6" />,
        title: method.brand
          ? `Tarjeta ${method.brand}`
          : 'Tarjeta de Crédito/Débito',
        subtitle: method.last4Digits ? `•••• ${method.last4Digits}` : 'Tarjeta',
        canUse: !!method.wompiPaymentSourceId, // Can only use if has payment_source_id
        description: method.wompiPaymentSourceId
          ? 'Puedes usar este método para pagos rápidos'
          : 'Información guardada para referencia (deberás ingresar datos nuevamente)',
      };
    } else {
      // PSE, Nequi, Daviplata
      const bankDisplay = method.bankName || 'Débito bancario';
      return {
        icon: <Building2 className="h-6 w-6" />,
        title: bankDisplay.includes('Nequi')
          ? 'Nequi'
          : bankDisplay.includes('Daviplata')
            ? 'Daviplata'
            : 'PSE',
        subtitle: bankDisplay,
        canUse: !!method.wompiPaymentSourceId,
        description: method.wompiPaymentSourceId
          ? 'Puedes usar este método para pagos rápidos'
          : 'Información guardada para referencia (deberás seleccionar el banco nuevamente)',
      };
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Métodos de Pago" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Métodos de Pago" />
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Métodos de Pago Guardados
            </h1>
            <p className="mt-2 text-gray-600">
              Gestiona tus métodos de pago para agilizar tus compras
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="card mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Métodos de pago guardados
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Tus métodos de pago se guardan automáticamente después de cada
                pago exitoso. Puedes usarlos para pagar más rápido sin ingresar
                tus datos cada vez.
              </p>
            </div>
          </div>
        </div>

        {/* Methods List */}
        {methods.length === 0 ? (
          <div className="card py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">
              No tienes métodos de pago guardados
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Tus métodos de pago se guardarán automáticamente después de tu
              primer pago exitoso
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((method) => {
              const display = getMethodDisplay(method);
              return (
                <div
                  key={method.id}
                  className={`card ${
                    method.isDefault ? 'border-2 border-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 items-start gap-4">
                      <div
                        className={`rounded-lg p-3 ${
                          method.isDefault
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {display.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {display.title}
                          </h3>
                          {method.isDefault && (
                            <span className="badge badge-success text-xs">
                              Predeterminado
                            </span>
                          )}
                          {!display.canUse && (
                            <span className="badge badge-error text-xs">
                              Requiere datos
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {display.subtitle}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Último uso:{' '}
                          {format(
                            new Date(method.lastUsedAt),
                            "d 'de' MMMM 'a las' h:mm a",
                            { locale: es }
                          )}
                        </p>
                        {display.description && (
                          <p
                            className={`mt-1 text-xs ${
                              display.canUse
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {display.canUse
                              ? '✓ Puedes usar este método para pagos rápidos'
                              : `ℹ ${display.description}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="btn-secondary p-2"
                          title="Establecer como predeterminado"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(method.id)}
                        disabled={deletingId === method.id}
                        className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                        title="Eliminar método de pago"
                      >
                        {deletingId === method.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
