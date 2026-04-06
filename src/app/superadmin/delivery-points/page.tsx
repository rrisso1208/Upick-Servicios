/**
 * Superadmin - Delivery Points Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Upload,
  Search,
  Filter,
  Check,
} from 'lucide-react';

interface DeliveryPoint {
  id: string;
  placeId: string;
  name: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  place: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    orders: number;
  };
}

interface Place {
  id: string;
  name: string;
  slug: string;
}

export default function DeliveryPointsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [formData, setFormData] = useState({
    placeId: '',
    name: '',
    category: '',
    isActive: true,
  });
  const [bulkData, setBulkData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      fetchPlaces();
      fetchPoints();
    }
  }, [user, userRole, authLoading, router]);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/superadmin/universities', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.data?.universities) {
        setPlaces(data.data.universities);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
    }
  };

  const fetchPoints = async () => {
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

      const response = await fetch('/api/superadmin/delivery-points', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success && data.data?.points) {
        setPoints(data.data.points);
      }
    } catch (error) {
      console.error('Error fetching delivery points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (point?: DeliveryPoint) => {
    if (point) {
      setEditingPoint(point);
      setFormData({
        placeId: point.placeId,
        name: point.name,
        category: point.category || '',
        isActive: point.isActive,
      });
    } else {
      setEditingPoint(null);
      setFormData({
        placeId: places[0]?.id || '',
        name: '',
        category: '',
        isActive: true,
      });
    }
    setShowModal(true);
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

      if (editingPoint) {
        // Update
        const response = await fetch(
          `/api/superadmin/delivery-points/${editingPoint.id}`,
          {
            method: 'PATCH',
            headers,
            credentials: 'include',
            body: JSON.stringify(formData),
          }
        );

        const data = await response.json();
        if (data.success) {
          alert('Punto de entrega actualizado exitosamente');
          setShowModal(false);
          fetchPoints();
        } else {
          alert(data.error || 'Error al actualizar punto de entrega');
        }
      } else {
        // Create
        const response = await fetch('/api/superadmin/delivery-points', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            points: [formData],
          }),
        });

        const data = await response.json();
        if (data.success) {
          alert('Punto de entrega creado exitosamente');
          setShowModal(false);
          fetchPoints();
        } else {
          alert(data.error || 'Error al crear punto de entrega');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      alert('Por favor ingresa los datos para cargar');
      return;
    }

    setSubmitting(true);

    try {
      // Parse CSV-like format: name,category (one per line)
      const lines = bulkData
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        alert('No hay datos válidos para cargar');
        setSubmitting(false);
        return;
      }

      const pointsToCreate = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          placeId: formData.placeId,
          name: parts[0] || '',
          category: parts[1] || null,
          isActive: true,
        };
      });

      // Validate
      for (const point of pointsToCreate) {
        if (!point.name) {
          alert('Todos los puntos deben tener un nombre');
          setSubmitting(false);
          return;
        }
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

      const response = await fetch('/api/superadmin/delivery-points', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          points: pointsToCreate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.data.count} puntos de entrega creados exitosamente`);
        setShowBulkModal(false);
        setBulkData('');
        fetchPoints();
      } else {
        alert(data.error || 'Error al cargar puntos de entrega');
      }
    } catch (error) {
      console.error('Error in bulk upload:', error);
      alert('Error al procesar la carga masiva');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (point: DeliveryPoint) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el punto "${point.name}"?${
          point._count?.orders && point._count.orders > 0
            ? ` Este punto tiene ${point._count.orders} pedido(s) asociado(s) y será desactivado en lugar de eliminado.`
            : ''
        }`
      )
    ) {
      return;
    }

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

      const response = await fetch(
        `/api/superadmin/delivery-points/${point.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (data.success) {
        alert(data.message || 'Punto de entrega eliminado exitosamente');
        fetchPoints();
      } else {
        alert(data.error || 'Error al eliminar punto de entrega');
      }
    } catch (error) {
      console.error('Error deleting point:', error);
      alert('Error al eliminar punto de entrega');
    }
  };

  // Filter points
  const filteredPoints = points.filter((point) => {
    const matchesSearch =
      point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (point.category &&
        point.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      point.place.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlace =
      selectedPlaceId === 'all' || point.placeId === selectedPlaceId;

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'null' && !point.category) ||
      point.category === selectedCategory;

    return matchesSearch && matchesPlace && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(points.map((p) => p.category).filter(Boolean) as string[])
  ).sort();

  if (authLoading || loading) {
    return (
      <>
        <Header title="Puntos de Entrega" showBack />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user || userRole !== 'superadmin') {
    return (
      <>
        <Header title="Puntos de Entrega" showBack />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-600">No autorizado</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Puntos de Entrega" showBack />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Puntos de Entrega</h1>
            <p className="mt-2 text-gray-600">
              Gestiona los puntos de entrega para domicilios internos por Hub
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Punto
            </button>
            <button
              onClick={() => {
                setFormData({
                  placeId: places[0]?.id || '',
                  name: '',
                  category: '',
                  isActive: true,
                });
                setBulkData('');
                setShowBulkModal(true);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Carga Masiva
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-lg border bg-white p-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, categoría o Hub..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <select
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">Todos los Hubs</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">Todas las categorías</option>
              <option value="null">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Points List */}
        <div className="card">
          {filteredPoints.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium">
                No hay puntos de entrega
              </p>
              <p className="mt-2 text-sm">
                {searchTerm || selectedPlaceId !== 'all' || selectedCategory !== 'all'
                  ? 'Intenta ajustar los filtros'
                  : 'Crea tu primer punto de entrega'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Hub
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPoints.map((point) => (
                    <tr
                      key={point.id}
                      className="border-b transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {point.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {point.place.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {point.category || (
                          <span className="text-gray-400">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            point.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {point.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {point._count?.orders || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(point)}
                            className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary-600"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(point)}
                            className="rounded p-1.5 text-gray-600 transition-colors hover:bg-red-100 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingPoint ? 'Editar Punto' : 'Nuevo Punto de Entrega'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Hub <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.placeId}
                    onChange={(e) =>
                      setFormData({ ...formData, placeId: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Selecciona un Hub</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="Ej: Banco AV Villas, Torre B - Of 202"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Categoría (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Ej: Bancos, Oficinas, Tiendas"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Activo
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
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

        {/* Bulk Upload Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Carga Masiva de Puntos</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Hub <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.placeId}
                    onChange={(e) =>
                      setFormData({ ...formData, placeId: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Selecciona un Hub</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Datos (uno por línea) <span className="text-red-500">*</span>
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Formato: nombre,categoría (opcional)
                    <br />
                    Ejemplo:
                    <br />
                    Banco AV Villas,Bancos
                    <br />
                    Torre B - Of 202,Oficinas
                    <br />
                    Tienda 1,Tiendas
                  </p>
                  <textarea
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder="Banco AV Villas,Bancos&#10;Torre B - Of 202,Oficinas&#10;Tienda 1,Tiendas"
                    rows={10}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    disabled={submitting || !formData.placeId || !bulkData.trim()}
                    className="btn-primary flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Cargar Puntos
                      </>
                    )}
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

