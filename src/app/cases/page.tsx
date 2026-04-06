/**
 * User Cases Page - Shows all cases for the authenticated user
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { useAuth, supabase } from '../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, AlertCircle, CheckCircle, Clock, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../lib/utils';
import { CaseChat } from '../../components/cases/CaseChat';
import toast from 'react-hot-toast';

interface Case {
  id: string;
  caseNumber: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  forceClosed?: boolean;
  order: {
    id: string;
    pickupCode: string;
    totalAmount: number;
    createdAt: string;
    restaurant: {
      id: string;
      name: string;
    };
  };
  restaurant: {
    id: string;
    name: string;
  };
}

export default function CasesPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showSurvey, setShowSurvey] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'student') {
        router.push('/');
        return;
      }
      fetchCases();
    }
  }, [user, userRole, authLoading, router]);

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

      const response = await fetch('/api/cases', {
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

  const confirmResolution = async (caseId: string, resolved: boolean) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/cases/${caseId}/confirm-resolution`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ resolved }),
      });

      const data = await response.json();
      if (data.success) {
        setShowSurvey(null);
        await fetchCases();
        if (selectedCase?.id === caseId) {
          setSelectedCase({ ...selectedCase, status: resolved ? 'CLOSED' : 'IN_PROGRESS' });
        }
        toast.success(
          resolved
            ? 'Gracias por confirmar. El caso ha sido cerrado.'
            : 'El caso ha sido reabierto. Continuaremos trabajando en tu solicitud.'
        );
      } else {
        toast.error(data.error || 'Error al confirmar resolución');
      }
    } catch (error) {
      console.error('Error confirming resolution:', error);
      toast.error('Error al confirmar resolución');
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
        <Header title="Mis Casos" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Mis Casos" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Casos</h1>
          <p className="mt-2 text-gray-600">
            Aquí puedes ver el estado de tus solicitudes de reembolso
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">No tienes casos abiertos</p>
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
                      <p className="mt-2 font-mono text-sm text-gray-500">
                        {caseItem.caseNumber}
                      </p>
                      {caseItem.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {caseItem.description}
                        </p>
                      )}
                      <div className="mt-4 space-y-2 text-sm text-gray-600">
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
                          {formatCurrency(caseItem.order.totalAmount)}
                        </div>
                        <div>
                          <span className="font-medium">Fecha de creación:</span>{' '}
                          {format(new Date(caseItem.createdAt), 'd MMMM yyyy, h:mm a', {
                            locale: es,
                          })}
                        </div>
                        {caseItem.resolvedAt && (
                          <div>
                            <span className="font-medium">Fecha de resolución:</span>{' '}
                            {format(new Date(caseItem.resolvedAt), 'd MMMM yyyy, h:mm a', {
                              locale: es,
                            })}
                          </div>
                        )}
                        {caseItem.resolution && (
                          <div className="mt-2 rounded-md bg-green-50 p-3">
                            <p className="text-sm font-medium text-green-800">
                              Resolución:
                            </p>
                            <p className="mt-1 text-sm text-green-700">
                              {caseItem.resolution}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <MessageSquare className="h-5 w-5 text-gray-400" />
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
                      <p className="mt-1 font-mono text-lg">{selectedCase.caseNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Estado</p>
                      <div className="mt-1">{getStatusBadge(selectedCase.status)}</div>
                    </div>
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
                    {selectedCase.status === 'RESOLVED' && !selectedCase.forceClosed && !showSurvey && (
                      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                        <p className="font-semibold text-green-900">
                          ¿Tu caso fue resuelto?
                        </p>
                        <p className="mt-2 text-sm text-green-700">
                          Por favor confirma si tu problema fue resuelto para cerrar el caso.
                        </p>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => confirmResolution(selectedCase.id, true)}
                            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                          >
                            Sí, fue resuelto
                          </button>
                          <button
                            onClick={() => confirmResolution(selectedCase.id, false)}
                            className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                          >
                            No, aún no
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedCase.forceClosed && (
                      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                        <p className="font-semibold text-red-900">
                          Caso cerrado forzosamente
                        </p>
                        <p className="mt-2 text-sm text-red-700">
                          Este caso fue cerrado por el administrador. No se pueden enviar más mensajes.
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
                    currentUserRole="student"
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

