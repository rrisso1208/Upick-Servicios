/**
 * Restaurant Admin - Coupons Management
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../../components/layout/Header';
import { Pagination } from '../../../components/ui/Pagination';
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Loader2,
  X,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Download,
} from 'lucide-react';
import { supabase } from '../../../providers/AuthProvider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  oneTimePerUser: boolean;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export default function CouponsManagementPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    oneTimePerUser: false,
    validFrom: '',
    validUntil: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/coupons', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCoupons(data.data.coupons);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };



  const [startImmediately, setStartImmediately] = useState(false);

  // Update validFrom when startImmediately changes
  useEffect(() => {
    if (startImmediately && showModal) {
      const now = new Date();
      // Adjust for local timezone offset to display correctly in datetime-local input
      const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);

      setFormData(prev => ({
        ...prev,
        validFrom: localISOTime
      }));
    }
  }, [startImmediately, showModal]);

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setStartImmediately(false);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        minOrderAmount: coupon.minOrderAmount
          ? (coupon.minOrderAmount / 100).toString()
          : '',
        maxUses: coupon.maxUses?.toString() || '',
        oneTimePerUser: coupon.oneTimePerUser || false,
        validFrom: new Date(coupon.validFrom).toISOString().slice(0, 16),
        validUntil: new Date(coupon.validUntil).toISOString().slice(0, 16),
      });
    } else {
      setEditingCoupon(null);
      setStartImmediately(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxUses: '',
        oneTimePerUser: false,
        validFrom: '',
        validUntil: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

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

      const payload = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue:
          formData.discountType === 'percentage'
            ? parseInt(formData.discountValue)
            : Math.round(parseFloat(formData.discountValue) * 100),
        minOrderAmount: formData.minOrderAmount
          ? Math.round(parseFloat(formData.minOrderAmount) * 100)
          : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        oneTimePerUser: formData.oneTimePerUser,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
      };

      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      const method = editingCoupon ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        handleCloseModal();
        fetchCoupons();
        alert(
          editingCoupon
            ? 'Cupón actualizado exitosamente'
            : 'Cupón creado exitosamente'
        );
      } else {
        alert(data.error || 'Error al guardar cupón');
      }
    } catch (error) {
      console.error('Error submitting coupon:', error);
      alert('Error al guardar cupón. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`¿Estás seguro de eliminar el cupón "${coupon.code}"?`)) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchCoupons();
        alert('Cupón eliminado exitosamente');
      } else {
        alert(data.error || 'Error al eliminar cupón');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Error al eliminar cupón');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
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

      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        fetchCoupons();
      }
    } catch (error) {
      console.error('Error toggling coupon:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Cupones
            </h1>
            <p className="mt-2 text-gray-600">
              Crea y gestiona cupones de descuento para tus clientes
            </p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Cupón
          </button>
        </div>

        {/* Statistics Cards */}
        {coupons.length > 0 && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cupones</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {coupons.length}
                  </p>
                </div>
                <Tag className="h-8 w-8 text-primary-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cupones Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      coupons.filter(
                        (c) =>
                          c.isActive &&
                          new Date(c.validUntil) >= new Date() &&
                          new Date(c.validFrom) <= new Date()
                      ).length
                    }
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Usados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Descuento Total</p>
                  <p className="text-lg font-bold text-purple-600">
                    {coupons
                      .filter((c) => c.usedCount > 0)
                      .reduce((sum, c) => {
                        // Estimate average discount (simplified)
                        const avgOrder = 50000; // 50,000 COP average
                        if (c.discountType === 'percentage') {
                          return (
                            sum +
                            (avgOrder * c.discountValue * c.usedCount) / 100
                          );
                        }
                        return sum + c.discountValue * c.usedCount;
                      }, 0)
                      .toLocaleString('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {coupons.length === 0 ? (
          <div className="card py-12 text-center">
            <Tag className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-600">No hay cupones creados</p>
            <p className="mt-2 text-sm text-gray-500">
              Crea tu primer cupón para empezar a ofrecer descuentos
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando{' '}
                {Math.min((currentPage - 1) * itemsPerPage + 1, coupons.length)}{' '}
                - {Math.min(currentPage * itemsPerPage, coupons.length)} de{' '}
                {coupons.length} cupones
              </p>
              <button
                onClick={() => {
                  const csvContent = [
                    [
                      'Código',
                      'Tipo',
                      'Valor',
                      'Pedido Mínimo',
                      'Máx Usos',
                      'Usados',
                      'Válido Desde',
                      'Válido Hasta',
                      'Estado',
                    ].join(','),
                    ...coupons.map((c) =>
                      [
                        c.code,
                        c.discountType,
                        c.discountValue,
                        c.minOrderAmount ? c.minOrderAmount / 100 : 'N/A',
                        c.maxUses || 'Ilimitado',
                        c.usedCount,
                        format(new Date(c.validFrom), 'dd/MM/yyyy', {
                          locale: es,
                        }),
                        format(new Date(c.validUntil), 'dd/MM/yyyy', {
                          locale: es,
                        }),
                        c.isActive ? 'Activo' : 'Inactivo',
                      ].join(',')
                    ),
                  ].join('\n');

                  const blob = new Blob([csvContent], {
                    type: 'text/csv;charset=utf-8;',
                  });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `cupones-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                }}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coupons
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage
                )
                .map((coupon) => {
                  const now = new Date();
                  const validFrom = new Date(coupon.validFrom);
                  const validUntil = new Date(coupon.validUntil);
                  const isExpired = now > validUntil;
                  const isNotStarted = now < validFrom;

                  return (
                    <div
                      key={coupon.id}
                      className={`card ${!coupon.isActive || isExpired
                        ? 'border-orange-200 opacity-60'
                        : ''
                        }`}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary-600" />
                            <h3 className="text-xl font-bold">{coupon.code}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {coupon.discountType === 'percentage' ? (
                                <span>{coupon.discountValue}% OFF</span>
                              ) : (
                                <span>
                                  $
                                  {(coupon.discountValue / 100).toLocaleString(
                                    'es-CO'
                                  )}{' '}
                                  OFF
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>
                                {coupon.usedCount}
                                {coupon.maxUses
                                  ? `/${coupon.maxUses}`
                                  : ''}{' '}
                                usos
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className={`rounded px-3 py-1 text-xs font-semibold ${coupon.isActive && !isExpired && !isNotStarted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {coupon.isActive && !isExpired && !isNotStarted
                            ? 'Activo'
                            : isExpired
                              ? 'Expirado'
                              : isNotStarted
                                ? 'Pendiente'
                                : 'Inactivo'}
                        </button>
                      </div>

                      <div className="mb-4 space-y-2 text-sm text-gray-600">
                        {coupon.minOrderAmount && (
                          <div className="flex items-center gap-2">
                            <span>Pedido mínimo:</span>
                            <span className="font-semibold">
                              $
                              {(coupon.minOrderAmount / 100).toLocaleString(
                                'es-CO'
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(validFrom, 'dd/MM/yyyy', { locale: es })} -{' '}
                            {format(validUntil, 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(coupon)}
                          className="btn-secondary flex-1 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            {Math.ceil(coupons.length / itemsPerPage) > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(coupons.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  totalItems={coupons.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </>
        )}

        {/* Coupon Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold">
                  {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <form
                  onSubmit={handleSubmit}
                  id="coupon-form"
                  className="space-y-3"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Código del Cupón *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className="input w-full"
                      placeholder="EJEMPLO123"
                      disabled={!!editingCoupon}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Tipo de Descuento *
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountType: e.target.value as
                              | 'percentage'
                              | 'fixed',
                          })
                        }
                        className="input w-full"
                      >
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo (COP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Valor del Descuento *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={
                          formData.discountType === 'percentage'
                            ? '100'
                            : undefined
                        }
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountValue: e.target.value,
                          })
                        }
                        className="input w-full"
                        placeholder={
                          formData.discountType === 'percentage' ? '10' : '5000'
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formData.discountType === 'percentage'
                      ? 'Porcentaje de descuento (1-100)'
                      : 'Monto en pesos colombianos'}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Pedido Mínimo
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.minOrderAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minOrderAmount: e.target.value,
                          })
                        }
                        className="input w-full"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Máx. Usos
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxUses}
                        onChange={(e) =>
                          setFormData({ ...formData, maxUses: e.target.value })
                        }
                        className="input w-full"
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Deja vacío para uso ilimitado
                  </p>

                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <input
                      type="checkbox"
                      id="oneTimePerUser"
                      checked={formData.oneTimePerUser}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          oneTimePerUser: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="oneTimePerUser"
                      className="text-sm font-medium text-gray-700"
                    >
                      Solo se puede usar una vez por usuario
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Si está activado, cada usuario solo podrá usar este cupón
                    una vez, independientemente del máximo de usos totales
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="startImmediately"
                          checked={startImmediately}
                          onChange={(e) => setStartImmediately(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label
                          htmlFor="startImmediately"
                          className="text-sm font-medium text-gray-700"
                        >
                          Iniciar inmediatamente
                        </label>
                      </div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Válido Desde *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.validFrom}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            validFrom: e.target.value,
                          })
                        }
                        className="input w-full"
                        disabled={startImmediately}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Válido Hasta *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.validUntil}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            validUntil: e.target.value,
                          })
                        }
                        className="input w-full"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer with buttons - Fixed */}
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="coupon-form"
                    className="btn-primary flex-1"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
