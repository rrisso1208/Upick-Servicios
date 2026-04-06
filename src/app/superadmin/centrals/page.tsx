/**
 * Superadmin - Centrales Management
 * Gestión de Centrales y despliegue masivo de restaurantes
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Store,
  Settings,
  Search,
  Package,
  Users,
  DollarSign,
  MapPin,
} from 'lucide-react';

interface Central {
  id: string;
  name: string;
  legalName?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  commissionPercentage: number;
  freeFeeThreshold: number;
  lowOrderFee: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    restaurants: number;
    masterProducts: number;
    users: number;
  };
}

interface Place {
  id: string;
  name: string;
  slug: string;
  city?: {
    id: string;
    name: string;
  } | null;
}

export default function CentralsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [centrals, setCentrals] = useState<Central[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [editingCentral, setEditingCentral] = useState<Central | null>(null);
  const [selectedCentral, setSelectedCentral] = useState<Central | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    logoUrl: '',
    bannerUrl: '',
    commissionPercentage: '5.0',
    freeFeeThreshold: '0',
    lowOrderFee: '0',
    isActive: true,
    hubIds: [] as string[], // Hubs donde desplegar restaurantes
    centralAdminEmail: '', // Email del administrador central
  });
  const [deployData, setDeployData] = useState({
    hubIds: [] as string[],
    adminEmails: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

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
  }, [user, userRole, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const [centralsRes, placesRes] = await Promise.all([
        fetch('/api/superadmin/centrals', {
          cache: 'no-store',
          headers,
        }),
        fetch('/api/superadmin/universities', {
          cache: 'no-store',
          headers,
        }),
      ]);

      const centralsData = await centralsRes.json();
      const placesData = await placesRes.json();

      if (centralsData.success) {
        setCentrals(centralsData.data.centrals || []);
      }

      if (placesData.success && placesData.data?.universities) {
        setPlaces(placesData.data.universities);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (central?: Central) => {
    if (central) {
      setEditingCentral(central);
      setFormData({
        name: central.name,
        legalName: central.legalName || '',
        logoUrl: central.logoUrl || '',
        bannerUrl: central.bannerUrl || '',
        commissionPercentage: String(central.commissionPercentage),
        freeFeeThreshold: String(central.freeFeeThreshold / 100), // Convertir de centavos a pesos
        lowOrderFee: String(central.lowOrderFee / 100), // Convertir de centavos a pesos
        isActive: central.isActive,
        hubIds: [], // Al editar, no pre-cargamos los hubs (se despliegan desde el botón Desplegar)
        centralAdminEmail: '', // Se cargará desde la API si existe
      });
      setLogoPreview(central.logoUrl || null);
      setBannerPreview(central.bannerUrl || null);
    } else {
      setEditingCentral(null);
      setFormData({
        name: '',
        legalName: '',
        logoUrl: '',
        bannerUrl: '',
        commissionPercentage: '5.0',
        freeFeeThreshold: '0',
        lowOrderFee: '0',
        isActive: true,
        hubIds: [],
        centralAdminEmail: '',
      });
      setLogoPreview(null);
      setBannerPreview(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCentral(null);
    setFormData({
      name: '',
      legalName: '',
      logoUrl: '',
      bannerUrl: '',
      commissionPercentage: '5.0',
      freeFeeThreshold: '0',
      lowOrderFee: '0',
      isActive: true,
      hubIds: [],
      centralAdminEmail: '',
    });
    setLogoPreview(null);
    setBannerPreview(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingLogo(true);

    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'centrals');

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
          logoUrl: data.data.url,
        });
      } else {
        alert(data.error || 'Error al subir la imagen');
        setLogoPreview(null);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error al subir la imagen');
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingBanner(true);

    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'centrals');

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
          bannerUrl: data.data.url,
        });
      } else {
        alert(data.error || 'Error al subir la imagen');
        setBannerPreview(null);
      }
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Error al subir la imagen');
      setBannerPreview(null);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const url = editingCentral
        ? `/api/superadmin/centrals/${editingCentral.id}`
        : '/api/superadmin/centrals';

      const method = editingCentral ? 'PATCH' : 'POST';

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          commissionPercentage: parseFloat(formData.commissionPercentage),
          freeFeeThreshold: parseFloat(formData.freeFeeThreshold),
          lowOrderFee: parseFloat(formData.lowOrderFee),
          hubIds: formData.hubIds.length > 0 ? formData.hubIds : undefined, // Solo enviar si hay hubs seleccionados
          centralAdminEmail: formData.centralAdminEmail.trim() || undefined, // Solo enviar si hay email
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
      console.error('Error saving central:', error);
      alert('Error al guardar central');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta central?')) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/superadmin/centrals/${id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (data.success) {
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting central:', error);
      alert('Error al eliminar central');
    }
  };

  const handleOpenDeployModal = (central: Central) => {
    setSelectedCentral(central);
    setDeployData({
      hubIds: [],
      adminEmails: [],
    });
    setShowDeployModal(true);
  };

  const handleDeploy = async () => {
    if (!selectedCentral) return;
    if (deployData.hubIds.length === 0) {
      alert('Selecciona al menos un Hub');
      return;
    }

    setDeploying(true);

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

      const response = await fetch(`/api/superadmin/centrals/${selectedCentral.id}/deploy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hubIds: deployData.hubIds,
          adminEmails: deployData.adminEmails.filter((e) => e.trim()),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `✅ Despliegue exitoso!\n- Restaurantes creados: ${data.data.restaurantsCreated}\n- Productos replicados: ${data.data.replicatedProducts}`
        );
        setShowDeployModal(false);
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deploying:', error);
      alert('Error al desplegar restaurantes');
    } finally {
      setDeploying(false);
    }
  };

  const filteredCentrals = centrals.filter((central) =>
    central.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Centrales</h1>
            <p className="mt-2 text-gray-600">
              Gestiona centrales y despliega restaurantes masivamente
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nueva Central
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar centrales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
        </div>

        {/* Centrals Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCentrals.map((central) => (
            <div
              key={central.id}
              className="card rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {central.name}
                  </h3>
                  {central.legalName && (
                    <p className="mt-1 text-sm text-gray-500">
                      {central.legalName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(central)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(central.id)}
                    className="rounded p-2 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Store className="h-4 w-4" />
                  <span>
                    {central._count?.restaurants || 0} restaurantes
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>
                    {central._count?.masterProducts || 0} productos maestros
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{central._count?.users || 0} usuarios</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Comisión: {central.commissionPercentage}%</span>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => handleOpenDeployModal(central)}
                  className="btn-secondary w-full text-sm"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Desplegar
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCentrals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-4 h-16 w-16 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900">
              No hay centrales
            </h3>
            <p className="mt-2 text-gray-500">
              {searchTerm
                ? 'No se encontraron centrales con ese nombre'
                : 'Crea tu primera central para comenzar'}
            </p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCentral ? 'Editar Central' : 'Nueva Central'}
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
                    Razón Social / NIT
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) =>
                      setFormData({ ...formData, legalName: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Logo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="input w-full"
                  />
                  {uploadingLogo && (
                    <p className="mt-1 text-xs text-gray-500">
                      Subiendo logo...
                    </p>
                  )}
                  {logoPreview && (
                    <div className="mt-2">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-32 w-32 rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                  {formData.logoUrl && !logoPreview && (
                    <div className="mt-2">
                      <img
                        src={formData.logoUrl}
                        alt="Logo actual"
                        className="h-32 w-32 rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Banner
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="input w-full"
                  />
                  {uploadingBanner && (
                    <p className="mt-1 text-xs text-gray-500">
                      Subiendo banner...
                    </p>
                  )}
                  {bannerPreview && (
                    <div className="mt-2">
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="h-48 w-full rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                  {formData.bannerUrl && !bannerPreview && (
                    <div className="mt-2">
                      <img
                        src={formData.bannerUrl}
                        alt="Banner actual"
                        className="h-48 w-full rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      % Comisión *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={formData.commissionPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionPercentage: e.target.value,
                        })
                      }
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Umbral Fee Gratis (COP)
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
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Costo Fee (COP)
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
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Hubs para Desplegar Restaurantes (Opcional)
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Selecciona los Hubs donde se crearán restaurantes automáticamente. Si no seleccionas ninguno, puedes desplegar después usando el botón "Desplegar".
                  </p>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded border border-gray-200 p-3">
                    {places.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay Hubs disponibles</p>
                    ) : (
                      places.map((place) => (
                        <label
                          key={place.id}
                          className="flex items-center gap-2 rounded p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.hubIds.includes(place.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  hubIds: [...formData.hubIds, place.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  hubIds: formData.hubIds.filter(
                                    (id) => id !== place.id
                                  ),
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {place.name}
                            {place.city && (
                              <span className="text-gray-500">
                                {' '}
                                - {place.city.name}
                              </span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email del Administrador Central (Opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.centralAdminEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, centralAdminEmail: e.target.value })
                    }
                    placeholder="admin@central.com"
                    className="input w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Si el usuario no existe, se creará automáticamente con el rol de administrador de central.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Activa
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

        {/* Deploy Modal */}
        {showDeployModal && selectedCentral && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Desplegar Restaurantes
                </h2>
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="rounded p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Central:</strong> {selectedCentral.name}
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Selecciona los Hubs donde crear restaurantes. Los valores
                  financieros se heredarán de la central.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Seleccionar Hubs *
                  </label>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded border border-gray-200 p-3">
                    {places.map((place) => (
                      <label
                        key={place.id}
                        className="flex items-center gap-2 rounded p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={deployData.hubIds.includes(place.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDeployData({
                                ...deployData,
                                hubIds: [...deployData.hubIds, place.id],
                              });
                            } else {
                              setDeployData({
                                ...deployData,
                                hubIds: deployData.hubIds.filter(
                                  (id) => id !== place.id
                                ),
                              });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {place.name}
                          {place.city && (
                            <span className="text-gray-500">
                              {' '}
                              - {place.city.name}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Emails de Admins Locales (Opcional)
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Un email por línea. Se asignarán en orden a los restaurantes
                    creados.
                  </p>
                  <textarea
                    value={deployData.adminEmails.join('\n')}
                    onChange={(e) =>
                      setDeployData({
                        ...deployData,
                        adminEmails: e.target.value.split('\n'),
                      })
                    }
                    placeholder="admin1@example.com&#10;admin2@example.com"
                    className="input h-24 w-full"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeployModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeploy}
                    disabled={deploying || deployData.hubIds.length === 0}
                    className="btn-primary"
                  >
                    {deploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desplegando...
                      </>
                    ) : (
                      'Desplegar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

