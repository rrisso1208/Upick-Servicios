/**
 * Superadmin - Food Categories Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Utensils,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Save,
  Pizza,
  Beef,
  ChefHat,
  Leaf,
  IceCream,
  Coffee,
  Salad,
  Fish,
  Drumstick,
  Cake,
  CircleDot,
  Flame,
} from 'lucide-react';

interface FoodCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color: string;
  description?: string | null;
  isActive: boolean;
  sort: number;
  _count?: {
    restaurants: number;
    products: number;
  };
}

const COLOR_OPTIONS = [
  { value: 'primary', label: 'Primario', class: 'bg-primary-600' },
  { value: 'red', label: 'Rojo', class: 'bg-red-600' },
  { value: 'orange', label: 'Naranja', class: 'bg-orange-600' },
  { value: 'green', label: 'Verde', class: 'bg-green-600' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-600' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-600' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-600' },
  { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-600' },
  { value: 'brown', label: 'Marrón', class: 'bg-amber-800' },
];

const ICON_OPTIONS = [
  { value: 'pizza', label: 'Pizza', icon: Pizza },
  { value: 'hamburger', label: 'Hamburguesa', icon: Beef },
  { value: 'hamburger-logo', label: 'Hamburguesa (Logo)', icon: ChefHat },
  { value: 'sushi', label: 'Sushi (Asiática)', icon: Fish },
  { value: 'pasta', label: 'Pasta', icon: CircleDot },
  { value: 'taco', label: 'Taco (Mexicana)', icon: Flame },
  { value: 'leaf', label: 'Hoja (Saludable)', icon: Leaf },
  { value: 'utensils', label: 'Cubiertos', icon: Utensils },
  { value: 'ice-cream', label: 'Helado (Postres)', icon: IceCream },
  { value: 'coffee', label: 'Café (Bebidas)', icon: Coffee },
  { value: 'salad', label: 'Ensalada', icon: Salad },
  { value: 'fish', label: 'Pescado', icon: Fish },
  { value: 'chicken', label: 'Pollo', icon: Drumstick },
  { value: 'cake', label: 'Pastel', icon: Cake },
];

// Mapeo de valores antiguos a nuevos para compatibilidad hacia atrás
const ICON_VALUE_MAP: Record<string, string> = {
  // Si hay categorías con valores antiguos, mapearlos a los nuevos
  'utensils-pasta': 'pasta',
  'pepper-mexican': 'taco',
};

// Helper function to get icon component by name
const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return Utensils;

  // Mapear valores antiguos a nuevos si es necesario
  const mappedValue = ICON_VALUE_MAP[iconName] || iconName;

  const iconOption = ICON_OPTIONS.find((opt) => opt.value === mappedValue);
  return iconOption?.icon || Utensils;
};

export default function FoodCategoriesPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    color: 'primary',
    description: '',
    isActive: true,
    sort: 0,
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
      fetchCategories();
    }
  }, [user, userRole, authLoading, router]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/superadmin/food-categories', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: FoodCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        icon: category.icon || '',
        color: category.color,
        description: category.description || '',
        isActive: category.isActive,
        sort: category.sort,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        icon: '',
        color: 'primary',
        description: '',
        isActive: true,
        sort: 0,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      icon: '',
      color: 'primary',
      description: '',
      isActive: true,
      sort: 0,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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

      const url = editingCategory
        ? `/api/superadmin/food-categories/${editingCategory.id}`
        : '/api/superadmin/food-categories';

      const method = editingCategory ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
      };

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
        handleCloseModal();
        alert(
          editingCategory
            ? 'Categoría actualizada exitosamente'
            : 'Categoría creada exitosamente'
        );
      } else {
        alert(data.error || 'Error al guardar categoría');
      }
    } catch (error) {
      console.error('Error submitting category:', error);
      alert('Error al guardar categoría');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: FoodCategory) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar "${category.name}"? Esta acción no se puede deshacer.`
      )
    ) {
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

      const response = await fetch(
        `/api/superadmin/food-categories/${category.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
        alert('Categoría eliminada exitosamente');
      } else {
        alert(data.error || 'Error al eliminar categoría');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar categoría');
    }
  };

  return (
    <>
      <Header title="Categorías de Comida" showBack />
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
              <h1 className="text-3xl font-bold">Categorías de Comida</h1>
              <p className="mt-2 text-gray-600">
                {categories.length} categoría(s) registrada(s)
              </p>
            </div>
            <button onClick={() => handleOpenModal()} className="btn-primary">
              <Plus className="mr-2 h-5 w-5" />
              Nueva Categoría
            </button>
          </div>

          {/* Categories Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`card ${
                  !category.isActive
                    ? 'border-2 border-orange-300 opacity-60'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-3 ${
                      COLOR_OPTIONS.find((c) => c.value === category.color)
                        ?.class || 'bg-primary-600'
                    }`}
                  >
                    {(() => {
                      const IconComponent = getIconComponent(category.icon);
                      if (!IconComponent) {
                        return <Utensils className="h-6 w-6 text-white" />;
                      }
                      return <IconComponent className="h-6 w-6 text-white" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>Icono: {category.icon || 'N/A'}</span>
                      <span>•</span>
                      <span>Color: {category.color}</span>
                      <span>•</span>
                      <span>Orden: {category.sort}</span>
                    </div>
                    {category._count && (
                      <div className="mt-2 text-sm text-gray-600">
                        {category._count.restaurants} restaurante(s) •{' '}
                        {category._count.products} producto(s)
                      </div>
                    )}
                    <div className="mt-3">
                      <span
                        className={`badge ${
                          category.isActive ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {category.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="btn-secondary flex-1 text-sm"
                    title="Editar categoría"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                    title="Eliminar categoría"
                    disabled={
                      category._count &&
                      (category._count.restaurants > 0 ||
                        category._count.products > 0)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No hay categorías registradas.
            </div>
          )}
        </main>
      )}

      {/* Category Modal */}
      {showModal && formData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-2xl font-bold">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          name: e.target.value,
                          slug: formData.slug || generateSlug(e.target.value),
                        });
                      }}
                      className="input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="input w-full"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      URL amigable (ej: pizza, hamburguesa)
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Icono
                    </label>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                      {ICON_OPTIONS.map((iconOption) => {
                        const IconComponent = iconOption.icon;
                        const isSelected = formData.icon === iconOption.value;
                        if (!IconComponent) {
                          return null;
                        }
                        return (
                          <button
                            key={iconOption.value}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                icon: iconOption.value,
                              })
                            }
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                              isSelected
                                ? 'border-primary-600 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            title={iconOption.label}
                          >
                            <IconComponent
                              className={`h-5 w-5 ${
                                isSelected
                                  ? 'text-primary-600'
                                  : 'text-gray-600'
                              }`}
                            />
                            <span className="text-xs">{iconOption.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, color: color.value })
                          }
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            formData.color === color.value
                              ? 'scale-110 border-gray-900'
                              : 'border-gray-300 hover:border-gray-500'
                          } ${color.class}`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="input w-full"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Orden
                      </label>
                      <input
                        type="number"
                        value={formData.sort}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sort: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="isActive"
                        className="text-sm text-gray-700"
                      >
                        Categoría activa
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer with Buttons */}
              <div className="border-t bg-gray-50 p-6">
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
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
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
