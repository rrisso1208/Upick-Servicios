/**
 * Restaurant Admin - Inventory Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
  Package,
  AlertTriangle,
  Edit,
  Save,
  X,
  Loader2,
  CheckCircle,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  inventoryQuantity: number | null;
  inventoryAlertThreshold: number | null;
  category: {
    id: string;
    name: string;
  };
}

interface Alert {
  id: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  threshold: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    category: {
      name: string;
    };
  };
}

export default function InventoryPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

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
      fetchInventory();
    }
  }, [user, userRole, authLoading, router]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/inventory', {
        headers,
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        setProducts(result.data.products);
        setAlerts(result.data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditValue(product.inventoryQuantity?.toString() || '0');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveInventory = async (productId: string) => {
    try {
      const quantity = parseInt(editValue);
      if (isNaN(quantity) || quantity < 0) {
        toast.error('La cantidad debe ser un número válido mayor o igual a 0');
        return;
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

      const response = await fetch(`/api/admin/inventory/${productId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Inventario actualizado correctamente');
        setEditingId(null);
        setEditValue('');
        fetchInventory(); // Refresh data
      } else {
        toast.error(result.error || 'Error al actualizar inventario');
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast.error('Error al actualizar inventario');
    }
  };

  if (authLoading || userRole !== 'restaurant_admin') {
    return (
      <>
        <Header title="Inventario" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Inventario" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <p className="mt-2 text-gray-600">
            Administra el inventario de tus productos y revisa las alertas
          </p>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <div className="card border-l-4 border-orange-500 bg-orange-50">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-orange-900">
                  Alertas Activas ({alerts.length})
                </h2>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-orange-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {alert.product.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Categoría: {alert.product.category.name}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-orange-600">
                            <TrendingDown className="mr-1 inline h-4 w-4" />
                            Unidades actuales: <strong>{alert.currentQuantity}</strong>
                          </span>
                          <span className="text-gray-600">
                            Umbral: <strong>{alert.threshold}</strong>
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Alerta creada:{' '}
                          {new Date(alert.createdAt).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => startEditing(products.find(p => p.id === alert.productId)!)}
                        className="rounded-lg bg-orange-600 px-3 py-1 text-sm text-white transition-colors hover:bg-orange-700"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">
              No hay productos con inventario habilitado
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Habilita el inventario en el gestor de menú para gestionarlo aquí
            </p>
          </div>
        ) : (
          <div className="card">
            <h2 className="mb-4 text-xl font-semibold">Productos con Inventario</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Cantidad Actual
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Umbral de Alerta
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isLow =
                      product.inventoryAlertThreshold !== null &&
                      product.inventoryQuantity !== null &&
                      product.inventoryQuantity <= product.inventoryAlertThreshold;
                    const isEditing = editingId === product.id;

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-100 ${
                          isLow ? 'bg-orange-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.category.name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              min="0"
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`font-semibold ${
                                isLow ? 'text-orange-600' : 'text-gray-900'
                              }`}
                            >
                              {product.inventoryQuantity ?? 0}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {product.inventoryAlertThreshold ?? 'No configurado'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                              <AlertTriangle className="h-3 w-3" />
                              Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              <CheckCircle className="h-3 w-3" />
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveInventory(product.id)}
                                  className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-700"
                                  title="Guardar"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="rounded-lg bg-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-400"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditing(product)}
                                className="rounded-lg bg-primary-600 p-2 text-white transition-colors hover:bg-primary-700"
                                title="Editar cantidad"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

