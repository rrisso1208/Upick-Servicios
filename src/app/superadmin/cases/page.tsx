/**
 * Superadmin Cases Page - Manage all cases
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Filter,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../../lib/utils';
import { CaseChat } from '../../../components/cases/CaseChat';
import toast from 'react-hot-toast';

interface Case {
  id: string;
  caseNumber: string;
  type: string;
  status: string;
  forceClosed?: boolean | null;
  title: string;
  description: string | null;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  };
  order: {
    id: string;
    pickupCode: string;
    totalAmount: number;
    createdAt: string;
    cancellation: {
      refundAmount: number;
      refundType: string;
      reason: string | null;
    } | null;
  };
  restaurant: {
    id: string;
    name: string;
    location: string | null;
  };
}

export default function SuperadminCasesPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);

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
      fetchCases();
    }
  }, [user, userRole, authLoading, router, statusFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/superadmin/cases?${params}`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCases(data.data.cases);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCaseStatus = async (caseId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/superadmin/cases/${caseId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          resolution: resolution || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchCases();
        if (selectedCase?.id === caseId) {
          setSelectedCase({ ...selectedCase, status: newStatus });
        }
        setResolution('');
        toast.success('Estado del caso actualizado');
      } else {
        toast.error(data.error || 'Error al actualizar caso');
      }
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('Error al actualizar caso');
    } finally {
      setUpdating(false);
    }
  };

  const closeCase = async (caseId: string) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/cases/${caseId}/close`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          resolution: resolution || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchCases();
        if (selectedCase?.id === caseId) {
          setSelectedCase({ ...selectedCase, status: 'RESOLVED' });
        }
        setResolution('');
        toast.success(
          'Caso marcado como resuelto. El usuario recibirá una encuesta.'
        );
      } else {
        toast.error(data.error || 'Error al cerrar caso');
      }
    } catch (error) {
      console.error('Error closing case:', error);
      toast.error('Error al cerrar caso');
    } finally {
      setUpdating(false);
    }
  };

  const forceCloseCase = async (caseId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que deseas forzar el cierre de este caso? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/cases/${caseId}/force-close`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        await fetchCases();
        if (selectedCase?.id === caseId) {
          setSelectedCase({
            ...selectedCase,
            status: 'CLOSED',
            forceClosed: true,
          });
        }
        toast.success('Caso cerrado forzosamente');
      } else {
        toast.error(data.error || 'Error al forzar cierre del caso');
      }
    } catch (error) {
      console.error('Error force closing case:', error);
      toast.error('Error al forzar cierre del caso');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            <Clock className="h-3 w-3" />
            Abierto
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            <AlertCircle className="h-3 w-3" />
            En Proceso
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Resuelto
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
            <X className="h-3 w-3" />
            Cerrado
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Casos" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Casos" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Casos</h1>
              <p className="mt-2 text-gray-600">
                Gestiona todas las solicitudes de reembolso
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="OPEN">Abiertos</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="RESOLVED">Resueltos</option>
                <option value="CLOSED">Cerrados</option>
              </select>
            </div>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">No hay casos</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className={`card cursor-pointer transition-all ${
                    selectedCase?.id === caseItem.id
                      ? 'border-2 border-primary-500 bg-primary-50'
                      : ''
                  }`}
                  onClick={() => setSelectedCase(caseItem)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {caseItem.title}
                        </h3>
                        {getStatusBadge(caseItem.status)}
                      </div>
                      <p className="mt-1 font-mono text-sm text-gray-500">
                        {caseItem.caseNumber}
                      </p>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Usuario:</span>{' '}
                          {caseItem.user.firstName && caseItem.user.lastName
                            ? `${caseItem.user.firstName} ${caseItem.user.lastName}`
                            : caseItem.user.email}
                        </div>
                        <div>
                          <span className="font-medium">Pedido:</span>{' '}
                          {caseItem.order.pickupCode}
                        </div>
                        <div>
                          <span className="font-medium">Restaurante:</span>{' '}
                          {caseItem.restaurant.name}
                        </div>
                        <div>
                          <span className="font-medium">Monto:</span>{' '}
                          {formatCurrency(
                            caseItem.order.cancellation?.refundAmount ||
                              caseItem.order.totalAmount
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedCase && (
              <div className="space-y-4">
                <div className="card">
                  <h2 className="mb-4 text-xl font-bold">Detalles del Caso</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Número de Caso
                      </p>
                      <p className="mt-1 font-mono text-lg">
                        {selectedCase.caseNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Estado
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(selectedCase.status)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Usuario
                      </p>
                      <p className="mt-1">
                        {selectedCase.user.firstName &&
                        selectedCase.user.lastName
                          ? `${selectedCase.user.firstName} ${selectedCase.user.lastName}`
                          : selectedCase.user.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedCase.user.email}
                      </p>
                      {selectedCase.user.phoneNumber && (
                        <p className="text-sm text-gray-600">
                          {selectedCase.user.phoneNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Pedido
                      </p>
                      <p className="mt-1 font-mono">
                        {selectedCase.order.pickupCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Restaurante
                      </p>
                      <p className="mt-1">{selectedCase.restaurant.name}</p>
                      {selectedCase.restaurant.location && (
                        <p className="text-sm text-gray-600">
                          {selectedCase.restaurant.location}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Monto</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatCurrency(
                          selectedCase.order.cancellation?.refundAmount ||
                            selectedCase.order.totalAmount
                        )}
                      </p>
                    </div>
                    {selectedCase.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Descripción
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {selectedCase.description}
                        </p>
                      </div>
                    )}
                    {selectedCase.order.cancellation?.reason && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Motivo
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {selectedCase.order.cancellation.reason}
                        </p>
                      </div>
                    )}
                    {selectedCase.resolution && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Resolución
                        </p>
                        <p className="mt-1 rounded-md bg-green-50 p-3 text-sm text-green-800">
                          {selectedCase.resolution}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Fecha de creación
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {format(
                          new Date(selectedCase.createdAt),
                          'd MMMM yyyy, h:mm a',
                          {
                            locale: es,
                          }
                        )}
                      </p>
                    </div>
                    {selectedCase.resolvedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Fecha de resolución
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {format(
                            new Date(selectedCase.resolvedAt),
                            'd MMMM yyyy, h:mm a',
                            { locale: es }
                          )}
                        </p>
                      </div>
                    )}

                    {selectedCase.status !== 'CLOSED' && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Resolución (opcional)
                          </label>
                          <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Escribe la resolución del caso..."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedCase.status === 'OPEN' && (
                            <button
                              onClick={() =>
                                updateCaseStatus(selectedCase.id, 'IN_PROGRESS')
                              }
                              disabled={updating}
                              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                              {updating
                                ? 'Actualizando...'
                                : 'Marcar en Proceso'}
                            </button>
                          )}
                          {selectedCase.status !== 'RESOLVED' && (
                            <button
                              onClick={() => closeCase(selectedCase.id)}
                              disabled={updating}
                              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            >
                              {updating ? 'Cerrando...' : 'Cerrar Caso'}
                            </button>
                          )}
                          <button
                            onClick={() => forceCloseCase(selectedCase.id)}
                            disabled={updating}
                            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                          >
                            <Lock className="h-4 w-4" />
                            {updating ? 'Cerrando...' : 'Forzar Cierre'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Al cerrar el caso, el usuario recibirá una encuesta
                          para confirmar si su problema fue resuelto.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Section */}
                <div className="card">
                  <h2 className="mb-4 text-xl font-bold">Chat en Vivo</h2>
                  <CaseChat
                    caseId={selectedCase.id}
                    currentUserId={user?.id || ''}
                    currentUserRole="superadmin"
                    caseStatus={selectedCase.status}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
