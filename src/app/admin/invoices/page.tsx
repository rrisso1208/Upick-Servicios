/**
 * Admin - Facturación Electrónica
 * Muestra todos los pedidos que requieren factura electrónica
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  FileText,
  Search,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Copy,
  CheckCircle,
  Building2,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvoiceOrder {
  id: string;
  pickupCode: string;
  totalAmount: number;
  serviceFeeAmount?: number | null;   // 👈 NUEVO
  deliveryFeeAmount?: number | null;  // 👈 opcional
  createdAt: Date | string;
  student: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  invoiceData: {
    id: string;
    personType: 'natural' | 'juridica';
    documentType: string;
    documentNumber: string;
    businessName: string;
    address: string;
    city: string;
    department: string;
    phone: string | null;
    email: string;
    regime: string | null;
  };
}

const getNetTotal = (order: InvoiceOrder) => {
  const total = Number(order.totalAmount ?? 0);
  const fee = Number(order.serviceFeeAmount ?? 0);

  // Si también quieres quitar delivery del total mostrado, descomenta:
  // const delivery = Number(order.deliveryFeeAmount ?? 0);
  // return Math.max(0, total - fee - delivery);

  return Math.max(0, total - fee);
};

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const { user, userRole, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<InvoiceOrder | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      fetchInvoiceOrders();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (orderIdParam && orders.length > 0) {
      const order = orders.find((o) => o.id === orderIdParam);
      if (order) {
        setSelectedOrder(order);
      }
    }
  }, [orderIdParam, orders]);

  // Set search term when orderId is provided (only once)
  useEffect(() => {
    if (orderIdParam && orders.length > 0 && !searchTerm) {
      const order = orders.find((o) => o.id === orderIdParam);
      if (order) {
        // Use email or document number for better filtering
        const searchValue = order.invoiceData?.email || order.student.email || order.pickupCode;
        if (searchValue) {
          setSearchTerm(searchValue);
        }
      }
    }
  }, [orderIdParam]); // Only depend on orderIdParam to avoid loops

  const fetchInvoiceOrders = async () => {
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
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/invoices?${params}`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch invoice orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.student.email.toLowerCase().includes(term) ||
      order.student.firstName?.toLowerCase().includes(term) ||
      order.student.lastName?.toLowerCase().includes(term) ||
      order.invoiceData.businessName.toLowerCase().includes(term) ||
      order.invoiceData.documentNumber.includes(term) ||
      order.invoiceData.email.toLowerCase().includes(term) ||
      order.pickupCode.toLowerCase().includes(term)
    );
  });

  if (authLoading || loading) {
    return (
      <>
        <Header title="Facturación Electrónica" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user || userRole !== 'restaurant_admin') {
    return null;
  }

  return (
    <>
      <Header title="Facturación Electrónica" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Facturación Electrónica</h1>
          <p className="mt-2 text-gray-600">
            Datos de facturación de clientes que solicitaron factura electrónica
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Orders List */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, documento, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-600">
                    {searchTerm
                      ? 'No se encontraron pedidos con facturación'
                      : 'No hay pedidos con facturación electrónica'}
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`card cursor-pointer transition-all hover:shadow-md ${
                      selectedOrder?.id === order.id
                        ? 'border-2 border-primary-500 bg-primary-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary-600">
                            {order.pickupCode}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(order.createdAt), 'dd/MM/yyyy', {
                              locale: es,
                            })}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="font-medium">
                            {order.invoiceData.businessName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.student.firstName} {order.student.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.invoiceData.documentType} -{' '}
                            {order.invoiceData.documentNumber}
                          </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-primary-600">
                          {formatCurrency(getNetTotal(order))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Invoice Details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="card sticky top-4">
                <div className="mb-4 flex items-center justify-between border-b pb-4">
                  <h2 className="text-xl font-semibold">Datos de Facturación</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Order Info */}
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-700">
                      Pedido: {selectedOrder.pickupCode}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(getNetTotal(selectedOrder))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(selectedOrder.createdAt), 'PPpp', {
                        locale: es,
                      })}
                    </p>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Cliente
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>
                          {selectedOrder.student.firstName}{' '}
                          {selectedOrder.student.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{selectedOrder.student.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Data */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Datos de Facturación
                    </h3>
                    <div className="space-y-3">
                      {/* Person Type */}
                      <div>
                        <label className="text-xs text-gray-500">
                          Tipo de Persona
                        </label>
                        <p className="text-sm font-medium">
                          {selectedOrder.invoiceData.personType === 'natural'
                            ? 'Persona Natural'
                            : 'Persona Jurídica'}
                        </p>
                      </div>

                      {/* Document */}
                      <div>
                        <label className="text-xs text-gray-500">
                          Documento
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {selectedOrder.invoiceData.documentType} -{' '}
                            {selectedOrder.invoiceData.documentNumber}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                selectedOrder.invoiceData.documentNumber,
                                'document'
                              )
                            }
                            className="text-primary-600 hover:text-primary-700"
                            title="Copiar documento"
                          >
                            {copiedField === 'document' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Business Name */}
                      <div>
                        <label className="text-xs text-gray-500">
                          {selectedOrder.invoiceData.personType === 'natural'
                            ? 'Nombre Completo'
                            : 'Razón Social'}
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {selectedOrder.invoiceData.businessName}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                selectedOrder.invoiceData.businessName,
                                'businessName'
                              )
                            }
                            className="text-primary-600 hover:text-primary-700"
                            title="Copiar nombre"
                          >
                            {copiedField === 'businessName' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="text-xs text-gray-500">Dirección</label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {selectedOrder.invoiceData.address}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                selectedOrder.invoiceData.address,
                                'address'
                              )
                            }
                            className="text-primary-600 hover:text-primary-700"
                            title="Copiar dirección"
                          >
                            {copiedField === 'address' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* City and Department */}
                      <div>
                        <label className="text-xs text-gray-500">
                          Ciudad y Departamento
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {selectedOrder.invoiceData.city},{' '}
                            {selectedOrder.invoiceData.department}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                `${selectedOrder.invoiceData.city}, ${selectedOrder.invoiceData.department}`,
                                'city'
                              )
                            }
                            className="text-primary-600 hover:text-primary-700"
                            title="Copiar ciudad"
                          >
                            {copiedField === 'city' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Phone */}
                      {selectedOrder.invoiceData.phone && (
                        <div>
                          <label className="text-xs text-gray-500">Teléfono</label>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {selectedOrder.invoiceData.phone}
                            </p>
                            <button
                              onClick={() =>
                                handleCopy(
                                  selectedOrder.invoiceData.phone!,
                                  'phone'
                                )
                              }
                              className="text-primary-600 hover:text-primary-700"
                              title="Copiar teléfono"
                            >
                              {copiedField === 'phone' ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {selectedOrder.invoiceData.email}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(
                                selectedOrder.invoiceData.email,
                                'email'
                              )
                            }
                            className="text-primary-600 hover:text-primary-700"
                            title="Copiar email"
                          >
                            {copiedField === 'email' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Regime (for juridica) */}
                      {selectedOrder.invoiceData.personType === 'juridica' &&
                        selectedOrder.invoiceData.regime && (
                          <div>
                            <label className="text-xs text-gray-500">
                              Régimen Tributario
                            </label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {selectedOrder.invoiceData.regime}
                              </p>
                              <button
                                onClick={() =>
                                  handleCopy(
                                    selectedOrder.invoiceData.regime!,
                                    'regime'
                                  )
                                }
                                className="text-primary-600 hover:text-primary-700"
                                title="Copiar régimen"
                              >
                                {copiedField === 'regime' ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Copy All Button */}
                  <button
                    onClick={() => {
                      const allData = `Pedido: ${selectedOrder.pickupCode}
