/**
 * Superadmin - Users Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Edit,
  Eye,
  Loader2,
  Mail,
  Phone,
  Calendar,
  ShoppingCart,
  Wallet,
  Building2,
  Store,
  Download
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  place: {
    id: string;
    name: string;
  } | null;
  restaurant: {
    id: string;
    name: string;
  } | null;
  credits: {
    balance: number;
  } | null;
  _count: {
    orders: number;
  };
}

interface Place {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
}

const roleConfig: Record<string, { label: string; className: string }> = {
  student: { label: 'Usuario', className: 'badge-info' },
  restaurant_admin: { label: 'Admin Restaurante', className: 'badge-warning' },
  superadmin: { label: 'Superadmin', className: 'badge-error' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagado', className: 'badge-info' },
  in_progress: { label: 'En preparación', className: 'badge-warning' },
  ready: { label: 'Listo', className: 'badge-success' },
  delivered: { label: 'Entregado', className: 'badge-info' },
  cancelled: { label: 'Cancelado', className: 'badge-error' },
  refunded: { label: 'Reembolsado', className: 'badge-error' },
};

export default function SuperadminUsersPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'orders' | 'credits' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(0);

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
      fetchRestaurants();
      fetchUsers();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (userRole === 'superadmin') {
        fetchUsers();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    roleFilter,
    placeFilter,
    restaurantFilter,
    isActiveFilter,
    searchTerm,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/superadmin/universities');
      const data = await response.json();
      if (data.success) {
        setPlaces(data.data.universities);
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/superadmin/restaurants');
      const data = await response.json();
      if (data.success) {
        setRestaurants(data.data.restaurants);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);

      }
      if (placeFilter !== 'all') {
        params.append('placeId', placeFilter);
      }
      if (restaurantFilter !== 'all') {
        params.append('restaurantId', restaurantFilter);
      }
      if (isActiveFilter !== 'all') {
        params.append('isActive', isActiveFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(
        `/api/superadmin/users?${params.toString()}`
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, isActive: !currentStatus });
        }
      } else {
        alert(data.error || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const handleViewUserDetails = async (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    setLoadingOrders(true);

    try {
      const response = await fetch(`/api/superadmin/users/${user.id}/orders`);
      const data = await response.json();
      if (data.success) {
        setUserOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const clearFilters = () => {
    setRoleFilter('all');
    setPlaceFilter('all');
    setRestaurantFilter('all');
    setIsActiveFilter('all');
    setSearchTerm('');
  };

  const handleExportExcel = async (): Promise<void> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert('No autenticado');
        return;
      }

      const response = await fetch(
        '/api/superadmin/users/export-excel',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al exportar Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'students_upick.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Error al exportar Excel');
    }
  };

  const handleExportCSV = async (): Promise<void> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert('No autenticado');
        return;
      }

      const response = await fetch(
        '/api/superadmin/users/export-csv',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al exportar CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'students_upick.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Error al exportar CSV');
    }
  };

  if (authLoading || userRole !== 'superadmin') {
    return (
      <>
        <Header title="Usuarios - Superadmin" />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Usuarios - Superadmin" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="mt-2 text-gray-600">
              Administra todos los usuarios del sistema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </button>

            <button
              onClick={handleExportCSV}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Ordenar por:</span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border px-3 py-2"
          >
            <option value="createdAt">Más recientes</option>
            <option value="orders">Más pedidos</option>
            <option value="credits">Más créditos</option>
          </select>

          <button
            onClick={() =>
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            }
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            {sortOrder === 'asc' ? 'Ascendente ↑' : 'Descendente ↓'}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpiar filtros
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Rol</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  <option value="student">Usuario</option>
                  <option value="restaurant_admin">Admin Restaurante</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Lugar</label>
                <select
                  value={placeFilter}
                  onChange={(e) => setPlaceFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todas</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Restaurante
                </label>
                <select
                  value={restaurantFilter}
                  onChange={(e) => setRestaurantFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Estado</label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todos</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Mostrar:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={total}>Todos</option>
          </select>
        </div>


        <div className="mb-4 text-sm text-gray-600">
          Mostrando {page * limit + 1} - {page * limit + users.length} de {total}
        </div>


        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="card py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Créditos
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = roleConfig[user.role] || {
                    label: user.role,
                    className: 'badge-info',
                  };
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phoneNumber && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="h-3 w-3" />
                              {user.phoneNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${role.className}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.restaurant ? (
                          <div className="flex items-center gap-1">
                            <Store className="h-4 w-4 text-gray-400" />
                            {user.restaurant.name}
                          </div>
                        ) : user.place ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {user.place.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Wallet className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">
                            $
                            {(
                              (user.credits?.balance || 0) / 100
                            ).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                          <span>{user._count.orders}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            user.isActive ? 'badge-success' : 'badge-error'
                          }`}
                        >
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewUserDetails(user)}
                            className="text-primary-600 hover:text-primary-700"
                            title="Ver detalles"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleActive(user.id, user.isActive)
                            }
                            className={
                              user.isActive
                                ? 'text-orange-600 hover:text-orange-700'
                                : 'text-green-600 hover:text-green-700'
                            }
                            title={user.isActive ? 'Desactivar' : 'Activar'}
                          >
                            {user.isActive ? (
                              <UserX className="h-5 w-5" />
                            ) : (
                              <UserCheck className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Detalles del Usuario</h2>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Rol
                  </label>
                  <p className="mt-1">
                    <span
                      className={`badge ${roleConfig[selectedUser.role]?.className || 'badge-info'}`}
                    >
                      {roleConfig[selectedUser.role]?.label ||
                        selectedUser.role}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Nombre
                  </label>
                  <p className="mt-1">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Teléfono
                  </label>
                  <p className="mt-1">{selectedUser.phoneNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Créditos
                  </label>
                  <p className="mt-1 font-semibold">
                    $
                    {(
                      (selectedUser.credits?.balance || 0) / 100
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Pedidos
                  </label>
                  <p className="mt-1">{selectedUser._count.orders}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Estado
                  </label>
                  <p className="mt-1">
                    <span
                      className={`badge ${
                        selectedUser.isActive ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Fecha de Registro
                  </label>
                  <p className="mt-1">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      'es-CO'
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">
                  Historial de Pedidos
                </h3>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : userOrders.length === 0 ? (
                  <p className="text-gray-600">No hay pedidos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {userOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div>
                          <div className="font-semibold">
                            #{order.pickupCode} - {order.restaurant.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.place.name} •{' '}
                            {new Date(order.createdAt).toLocaleDateString(
                              'es-CO'
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${((order.totalAmount || 0) / 100).toLocaleString()}
                          </div>
                          <span
                            className={`badge ${statusConfig[order.status]?.className || 'badge-info'}`}
                          >
                            {statusConfig[order.status]?.label || order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0}
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
          >
            ←
          </button>

          <span className="text-sm">
    Página {page + 1} de {Math.ceil(total / limit)}
  </span>

          <button
            onClick={() =>
              setPage((prev) =>
                (prev + 1) * limit < total ? prev + 1 : prev
              )
            }
            disabled={(page + 1) * limit >= total}
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
          >
            →
          </button>
        </div>
      </main>
    </>
  );
}
