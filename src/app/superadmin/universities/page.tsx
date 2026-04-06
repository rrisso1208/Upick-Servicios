/**
 * Superadmin - Universities Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Settings,
} from 'lucide-react';
import { ImageAdjuster } from '../../../components/ui/ImageAdjuster';

interface City {
  id: string;
  name: string;
  code?: string | null;
}

interface University {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  cityId?: string | null;
  city?: {
    id: string;
    name: string;
  } | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  isActive: boolean;
  _count?: {
    restaurants: number;
  };
}

export default function UniversitiesPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '',
    cityId: '',
    imageUrl: '',
    imagePosition: 'center',
    imageScale: 1.0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageAdjuster, setShowImageAdjuster] = useState(false);

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
      fetchUniversities();
      fetchCities();
    }
  }, [user, userRole, authLoading, router]);

  const fetchCities = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const response = await fetch('/api/superadmin/cities', {
        cache: 'no-store',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.cities) {
          setCities(data.data.cities);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    }
  };

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/superadmin/universities', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        console.error(
          'Failed to fetch universities:',
          response.status,
          response.statusText
        );
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        setUniversities([]);
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.universities) {
        setUniversities(data.data.universities);
        console.log('Universities loaded:', data.data.universities.length);
      } else {
        console.error('API returned unsuccessful response:', data);
        setUniversities([]);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (university?: University) => {
    if (university) {
      setEditingUniversity(university);
      setFormData({
        name: university.name,
        slug: university.slug,
        category: university.category || '',
        cityId: university.cityId || '',
        imageUrl: university.imageUrl || '',
        imagePosition: university.imagePosition || 'center',
        imageScale: university.imageScale || 1.0,
        isActive: university.isActive,
      });
      setImagePreview(university.imageUrl || null);
    } else {
      setEditingUniversity(null);
      setFormData({
        name: '',
        slug: '',
        category: '',
        cityId: '',
        imageUrl: '',
        imagePosition: 'center',
        imageScale: 1.0,
        isActive: true,
      });
      setImagePreview(null);
    }
    setShowImageAdjuster(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUniversity(null);
    setFormData({
      name: '',
      slug: '',
      category: '',
      cityId: '',
      imageUrl: '',
      imagePosition: 'center',
      imageScale: 1.0,
      isActive: true,
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
      formDataUpload.append('folder', 'universities');

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
      const url = editingUniversity
        ? `/api/superadmin/universities/${editingUniversity.id}`
        : '/api/superadmin/universities';

      const method = editingUniversity ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchUniversities();
        handleCloseModal();
        alert(
          editingUniversity
            ? 'Lugar actualizado exitosamente'
            : 'Lugar creado exitosamente'
        );
      } else {
        alert(data.error || 'Error al guardar lugar');
      }
    } catch (error) {
      console.error('Error submitting university:', error);
      alert('Error al guardar lugar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (university: University) => {
    if (university._count && university._count.restaurants > 0) {
      alert(
        `No se puede eliminar. Este lugar tiene ${university._count.restaurants} restaurante(s) asociado(s). Elimina primero los restaurantes.`
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar "${university.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/superadmin/universities/${university.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchUniversities();
        alert('Lugar eliminado exitosamente');
      } else {
        alert(data.error || 'Error al eliminar lugar');
      }
    } catch (error) {
      console.error('Error deleting university:', error);
      alert('Error al eliminar lugar');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Gestión de Lugares" showBack />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user || userRole !== 'superadmin') {
    return null;
  }

  return (
    <>
      <Header title="Gestión de Universidades" showBack />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lugares</h1>
            <p className="mt-2 text-gray-600">
              {universities.length} lugar(es) registrado(s)
            </p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Lugar
          </button>
        </div>

        {/* Universities Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <div key={university.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary-600" />
                    <h3 className="font-semibold">{university.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    /{university.slug}
                  </p>
                  {university._count && (
                    <p className="mt-2 text-sm text-gray-600">
                      {university._count.restaurants} restaurante(s)
                    </p>
                  )}
                  <div className="mt-3">
                    <span
                      className={`badge ${
                        university.isActive ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {university.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleOpenModal(university)}
                  className="btn-secondary flex-1 text-sm"
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(university)}
                  className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {universities.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No hay lugares registrados. Click en &quot;Nuevo Lugar&quot; para
            agregar uno.
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
            <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingUniversity ? 'Editar Lugar' : 'Nuevo Lugar'}
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
                      placeholder="Lugar de ejemplo"
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
                      placeholder="lugar-de-ejemplo"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="input w-full"
                      placeholder="Ej: Universidad, Centro Comercial, Plaza de Comida"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Esta categoría se usará para mostrar información de
                      domicilio (ej: "Domicilio en Centro Comercial")
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Ciudad *
                    </label>
                    <select
                      required
                      value={formData.cityId}
                      onChange={(e) =>
                        setFormData({ ...formData, cityId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">Selecciona una ciudad</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      La ciudad es obligatoria para que el lugar aparezca en los
                      filtros
                    </p>
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
                      Lugar activo
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
                      : editingUniversity
                        ? 'Actualizar'
                        : 'Crear'}
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