Cliente: ${selectedOrder.student.firstName} ${selectedOrder.student.lastName}
Email Cliente: ${selectedOrder.student.email}
Tipo: ${selectedOrder.invoiceData.personType === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}
Documento: ${selectedOrder.invoiceData.documentType} - ${selectedOrder.invoiceData.documentNumber}
${selectedOrder.invoiceData.personType === 'natural' ? 'Nombre' : 'Razón Social'}: ${selectedOrder.invoiceData.businessName}
Dirección: ${selectedOrder.invoiceData.address}
Ciudad: ${selectedOrder.invoiceData.city}, ${selectedOrder.invoiceData.department}
${selectedOrder.invoiceData.phone ? `Teléfono: ${selectedOrder.invoiceData.phone}` : ''}
Email Facturación: ${selectedOrder.invoiceData.email}
${selectedOrder.invoiceData.regime ? `Régimen: ${selectedOrder.invoiceData.regime}` : ''}
Total: ${formatCurrency(getNetTotal(selectedOrder))}`;
                      handleCopy(allData, 'all');
                    }}
                    className="btn-primary w-full"
                  >
                    {copiedField === 'all' ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Todos los Datos
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-600">
                  Selecciona un pedido para ver los datos de facturación
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Facturación Electrónica" />
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}

