/**
 * Admin - CRM Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Users,
  FileText,
  Download,
  Search,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

interface Customer {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  invoiceData: any;
  orders: any[];
  totalSpent: number;
  orderCount: number;
  lastOrderDate: Date | null;
}

export default function CRMPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exportingFormat, setExportingFormat] = useState<null | 'csv' | 'excel'>(null);

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
      fetchCRMData();
    }
  }, [user, userRole, authLoading, router, page, searchTerm]);

  const fetchCRMData = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/crm?${params}`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCustomers(data.data.customers);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExportingFormat(format);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const params = new URLSearchParams({
        format,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/crm/export?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al exportar datos');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar datos');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <>
      <Header title="CRM - Gestión de Clientes" showBack />
      {authLoading || loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : !user || userRole !== 'restaurant_admin' ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-600">No autorizado</div>
        </div>
      ) : (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-24">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">CRM - Gestión de Clientes</h1>
              <p className="mt-2 text-gray-600">
                {customers.length} cliente(s) encontrado(s)
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => handleExport('csv')}
                disabled={!!exportingFormat || customers.length === 0}
                className="btn-secondary w-full sm:w-auto flex items-center justify-center"
              >
                {exportingFormat === 'csv' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando CSV...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </>
                )}
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={!!exportingFormat || customers.length === 0}
                className="btn-secondary w-full sm:w-auto flex items-center justify-center"
              >
                {exportingFormat === 'excel' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando Excel...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
              <input
                type="text"
                placeholder="Buscar por email, nombre, documento..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Customers List */}
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.userId} className="card">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Customer Info */}
                  <div>
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {customer.firstName || customer.lastName
                            ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                            : 'Cliente'}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          {customer.phoneNumber && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {customer.phoneNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-full bg-primary-100 p-2">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>

                    {/* Invoice Data */}
                    {customer.invoiceData && (
                      <div className="mt-4 rounded-lg bg-blue-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            Datos de Facturación
                          </span>
                        </div>
                        <div className="grid gap-1 text-sm text-blue-800">
                          <div>
                            <span className="font-medium">Tipo:</span>{' '}
                            {customer.invoiceData.personType === 'natural'
                              ? 'Persona Natural'
                              : 'Persona Jurídica'}
                          </div>
                          <div>
                            <span className="font-medium">Documento:</span>{' '}
                            {customer.invoiceData.documentType} -{' '}
                            {customer.invoiceData.documentNumber}
                          </div>
                          <div>
                            <span className="font-medium">Razón Social:</span>{' '}
                            {customer.invoiceData.businessName}
                          </div>
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="break-words">
                              {customer.invoiceData.address},{' '}
                              {customer.invoiceData.city},{' '}
                              {customer.invoiceData.department}
                            </span>
                          </div>
                          {customer.invoiceData.regime && (
                            <div>
                              <span className="font-medium">Régimen:</span>{' '}
                              {customer.invoiceData.regime}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Stats */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-primary-600" />
                      <h4 className="text-lg font-semibold">Estadísticas</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <ShoppingBag className="h-4 w-4" />
                          <span>Pedidos</span>
                        </div>
                        <p className="mt-1 text-2xl font-bold">
                          {customer.orderCount}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span>Total Gastado</span>
                        </div>
                        <p className="mt-1 text-2xl font-bold text-green-600">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </div>
                      {customer.lastOrderDate && (
                        <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Último Pedido</span>
                          </div>
                          <p className="mt-1 font-semibold">
                            {new Date(
                              customer.lastOrderDate
                            ).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {customers.length === 0 && !loading && (
            <div className="py-12 text-center text-gray-500">
              {searchTerm
                ? 'No se encontraron clientes que coincidan con la búsqueda'
                : 'No hay clientes registrados aún'}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary w-full sm:w-auto"
              >
                Anterior
              </button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary w-full sm:w-auto"
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
      )}
    </>
  );
}
