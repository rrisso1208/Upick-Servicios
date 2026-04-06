/**
 * Superadmin - Restaurants Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Store,
  Plus,
  Edit,
  MapPin,
  X,
  User,
  UserPlus,
  Loader2,
  Pause,
  Play,
  Settings,
  Search,
  DollarSign,
} from 'lucide-react';
import { ImageAdjuster } from '../../../components/ui/ImageAdjuster';
import type { PlaceType } from '@prisma/client';

function placeTypeLabel(t: PlaceType | undefined | null): string {
  switch (t) {
    case 'SERVICE':
      return 'Servicio';
    case 'DISCOTECA':
      return 'Discoteca';
    case 'RESTAURANT':
    default:
      return 'Restaurante';
  }
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  type?: PlaceType | null;
  location?: string | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  isActive: boolean;
  placeId: string;
  centralId?: string | null;
  commissionPercentage?: number | null;
  commissionIvaPayer?: 'RESTAURANT' | 'PLATFORM' | null;
  freeFeeThreshold?: number | null;
  lowOrderFee?: number | null;
  university: {
    name: string;
  };
  users: AdminUser[];
  _count?: {
    products: number;
    orders: number;
  };
  ordersCountValid?: number;
}

interface Central {
  id: string;
  name: string;
  isActive?: boolean;
}

interface University {
  id: string;
  name: string;
  slug: string;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [centrals, setCentrals] = useState<Central[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null
  );
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    location: '',
    imageUrl: '',
    imagePosition: 'center',
    imageScale: 1.0,
    placeId: '',
    centralId: '', // ID de la Central (opcional)
    commissionPercentage: '5.0',
    commissionIvaPayer: 'RESTAURANT',
    freeFeeThreshold: '0', // Monto mínimo para evitar service fee (en pesos)
    lowOrderFee: '0', // Service fee si no se cumple el mínimo (en pesos)
    isActive: true,
    type: 'RESTAURANT' as PlaceType,
  });
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    createNew: true,
  });
  const [emailCheckResult, setEmailCheckResult] = useState<{
    exists: boolean;
    user?: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      restaurantName?: string;
    };
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageAdjuster, setShowImageAdjuster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [restaurantMetrics, setRestaurantMetrics] = useState<
    Record<
      string,
      {
        ordersToday: number;
        revenueMonth: number;
        commissionMonth: number;
      }
    >
  >({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);

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
      fetchRestaurants();
      fetchUniversities();
      fetchCentrals();
    }
  }, [user, userRole, authLoading, router]);

  const fetchRestaurants = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/superadmin/restaurants', {
        headers,
      });
      const data = await response.json();
      if (data.success) {
        setRestaurants(data.data.restaurants);
        // Fetch metrics after restaurants are loaded
        if (data.data.restaurants.length > 0) {
          fetchRestaurantMetrics(
            data.data.restaurants.map((r: Restaurant) => r.id)
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantMetrics = async (restaurantIds: string[]) => {
    if (restaurantIds.length === 0) return;

    try {
      setLoadingMetrics(true);
      const params = new URLSearchParams();
      params.append('restaurantIds', restaurantIds.join(','));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/superadmin/restaurants/metrics?${params.toString()}`,
        { headers }
      );
      const data = await response.json();
      if (data.success) {
        setRestaurantMetrics(data.data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchUniversities = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/superadmin/universities', {
        headers,
      });
      const data = await response.json();
      if (data.success) {
        setUniversities(data.data.universities);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  };

  const fetchCentrals = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/superadmin/centrals', {
        headers,
      });
      const data = await response.json();
      if (data.success) {
        setCentrals(data.data.centrals || []);
      }
    } catch (error) {
      console.error('Failed to fetch centrals:', error);
    }
  };

  const handleOpenModal = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name,
        slug: restaurant.slug,
        location: restaurant.location || '',
        imageUrl: restaurant.imageUrl || '',
        imagePosition: restaurant.imagePosition || 'center',
        imageScale: restaurant.imageScale || 1.0,
        placeId: restaurant.placeId,
        centralId: restaurant.centralId || '',
        commissionPercentage: restaurant.commissionPercentage
          ? restaurant.commissionPercentage.toString()
          : '5.0',
        commissionIvaPayer: restaurant.commissionIvaPayer || 'RESTAURANT',
        freeFeeThreshold: restaurant.freeFeeThreshold
          ? (restaurant.freeFeeThreshold / 100).toString()
          : '0',
        lowOrderFee: restaurant.lowOrderFee
          ? (restaurant.lowOrderFee / 100).toString()
          : '0',
        isActive: restaurant.isActive,
        type: restaurant.type ?? 'RESTAURANT',
      });
      setImagePreview(restaurant.imageUrl || null);
      setShowImageAdjuster(false);
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: '',
        slug: '',
        location: '',
        imageUrl: '',
        imagePosition: 'center',
        imageScale: 1.0,
        placeId: universities[0]?.id || '',
        centralId: '',
        commissionPercentage: '5.0',
        commissionIvaPayer: 'RESTAURANT',
        freeFeeThreshold: '0',
        lowOrderFee: '0',
        isActive: true,
        type: 'RESTAURANT',
      });
      setImagePreview(null);
      setShowImageAdjuster(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRestaurant(null);
    setFormData({
      name: '',
      slug: '',
      location: '',
      imageUrl: '',
      imagePosition: 'center',
      imageScale: 1.0,
      placeId: universities[0]?.id || '',
      centralId: '',
      commissionPercentage: '5.0',
      commissionIvaPayer: 'RESTAURANT',
      freeFeeThreshold: '0',
      lowOrderFee: '0',
      isActive: true,
      type: 'RESTAURANT',
    });
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 4MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'restaurants');

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formDataUpload,
      });

      const data = await response.json();

      if (data.success) {
        setFormData({
          ...formData,
          imageUrl: data.data.url,
        });
      } else {
        alert(data.error || 'Error al subir la imagen');
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenAdminModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setAdminFormData({
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      createNew: true,
    });
    setEmailCheckResult(null);
    setShowAdminModal(true);
  };

  const handleCloseAdminModal = () => {
    setShowAdminModal(false);
    setSelectedRestaurant(null);
    setAdminFormData({
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      createNew: true,
    });
    setEmailCheckResult(null);
  };

  const checkEmail = async (email: string) => {
    if (!email || !selectedRestaurant) return;

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
        `/api/superadmin/restaurants/${selectedRestaurant.id}/check-email`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setEmailCheckResult(data);
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingRestaurant
        ? `/api/superadmin/restaurants/${editingRestaurant.id}`
        : '/api/superadmin/restaurants';

      const method = editingRestaurant ? 'PATCH' : 'POST';

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchRestaurants();
        handleCloseModal();
        alert(
          editingRestaurant
            ? 'Restaurante actualizado exitosamente'
            : 'Restaurante creado exitosamente'
        );
      } else {
        alert(data.error || 'Error al guardar restaurante');
      }
    } catch (error) {
      console.error('Error submitting restaurant:', error);
      alert('Error al guardar restaurante');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    setSubmitting(true);

    try {
      // Get session token
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
        `/api/superadmin/restaurants/${selectedRestaurant.id}/assign-admin`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(adminFormData),
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchRestaurants();
        handleCloseAdminModal();
        alert(data.message || 'Administrador asignado exitosamente');
      } else {
        alert(data.error || 'Error al asignar administrador');
      }
    } catch (error) {
      console.error('Error assigning admin:', error);
      alert('Error al asignar administrador');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (restaurant: Restaurant) => {
    // Only block if restaurant has orders (products will be deleted in cascade)
    if (restaurant._count && restaurant._count.orders > 0) {
      alert(
        `No se puede eliminar. Este restaurante tiene ${restaurant._count.orders} pedido(s) asociado(s).`
      );
      return;
    }

    // Warn if restaurant has products (they will be deleted)
    const hasProducts = restaurant._count && restaurant._count.products > 0;
    const confirmMessage = hasProducts
      ? `¿Estás seguro de eliminar "${restaurant.name}"? Se eliminarán también ${restaurant._count?.products || 0} producto(s) asociado(s).`
      : `¿Estás seguro de eliminar "${restaurant.name}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/superadmin/restaurants/${restaurant.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchRestaurants();
        alert('Restaurante eliminado exitosamente');
      } else {
        alert(data.error || 'Error al eliminar restaurante');
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('Error al eliminar restaurante');
    }
  };

  const handleToggleActive = async (restaurant: Restaurant) => {
    const action = restaurant.isActive ? 'suspender' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} "${restaurant.name}"?`)) {
      return;
    }

    try {
      // Get session token
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
        `/api/superadmin/restaurants/${restaurant.id}`,
        {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            isActive: !restaurant.isActive,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchRestaurants();
        alert(
          `Restaurante ${restaurant.isActive ? 'suspendido' : 'activado'} exitosamente`
        );
      } else {
        alert(data.error || `Error al ${action} restaurante`);
      }
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      alert(`Error al ${action} restaurante`);
    }
  };

  const getAdminName = (restaurant: Restaurant) => {
    const admin = restaurant.users[0];
    if (!admin) return null;
    return admin.firstName && admin.lastName
      ? `${admin.firstName} ${admin.lastName}`
      : admin.email;
  };

  return (
    <>
      <Header
        title={loading ? 'Negocios' : 'Gestión de Negocios'}
        showBack
      />
      {authLoading || loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : !user || userRole !== 'superadmin' ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-600">No autorizado</div>
        </div>
      ) : (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Negocios</h1>
              <p className="mt-2 text-gray-600">
                {restaurants.length} negocio(s) registrado(s)
              </p>
            </div>
            <button onClick={() => handleOpenModal()} className="btn-primary">
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Negocio
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, lugar o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10 pr-4"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <select
                value={selectedUniversityId}
                onChange={(e) => setSelectedUniversityId(e.target.value)}
                className="input w-full"
              >
                <option value="">Todos los lugares</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="input w-full"
              >
                <option value="all">Todos</option>
                <option value="active">Solo Activos</option>
                <option value="inactive">Solo Inactivos</option>
              </select>
            </div>
          </div>

          {/* Restaurants grouped by University */}
          {(() => {
            // Filter restaurants based on search term, university filter, and active status
            const filteredRestaurants = restaurants.filter((restaurant) => {
              // Active/Inactive filter
              if (statusFilter === 'active' && !restaurant.isActive) {
                return false;
              }
              if (statusFilter === 'inactive' && restaurant.isActive) {
                return false;
              }

              // University filter
              if (
                selectedUniversityId &&
                restaurant.placeId !== selectedUniversityId
              ) {
                return false;
              }

              // Search term filter
              if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const restaurantName = restaurant.name.toLowerCase();
                const placeName = restaurant.university.name.toLowerCase();
                const location = (restaurant.location || '').toLowerCase();
                return (
                  restaurantName.includes(searchLower) ||
                  placeName.includes(searchLower) ||
                  location.includes(searchLower)
                );
              }

              return true;
            });

            // Group restaurants by university
            const groupedByUniversity = filteredRestaurants.reduce(
              (acc, restaurant) => {
                const placeId = restaurant.placeId;
                if (!acc[placeId]) {
                  acc[placeId] = {
                    university: restaurant.university,
                    restaurants: [],
                  };
                }
                acc[placeId].restaurants.push(restaurant);
                return acc;
              },
              {} as Record<
                string,
                {
                  university: { name: string };
                  restaurants: Restaurant[];
                }
              >
            );

            const groupedArray = Object.values(groupedByUniversity);

            if (groupedArray.length === 0 && searchTerm) {
              return (
                <div className="py-12 text-center">
                  <p className="text-gray-500">
                    No se encontraron restaurantes que coincidan con &quot;
                    {searchTerm}&quot;
                  </p>
                </div>
              );
            }

            return groupedArray.map((group) => (
              <div key={group.university.name} className="mb-12">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {group.university.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {group.restaurants.length} restaurante(s) en este lugar
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {group.restaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className={`card ${!restaurant.isActive
                        ? 'border-2 border-orange-300 opacity-60'
                        : ''
                        }`}
                    >
                      {restaurant.imageUrl && (
                        <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={restaurant.imageUrl}
                            alt={restaurant.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary-100 p-3">
                          <Store className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{restaurant.name}</h3>
                            <span
                              className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              title="Tipo de negocio"
                            >
                              {placeTypeLabel(restaurant.type)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {restaurant.university.name}
                          </p>
                          {restaurant.location && (
                            <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="h-3 w-3" />
                              <span>{restaurant.location}</span>
                            </div>
                          )}

                          {/* Admin Info */}
                          <div className="mt-2 flex items-center gap-1 text-sm">
                            <User className="h-3 w-3 text-gray-500" />
                            {getAdminName(restaurant) ? (
                              <span className="text-gray-600">
                                {getAdminName(restaurant)}
                              </span>
                            ) : (
                              <span className="font-medium text-orange-600">
                                Sin administrador
                              </span>
                            )}
                          </div>

                          {restaurant._count && (
                            <div className="mt-2 text-sm text-gray-600">
                              {restaurant._count.products} productos •{' '}
                              {typeof restaurant.ordersCountValid === 'number'
                                ? `${restaurant.ordersCountValid} pedidos`
                                : `${restaurant._count.orders} pedidos (sin filtrar)`}
                            </div>
                          )}

                          {/* Quick Metrics */}
                          {loadingMetrics ? (
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Cargando métricas...</span>
                            </div>
                          ) : restaurantMetrics[restaurant.id] ? (
                            <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">
                                  Pedidos hoy:
                                </span>
                                <span className="font-semibold">
                                  {restaurantMetrics[restaurant.id].ordersToday}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">
                                  Ventas del mes:
                                </span>
                                <span className="font-semibold text-green-600">
                                  $
                                  {(
                                    (restaurantMetrics[restaurant.id]
                                      .revenueMonth || 0) / 100
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">
                                  Comisión del mes:
                                </span>
                                <span className="font-semibold text-primary-600">
                                  $
                                  {(
                                    (restaurantMetrics[restaurant.id]
                                      .commissionMonth || 0) / 100
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3">
                            <span
                              className={`badge ${restaurant.isActive
                                ? 'badge-success'
                                : 'badge-error'
                                }`}
                            >
                              {restaurant.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenAdminModal(restaurant)}
                            className="btn-secondary flex-1 text-sm"
                            title={
                              getAdminName(restaurant)
                                ? 'Cambiar admin'
                                : 'Asignar admin'
                            }
                          >
                            <UserPlus className="mr-1 h-4 w-4" />
                            {getAdminName(restaurant)
                              ? 'Cambiar'
                              : 'Asignar'}{' '}
                            Admin
                          </button>
                          <button
                            onClick={() => handleToggleActive(restaurant)}
                            className={`btn-secondary text-sm ${restaurant.isActive
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                              }`}
                            title={
                              restaurant.isActive
                                ? 'Suspender restaurante'
                                : 'Activar restaurante'
                            }
                          >
                            {restaurant.isActive ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenModal(restaurant)}
                            className="btn-secondary text-sm"
                            title="Editar restaurante"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(restaurant)}
                            className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                            title="Eliminar restaurante"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            router.push(
                              `/superadmin/restaurants/${restaurant.id}/commission`
                            )
                          }
                          className="btn-primary mt-2 w-full text-sm"
                          title="Ver métricas de comisión"
                        >
                          <DollarSign className="mr-1 h-4 w-4" />
                          Ver Comisiones
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}

          {restaurants.length === 0 && !searchTerm && (
            <div className="py-12 text-center text-gray-500">
              No hay restaurantes registrados.
            </div>
          )}
        </main>
      )}

      {/* Restaurant Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
            <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingRestaurant
                    ? 'Editar Negocio'
                    : 'Nuevo Negocio'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="input w-full"
                      placeholder="Negocio XYZ"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Slug (URL) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="input w-full"
                      placeholder="negocio-xyz"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      URL: /{formData.slug}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tipo de Negocio *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as PlaceType,
                        })
                      }
                      className="input w-full"
                    >
                      <option value="RESTAURANT">Restaurante (Comida)</option>
                      <option value="SERVICE">Servicio (Peluquería, Masajes, etc.)</option>
                      <option value="DISCOTECA">Discoteca / Club Nocturno</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Imagen
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="input w-full"
                    />
                    {uploadingImage && (
                      <p className="mt-1 text-xs text-gray-500">
                        Subiendo imagen...
                      </p>
                    )}
                    {imagePreview && (
                      <div className="mt-2 space-y-3">
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-48 w-full rounded-lg object-cover"
                            style={{
                              objectPosition: formData.imagePosition,
                              transform: `scale(${formData.imageScale})`,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setShowImageAdjuster(!showImageAdjuster)
                          }
                          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" />
                          {showImageAdjuster
                            ? 'Ocultar ajustador'
                            : 'Ajustar imagen'}
                        </button>
                        {showImageAdjuster && (
                          <div className="border-t pt-3">
                            <ImageAdjuster
                              imageUrl={imagePreview}
                              initialPosition={formData.imagePosition}
                              initialScale={formData.imageScale}
                              onPositionChange={(position) => {
                                setFormData({
                                  ...formData,
                                  imagePosition: position,
                                });
                              }}
                              onScaleChange={(scale) => {
                                setFormData({ ...formData, imageScale: scale });
                              }}
                              containerWidth={400}
                              containerHeight={300}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Lugar *
                    </label>
                    <select
                      required
                      value={formData.placeId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          placeId: e.target.value,
                        })
                      }
                      className="input w-full"
                    >
                      <option value="">Seleccionar lugar</option>
                      {universities.map((uni) => (
                        <option key={uni.id} value={uni.id}>
                          {uni.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Central (Opcional)
                    </label>
                    <select
                      value={formData.centralId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          centralId: e.target.value,
                        })
                      }
                      className="input w-full"
                    >
                      <option value="">Sin Central (Restaurante Independiente)</option>
                      {centrals
                        .filter((c) => c.isActive !== false)
                        .map((central) => (
                          <option key={central.id} value={central.id}>
                            {central.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Si seleccionas una Central, el restaurante usará el menú jerárquico (MasterProducts). Si no, usará productos independientes.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Ubicación (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="input w-full"
                      placeholder="Edificio 401, Primer piso"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Porcentaje de Comisión de la Plataforma (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.commissionPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionPercentage: e.target.value,
                        })
                      }
                      className="input w-full"
                      placeholder="5.0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Porcentaje que la plataforma cobra sobre cada venta (ej:
                      5.0 para 5%)
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      ¿Quién paga el IVA (19%) sobre la comisión?
                    </label>

                    <select
                      value={formData.commissionIvaPayer}
                      onChange={(e) =>
                        setFormData({ ...formData, commissionIvaPayer: e.target.value as any })
                      }
                      className="input w-full"
                    >
                      <option value="RESTAURANT">El restaurante</option>
                      <option value="PLATFORM">La plataforma (Upick)</option>
                    </select>

                    <p className="mt-1 text-xs text-gray-500">
                      Esto afecta el neto a transferir en el panel del restaurante.
                    </p>
                  </div>

                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-3 text-sm font-bold text-blue-900">
                      Tarifa de Servicio (Service Fee)
                    </h3>
                    <p className="mb-4 text-xs text-blue-700">
                      Configura una tarifa de servicio que se cobra cuando el pedido no supera un monto mínimo. Esto ayuda a cubrir los costos fijos de la pasarela de pagos en pedidos pequeños.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Monto Mínimo para Servicio Gratis (COP)
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={formData.freeFeeThreshold}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              freeFeeThreshold: e.target.value,
                            })
                          }
                          className="input w-full"
                          placeholder="20000"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Si el pedido supera este monto, el servicio es gratis. Ej: 20000 para $20.000. Dejar en 0 para desactivar.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Costo del Servicio si no se cumple el mínimo (COP)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.lowOrderFee}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lowOrderFee: e.target.value,
                            })
                          }
                          className="input w-full"
                          placeholder="800"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Costo que se cobra si el pedido no supera el monto mínimo. Ej: 800 para $800, 850 para $850.
                        </p>
                      </div>
                    </div>
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
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      Negocio activo
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
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
                    className="btn-primary flex-1"
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Guardando...'
                      : editingRestaurant
                        ? 'Actualizar'
                        : 'Crear'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Assignment Modal */}
      {showAdminModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
            <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Asignar Administrador</h2>
                <button
                  onClick={handleCloseAdminModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleAssignAdmin}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedRestaurant.name}</strong>
                  </p>
                  <p className="mt-1 text-xs text-blue-600">
                    El administrador podrá gestionar el menú, ver pedidos y
                    métricas de este restaurante.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={adminFormData.createNew}
                        onChange={() =>
                          setAdminFormData({
                            ...adminFormData,
                            createNew: true,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">
                        Crear nuevo usuario
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!adminFormData.createNew}
                        onChange={() =>
                          setAdminFormData({
                            ...adminFormData,
                            createNew: false,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">
                        Asignar usuario existente
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminFormData.email}
                      onChange={(e) => {
                        setAdminFormData({
                          ...adminFormData,
                          email: e.target.value,
                        });
                        setEmailCheckResult(null);
                      }}
                      onBlur={(e) => checkEmail(e.target.value)}
                      className="input w-full"
                      placeholder="admin@restaurante.com"
                    />
                    {emailCheckResult?.exists && emailCheckResult?.user && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm font-medium text-blue-800">
                          ✓ Este email ya existe en el sistema
                        </p>
                        <p className="mt-1 text-xs text-blue-600">
                          {emailCheckResult.user.firstName}{' '}
                          {emailCheckResult.user.lastName}
                          {' · '}
                          Rol:{' '}
                          {emailCheckResult.user.role === 'student'
                            ? 'Usuario'
                            : emailCheckResult.user.role === 'restaurant_admin'
                              ? 'Admin de Restaurante'
                              : 'Superadmin'}
                          {emailCheckResult.user.restaurantName &&
                            ` · Restaurante: ${emailCheckResult.user.restaurantName}`}
                        </p>
                        <p className="mt-2 text-xs font-medium text-blue-700">
                          → Usa &quot;Asignar usuario existente&quot; para hacer
                          a esta persona admin de este restaurante.
                        </p>
                      </div>
                    )}
                  </div>

                  {adminFormData.createNew && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          required={adminFormData.createNew}
                          value={adminFormData.firstName}
                          onChange={(e) =>
                            setAdminFormData({
                              ...adminFormData,
                              firstName: e.target.value,
                            })
                          }
                          className="input w-full"
                          placeholder="Juan"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Apellido *
                        </label>
                        <input
                          type="text"
                          required={adminFormData.createNew}
                          value={adminFormData.lastName}
                          onChange={(e) =>
                            setAdminFormData({
                              ...adminFormData,
                              lastName: e.target.value,
                            })
                          }
                          className="input w-full"
                          placeholder="Pérez"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Teléfono (opcional)
                        </label>
                        <input
                          type="tel"
                          value={adminFormData.phoneNumber}
                          onChange={(e) =>
                            setAdminFormData({
                              ...adminFormData,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="input w-full"
                          placeholder="+57 300 123 4567"
                        />
                      </div>

                      <div className="rounded-lg bg-yellow-50 p-3">
                        <p className="text-xs text-yellow-800">
                          ℹ️ El usuario deberá registrarse en la plataforma
                          usando este email para acceder al panel de
                          administrador.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAdminModal}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={submitting}
                  >
                    {submitting ? 'Asignando...' : 'Asignar Administrador'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
