/**
 * User Credits Page - View credit balance and transactions
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '../../providers/AuthProvider';
import {
  Wallet,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  order: {
    id: string;
    pickupCode: string;
    restaurantName: string;
  } | null;
}

export default function CreditsPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (userRole === 'student') {
        fetchCredits();
      }
    }
  }, [user, userRole, authLoading, router]);

  const fetchCredits = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/student/credits', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setBalance(data.data.balance);
        setTransactions(data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'REFUND_TO_CREDITS':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case 'CREDIT_USED':
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />;
      case 'MANUAL_ADJUSTMENT':
        return <RefreshCw className="h-5 w-5 text-blue-600" />;
      default:
        return <Wallet className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'REFUND_TO_CREDITS':
        return 'Créditos agregados';
      case 'CREDIT_USED':
        return 'Créditos usados';
      case 'MANUAL_ADJUSTMENT':
        return 'Ajuste manual';
      default:
        return 'Transacción';
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Mis Créditos" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Mis Créditos" />
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Créditos</h1>
            <p className="mt-2 text-gray-600">
              Gestiona tus créditos y revisa tu historial
            </p>
          </div>
          <button
            onClick={() => fetchCredits(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refrescando...' : 'Refrescar'}
          </button>
        </div>

        {/* Balance Card */}
        <div className="card mb-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Saldo disponible</p>
              <p className="mt-2 text-4xl font-bold">
                {formatCurrency(balance)}
              </p>
              <p className="mt-2 text-sm opacity-75">
                {transactions.length} transacción(es) en total
              </p>
            </div>
            <div className="rounded-full bg-white/20 p-4">
              <Wallet className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Historial de Transacciones</h2>
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">No tienes transacciones aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div>{getTransactionIcon(transaction.type)}</div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getTransactionLabel(transaction.type)}
                      </p>
                      {transaction.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {transaction.description}
                        </p>
                      )}
                      {transaction.order && (
                        <p className="mt-1 text-xs text-gray-500">
                          Pedido #{transaction.order.pickupCode} -{' '}
                          {transaction.order.restaurantName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {format(
                          new Date(transaction.createdAt),
                          "d 'de' MMMM 'a las' h:mm a",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        transaction.amount > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
