/**
 * Superadmin - Master Products Management
 * Gestión de productos maestros de una Central
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '../../../../../components/layout/Header';
import { useAuth } from '../../../../../providers/AuthProvider';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Power,
  PowerOff,
  ArrowLeft,
  DollarSign,
} from 'lucide-react';

interface MasterProduct {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  basePrice: number;
  isGloballyAvailable: boolean;
  createdAt: string;
  _count?: {
    branchProducts: number;
  };
}

interface Central {
  id: string;
  name: string;
}

export default function MasterProductsPage() {
  const router = useRouter();
  const params = useParams();
  const centralId = params.id as string;
  const { user, userRole, loading: authLoading } = useAuth();
  const [central, setCentral] = useState<Central | null>(null);
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<MasterProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    sku: '',
    basePrice: '',
    isGloballyAvailable: true,
  });
  const [submitting, setSubmitting] = useState(false);

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
      fetchData();
    }
  }, [user, userRole, authLoading, router, centralId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, centralsRes] = await Promise.all([
        fetch(`/api/superadmin/master-products?centralId=${centralId}`, {
          cache: 'no-store',
        }),
        fetch('/api/superadmin/centrals', { cache: 'no-store' }),
      ]);

      const productsData = await productsRes.json();
      const centralsData = await centralsRes.json();

      if (productsData.success) {
        setProducts(productsData.data.masterProducts || []);
      }

      if (centralsData.success) {
        const found = centralsData.data.centrals.find(
          (c: Central) => c.id === centralId
        );
        if (found) setCentral(found);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: MasterProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        sku: product.sku || '',
        basePrice: String(product.basePrice / 100), // Convertir de centavos a pesos
        isGloballyAvailable: product.isGloballyAvailable,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        sku: '',
        basePrice: '',
        isGloballyAvailable: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingProduct
        ? `/api/superadmin/master-products/${editingProduct.id}`
        : '/api/superadmin/master-products';

      const method = editingProduct ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centralId,
          ...formData,
          basePrice: parseFloat(formData.basePrice),
        }),
      });

      const data = await response.json();

      if (data.success) {
        handleCloseModal();
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro? Esto eliminará el producto de TODOS los restaurantes.'
      )
    )
      return;

    try {
      const response = await fetch(`/api/superadmin/master-products/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  };

  const handleToggleAvailability = async (product: MasterProduct) => {
    try {
      const response = await fetch(
        `/api/superadmin/master-products/${product.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isGloballyAvailable: !product.isGloballyAvailable,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Error al cambiar disponibilidad');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container-modern flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container-modern min-h-screen px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/superadmin/centrals')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Centrales
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Productos Maestros
              </h1>
              <p className="mt-2 text-gray-600">
                {central?.name || 'Cargando...'}
              </p>
            </div>
            <button
              disabled
              className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
              title="La creación de productos maestros solo está disponible desde el panel de administración central"
            >
              <Plus className="h-5 w-5" />
              Nuevo Producto (Solo desde Central Admin)
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`card rounded-lg border p-6 shadow-sm ${
                !product.isGloballyAvailable
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  {product.sku && (
                    <p className="mt-1 text-sm text-gray-500">SKU: {product.sku}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAvailability(product)}
                    className={`rounded p-2 ${
                      product.isGloballyAvailable
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={
                      product.isGloballyAvailable
                        ? 'Desactivar (Panic Button)'
                        : 'Activar'
                    }
                  >
                    {product.isGloballyAvailable ? (
                      <Power className="h-4 w-4" />
                    ) : (
                      <PowerOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="rounded p-2 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="mb-3 text-sm text-gray-600">{product.description}</p>
              )}

              {!product.isGloballyAvailable && (
                <div className="mb-3 flex items-center gap-2 rounded bg-red-100 p-2 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Oculto en todas las tiendas (Panic Button)</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <DollarSign className="h-5 w-5" />
                  ${(product.basePrice / 100).toLocaleString('es-CO')}
                </div>
                <span className="text-sm text-gray-500">
                  {product._count?.branchProducts || 0} restaurantes
                </span>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="mb-4 h-16 w-16 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900">
              No hay productos maestros
            </h3>
            <p className="mt-2 text-gray-500">
              Crea tu primer producto maestro para comenzar
            </p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="rounded p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input h-24 w-full"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    URL de Imagen
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Precio Base (COP) *
                    </label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      required
                      value={formData.basePrice}
                      onChange={(e) =>
                        setFormData({ ...formData, basePrice: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isGloballyAvailable"
                    checked={formData.isGloballyAvailable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isGloballyAvailable: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor="isGloballyAvailable"
                    className="text-sm text-gray-700"
                  >
                    Disponible globalmente (si se desactiva, se oculta en todas
                    las tiendas)
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

