/**
 * Central Admin - Master Menu Management
 * Replica exactamente la funcionalidad del admin/menu pero para productos maestros
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../../components/layout/Header';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Loader2,
  X,
  Utensils,
  Tag,
  ChevronUp,
  ChevronDown,
  Star,
  Settings,
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckSquare,
  Square,
  Leaf,
  Wheat,
  Heart,
  Fish,
  Milk,
  Egg,
  Flame,
  Ban,
  Dumbbell,
  Sparkles,
  Percent,
  Award,
} from 'lucide-react';
import { ImageAdjuster } from '../../../components/ui/ImageAdjuster';
import { supabase } from '../../../providers/AuthProvider';

interface MasterCategory {
  id: string;
  name: string;
  description?: string | null;
  saleHoursStart?: string | null; // HH:MM format, e.g., "08:00"
  saleHoursEnd?: string | null; // HH:MM format, e.g., "11:00"
  sort: number;
}

interface MasterProduct {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  promotionPrice?: number | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  prepMinutes: number;
  isGloballyAvailable: boolean;
  isFeatured: boolean;
  sort: number;
  masterCategoryId?: string | null;
  masterCategory?: {
    id: string;
    name: string;
    sort: number;
  } | null;
}

interface MasterOptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  required: boolean;
  sort: number;
  masterOptions: MasterOption[];
}

interface MasterOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sort: number;
}

interface Badge {
  id: string;
  name: string;
  icon?: string | null;
  color: string;
  description?: string | null;
}

// Función helper para obtener el icono de un badge
const getBadgeIcon = (badgeName: string | null | undefined): JSX.Element => {
  if (!badgeName || typeof badgeName !== 'string') {
    return <Sparkles className="h-3.5 w-3.5" />;
  }

  const iconMap: Record<string, JSX.Element> = {
    Vegano: <Leaf className="h-3.5 w-3.5" />,
    Vegetariano: <Leaf className="h-3.5 w-3.5" />,
    'Sin Gluten': <Wheat className="h-3.5 w-3.5" />,
    'Bajo en Grasas': <Heart className="h-3.5 w-3.5" />,
    'Contiene Nueces': <AlertTriangle className="h-3.5 w-3.5" />,
    'Contiene Camarones': <Fish className="h-3.5 w-3.5" />,
    'Contiene Lácteos': <Milk className="h-3.5 w-3.5" />,
    'Contiene Huevo': <Egg className="h-3.5 w-3.5" />,
    Picante: <Flame className="h-3.5 w-3.5" />,
    'Sin Azúcar': <Ban className="h-3.5 w-3.5" />,
    'Alto en Proteína': <Dumbbell className="h-3.5 w-3.5" />,
    'Rico en Fibra': <Wheat className="h-3.5 w-3.5" />,
  };

  const icon = iconMap[badgeName];
  return icon || <Sparkles className="h-3.5 w-3.5" />;
};

export default function CentralAdminMasterMenuPage() {
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MasterProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<MasterCategory | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<MasterOptionGroup[]>([]);
  const [editingOptionGroup, setEditingOptionGroup] = useState<MasterOptionGroup | null>(null);
  const [editingOption, setEditingOption] = useState<MasterOption | null>(null);
  const [showOptionGroupModal, setShowOptionGroupModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [optionGroupFormData, setOptionGroupFormData] = useState({
    name: '',
    min: 0,
    max: 1,
    required: false,
  });
  const [optionFormData, setOptionFormData] = useState({
    name: '',
    priceDelta: '',
    isDefault: false,
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    promotionPrice: '',
    masterCategoryId: '',
    prepMinutes: '10',
    imageUrl: '',
    imagePosition: 'center',
    imageScale: 1.0,
    isGloballyAvailable: true,
    isFeatured: false,
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    saleHoursStart: '',
    saleHoursEnd: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showProductImageAdjuster, setShowProductImageAdjuster] = useState(false);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [foodCategories, setFoodCategories] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      icon?: string | null;
      color: string;
    }>
  >([]);
  const [selectedProductFoodCategoryIds, setSelectedProductFoodCategoryIds] = useState<string[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string; place: { name: string } }>>([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const [productsRes, categoriesRes, badgesRes, foodCategoriesRes] = await Promise.all([
        fetch('/api/central-admin/products', {
          headers,
          credentials: 'include',
        }),
        fetch('/api/central-admin/master-categories', {
          headers,
          credentials: 'include',
        }),
        fetch('/api/central-admin/badges', {
          headers,
          credentials: 'include',
        }),
        fetch('/api/central-admin/food-categories', {
          headers,
          credentials: 'include',
        }),
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const badgesData = await badgesRes.json();
      const foodCategoriesData = await foodCategoriesRes.json();

      if (productsData.success) {
        setProducts(productsData.data.masterProducts || []);
      }

      if (categoriesData.success) {
        setCategories(categoriesData.data.categories || []);
      }

      if (badgesData.success) {
        setAvailableBadges(badgesData.data.badges || []);
      }

      if (foodCategoriesData.success) {
        setFoodCategories(foodCategoriesData.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenProductModal = async (product?: MasterProduct) => {
    if (product) {
      // Editing existing product
      setEditingProduct(product);
      setProductFormData({
        name: product.name,
        description: product.description || '',
        basePrice: (product.basePrice / 100).toString(),
        promotionPrice: product.promotionPrice
          ? (product.promotionPrice / 100).toString()
          : '',
        masterCategoryId: product.masterCategoryId || '',
        prepMinutes: product.prepMinutes.toString(),
        imageUrl: product.imageUrl || '',
        imagePosition: product.imagePosition || 'center',
        imageScale: product.imageScale || 1.0,
        isGloballyAvailable: product.isGloballyAvailable,
        isFeatured: product.isFeatured || false,
      });
      setImagePreview(product.imageUrl || null);
      setShowProductImageAdjuster(false);

      // Fetch product badges
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const response = await fetch(
          `/api/central-admin/products/${product.id}/badges`,
          {
            headers,
            credentials: 'include',
          }
        );
        const data = await response.json();
        if (data.success) {
          setSelectedBadgeIds(data.data.badges.map((b: Badge) => b.id));
        } else {
          setSelectedBadgeIds([]);
        }
      } catch (error) {
        console.error('Error fetching product badges:', error);
        setSelectedBadgeIds([]);
      }

      // Fetch product food categories
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const response = await fetch(
          `/api/central-admin/products/${product.id}/food-categories`,
          {
            headers,
            credentials: 'include',
          }
        );
        const data = await response.json();
        if (data.success) {
          setSelectedProductFoodCategoryIds(
            data.data.selectedCategoryIds || []
          );
        } else {
          setSelectedProductFoodCategoryIds([]);
        }
      } catch (error) {
        console.error('Error fetching product food categories:', error);
        setSelectedProductFoodCategoryIds([]);
      }

      // Open modal after data is loaded
      setShowProductModal(true);
    } else {
      // Creating new product
      if (categories.length === 0) {
        alert(
          'Por favor crea al menos una categoría antes de agregar productos.'
        );
        return;
      }
      setEditingProduct(null);
      setProductFormData({
        name: '',
        description: '',
        basePrice: '',
        promotionPrice: '',
        masterCategoryId: categories[0]?.id || '',
        prepMinutes: '10',
        imageUrl: '',
        imagePosition: 'center',
        imageScale: 1.0,
        isGloballyAvailable: true,
        isFeatured: false,
      });
      setImagePreview(null);
      setShowProductImageAdjuster(false);
      setSelectedBadgeIds([]);
      setSelectedProductFoodCategoryIds([]);

      // Open modal immediately for new product
      setShowProductModal(true);
    }
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductFormData({
      name: '',
      description: '',
      basePrice: '',
      promotionPrice: '',
      masterCategoryId: '',
      prepMinutes: '10',
      imageUrl: '',
      imagePosition: 'center',
      imageScale: 1.0,
      isGloballyAvailable: true,
      isFeatured: false,
    });
    setImagePreview(null);
    setSelectedBadgeIds([]);
    setSelectedProductFoodCategoryIds([]);
    setShowProductImageAdjuster(false);
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
      formDataUpload.append('folder', 'products');

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
        setProductFormData({
          ...productFormData,
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

  const handleOpenCategoryModal = (category?: MasterCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        saleHoursStart: category.saleHoursStart || '',
        saleHoursEnd: category.saleHoursEnd || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: '',
        saleHoursStart: '',
        saleHoursEnd: '',
      });
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      description: '',
      saleHoursStart: '',
      saleHoursEnd: '',
    });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const url = editingProduct
        ? `/api/central-admin/products/${editingProduct.id}`
        : '/api/central-admin/products';

      const method = editingProduct ? 'PATCH' : 'POST';

      // Validate required fields before sending
      if (!productFormData.masterCategoryId) {
        alert('Por favor selecciona una categoría');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...productFormData,
        basePrice: parseFloat(productFormData.basePrice), // Backend converts to cents
        promotionPrice: productFormData.promotionPrice
          ? parseFloat(productFormData.promotionPrice)
          : null,
        prepMinutes: parseInt(productFormData.prepMinutes) || 10,
        isFeatured: productFormData.isFeatured,
      };

      console.log('Submitting product:', payload);

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', {
          status: response.status,
          data,
        });
        alert(data.error || data.details || 'Error al guardar producto');
        setSubmitting(false);
        return;
      }

      if (data.success) {
        const productId = editingProduct
          ? editingProduct.id
          : data.data?.id || data.data?.product?.id;

        // Update badges
        try {
          const badgeHeaders: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (session?.access_token) {
            badgeHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          const badgeResponse = await fetch(
            `/api/central-admin/products/${productId}/badges`,
            {
              method: 'PUT',
              headers: badgeHeaders,
              credentials: 'include',
              body: JSON.stringify({ badgeIds: selectedBadgeIds }),
            }
          );

          const badgeData = await badgeResponse.json();
          if (!badgeData.success) {
            console.error('Error updating badges:', badgeData.error);
          }
        } catch (error) {
          console.error('Error updating badges:', error);
        }

        // Update food categories
        try {
          const categoryHeaders: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (session?.access_token) {
            categoryHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          const categoryResponse = await fetch(
            `/api/central-admin/products/${productId}/food-categories`,
            {
              method: 'PUT',
              headers: categoryHeaders,
              credentials: 'include',
              body: JSON.stringify({
                categoryIds: selectedProductFoodCategoryIds,
              }),
            }
          );

          const categoryData = await categoryResponse.json();
          if (!categoryData.success) {
            console.error(
              'Error updating food categories:',
              categoryData.error
            );
          }
        } catch (error) {
          console.error('Error updating food categories:', error);
        }

        fetchData(); // Refresh data
        handleCloseProductModal();
        alert(
          editingProduct
            ? 'Producto actualizado exitosamente'
            : 'Producto creado exitosamente'
        );
      } else {
        alert(data.error || data.details || 'Error al guardar producto');
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      alert('Error al guardar producto. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Validate time format if provided
      if (
        categoryFormData.saleHoursStart &&
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
          categoryFormData.saleHoursStart
        )
      ) {
        alert(
          'Formato de hora de inicio inválido. Use formato HH:MM (24 horas)'
        );
        setSubmitting(false);
        return;
      }
      if (
        categoryFormData.saleHoursEnd &&
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(categoryFormData.saleHoursEnd)
      ) {
        alert('Formato de hora de fin inválido. Use formato HH:MM (24 horas)');
        setSubmitting(false);
        return;
      }

      // Validate that end time is after start time if both are provided
      if (categoryFormData.saleHoursStart && categoryFormData.saleHoursEnd) {
        const [startHour, startMin] = categoryFormData.saleHoursStart
          .split(':')
          .map(Number);
        const [endHour, endMin] = categoryFormData.saleHoursEnd
          .split(':')
          .map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          alert('La hora de fin debe ser posterior a la hora de inicio');
          setSubmitting(false);
          return;
        }
      }

      const url = editingCategory
        ? `/api/central-admin/master-categories/${editingCategory.id}`
        : '/api/central-admin/master-categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const payload = {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        saleHoursStart: categoryFormData.saleHoursStart || null,
        saleHoursEnd: categoryFormData.saleHoursEnd || null,
      };

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        fetchData(); // Refresh data
        handleCloseCategoryModal();
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
      alert('Error al crear categoría');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: MasterProduct) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
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

      const response = await fetch(`/api/central-admin/products/${product.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchData(); // Refresh data
        alert('Producto eliminado exitosamente');
      } else {
        alert(data.error || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  };

  const toggleActive = async (productId: string, currentStatus: boolean) => {
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

      const response = await fetch(`/api/central-admin/products/${productId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ isGloballyAvailable: !currentStatus }),
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to toggle product:', error);
    }
  };

  const handleReorderCategory = async (
    categoryId: string,
    direction: 'up' | 'down'
  ) => {
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

      console.log('Reordering category:', { categoryId, direction });

      const response = await fetch('/api/central-admin/master-categories/reorder', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ categoryId, direction }),
      });

      const data = await response.json();
      console.log('Reorder response:', data);

      if (response.ok && data.success) {
        fetchData(); // Refresh data
        console.log('Categories refreshed');
      } else {
        console.error('Reorder failed:', data);
        alert(data.error || 'Error al actualizar orden');
      }
    } catch (error) {
      console.error('Failed to reorder category:', error);
      alert('Error al actualizar orden');
    }
  };

  const handleReorderProduct = async (
    productId: string,
    direction: 'up' | 'down'
  ) => {
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

      // Get current product's category
      const product = products.find((p) => p.id === productId);
      if (!product || !product.masterCategoryId) return;

      // Get products in same category sorted
      const categoryProducts = products
        .filter((p) => p.masterCategoryId === product.masterCategoryId)
        .sort((a, b) => a.sort - b.sort);
      
      const currentIndex = categoryProducts.findIndex((p) => p.id === productId);
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= categoryProducts.length) return;

      // Swap sorts
      const productIds = categoryProducts.map((p) => p.id);
      const temp = productIds[currentIndex];
      productIds[currentIndex] = productIds[targetIndex];
      productIds[targetIndex] = temp;

      const response = await fetch('/api/central-admin/products/reorder', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ productIds, masterCategoryId: product.masterCategoryId }),
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        const data = await response.json();
        alert(data.error || 'Error al actualizar orden');
      }
    } catch (error) {
      console.error('Failed to reorder product:', error);
      alert('Error al actualizar orden');
    }
  };

  const handleOpenOptionsModal = async (product: MasterProduct) => {
    setCurrentProductId(product.id);
    setEditingProduct(product);
    await fetchOptionGroups(product.id);
    setShowOptionsModal(true);
  };

  const fetchOptionGroups = async (productId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/central-admin/products/${productId}/options`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success || Array.isArray(data)) {
        setOptionGroups(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch option groups:', error);
    }
  };

  const handleOpenOptionGroupModal = (group?: MasterOptionGroup) => {
    if (group) {
      setEditingOptionGroup(group);
      setOptionGroupFormData({
        name: group.name,
        min: group.min,
        max: group.max,
        required: group.required,
      });
    } else {
      setEditingOptionGroup(null);
      setOptionGroupFormData({
        name: '',
        min: 0,
        max: 1,
        required: false,
      });
    }
    setShowOptionGroupModal(true);
  };

  const handleSubmitOptionGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProductId) return;

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

      const url = editingOptionGroup
        ? `/api/central-admin/products/${currentProductId}/options/${editingOptionGroup.id}`
        : `/api/central-admin/products/${currentProductId}/options`;

      const method = editingOptionGroup ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(optionGroupFormData),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        await fetchOptionGroups(currentProductId);
        setShowOptionGroupModal(false);
        setEditingOptionGroup(null);
      } else {
        alert(data.error || 'Error al guardar especificación');
      }
    } catch (error) {
      console.error('Error submitting option group:', error);
      alert('Error al guardar especificación');
    }
  };

  const handleDeleteOptionGroup = async (groupId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta especificación?')) {
      return;
    }

    if (!currentProductId) return;

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
        `/api/central-admin/products/${currentProductId}/options/${groupId}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        await fetchOptionGroups(currentProductId);
      } else {
        alert(data.error || 'Error al eliminar especificación');
      }
    } catch (error) {
      console.error('Error deleting option group:', error);
      alert('Error al eliminar especificación');
    }
  };

  const handleOpenOptionModal = (groupId: string, option?: MasterOption) => {
    if (option) {
      setEditingOption(option);
      setOptionFormData({
        name: option.name,
        priceDelta: (option.priceDelta / 100).toString(),
        isDefault: option.isDefault,
      });
    } else {
      setEditingOption(null);
      setOptionFormData({
        name: '',
        priceDelta: '',
        isDefault: false,
      });
    }
    setCurrentGroupId(groupId);
    setShowOptionModal(true);
  };

  const handleSubmitOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroupId || !editingProduct?.id) return;

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

      const productId = editingProduct.id;

      const url = editingOption
        ? `/api/central-admin/products/${productId}/options/${currentGroupId}/options/${editingOption.id}`
        : `/api/central-admin/products/${productId}/options/${currentGroupId}/options`;

      const method = editingOption ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: optionFormData.name,
          priceDelta: optionFormData.priceDelta
            ? parseFloat(optionFormData.priceDelta) * 100
            : 0,
          isDefault: optionFormData.isDefault,
        }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        await fetchOptionGroups(productId);
        setShowOptionModal(false);
        setEditingOption(null);
        setCurrentGroupId(null);
      } else {
        alert(data.error || 'Error al guardar opción');
      }
    } catch (error) {
      console.error('Error submitting option:', error);
      alert('Error al guardar opción');
    }
  };

  const handleDeleteOption = async (groupId: string, optionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta opción?')) {
      return;
    }

    if (!editingProduct?.id) return;

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
        `/api/central-admin/products/${editingProduct.id}/options/${groupId}/options/${optionId}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        await fetchOptionGroups(editingProduct.id);
      } else {
        alert(data.error || 'Error al eliminar opción');
      }
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Error al eliminar opción');
    }
  };

  const handleDeleteCategory = async (category: MasterCategory) => {
    if (!confirm(`¿Estás seguro de eliminar "${category.name}"?`)) {
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
        `/api/central-admin/master-categories/${category.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchData(); // Refresh data
        alert('Categoría eliminada exitosamente');
      } else {
        alert(data.error || 'Error al eliminar categoría');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar categoría');
    }
  };

  const handleReorderOptionGroup = async (
    groupId: string,
    direction: 'up' | 'down'
  ) => {
    if (!currentProductId) return;

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

      // Get current groups sorted
      const sortedGroups = [...optionGroups].sort((a, b) => a.sort - b.sort);
      const currentIndex = sortedGroups.findIndex((g) => g.id === groupId);
      
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sortedGroups.length) return;

      // Swap sorts
      const optionGroupIds = sortedGroups.map((g) => g.id);
      const temp = optionGroupIds[currentIndex];
      optionGroupIds[currentIndex] = optionGroupIds[targetIndex];
      optionGroupIds[targetIndex] = temp;

      const response = await fetch(
        `/api/central-admin/products/${currentProductId}/options/${groupId}/reorder`,
        {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ optionGroupIds }),
        }
      );

      const data = await response.json();
      if (data.success || response.ok) {
        await fetchOptionGroups(currentProductId);
      } else {
        alert(data.error || 'Error al reordenar especificación');
      }
    } catch (error) {
      console.error('Failed to reorder option group:', error);
      alert('Error al reordenar especificación');
    }
  };

  const handleReorderOption = async (
    groupId: string,
    optionId: string,
    direction: 'up' | 'down'
  ) => {
    if (!currentProductId) return;

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

      // Get current group
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return;

      // Get options sorted
      const sortedOptions = [...group.masterOptions].sort((a, b) => a.sort - b.sort);
      const currentIndex = sortedOptions.findIndex((o) => o.id === optionId);
      
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sortedOptions.length) return;

      // Swap sorts
      const optionIds = sortedOptions.map((o) => o.id);
      const temp = optionIds[currentIndex];
      optionIds[currentIndex] = optionIds[targetIndex];
      optionIds[targetIndex] = temp;

      const response = await fetch(
        `/api/central-admin/products/${currentProductId}/options/${groupId}/options/${optionId}/reorder`,
        {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ optionIds }),
        }
      );

      const data = await response.json();
      if (data.success || response.ok) {
        await fetchOptionGroups(currentProductId);
      } else {
        alert(data.error || 'Error al reordenar opción');
      }
    } catch (error) {
      console.error('Failed to reorder option:', error);
      alert('Error al reordenar opción');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Menú Maestro" />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  const handleOpenSyncModal = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Obtener restaurantes de la central
      const response = await fetch('/api/central-admin/restaurants', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setRestaurants(data.data.restaurants || []);
        setSelectedRestaurantIds([]); // Inicializar sin selección
        setSyncResult(null);
        setShowSyncModal(true);
      } else {
        alert('Error al obtener restaurantes: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error opening sync modal:', error);
      alert('Error al abrir modal de sincronización');
    }
  };

  const handleCloseSyncModal = () => {
    setShowSyncModal(false);
    setSelectedRestaurantIds([]);
    setSyncResult(null);
  };

  const handleToggleRestaurant = (restaurantId: string) => {
    setSelectedRestaurantIds((prev) => {
      if (prev.includes(restaurantId)) {
        return prev.filter((id) => id !== restaurantId);
      } else {
        return [...prev, restaurantId];
      }
    });
  };

  const handleSelectAllRestaurants = () => {
    if (selectedRestaurantIds.length === restaurants.length) {
      setSelectedRestaurantIds([]);
    } else {
      setSelectedRestaurantIds(restaurants.map((r) => r.id));
    }
  };

  const handleSyncMenu = async () => {
    setSyncing(true);
    setSyncResult(null);

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

      const response = await fetch('/api/central-admin/sync-menu', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          restaurantIds: selectedRestaurantIds.length > 0 ? selectedRestaurantIds : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncResult(data.data);
        // Opcional: refrescar datos después de sincronizar
        // fetchData();
      } else {
        alert('Error al sincronizar: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error syncing menu:', error);
      alert('Error al sincronizar menú');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Header title="Menú Maestro" />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Menú Maestro</h1>
            <p className="mt-2 text-gray-600">
              {products.length} producto(s) en tu menú maestro
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenSyncModal}
              className="btn-secondary"
              type="button"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Actualizar Menús
            </button>
            <button
              onClick={() => handleOpenCategoryModal()}
              className="btn-secondary"
            >
              <Tag className="mr-2 h-5 w-5" />
              Nueva Categoría
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleOpenProductModal();
              }}
              className="btn-primary"
              type="button"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Categories with Reorder */}
        {categories.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Categorías</h2>
            <div className="flex flex-wrap gap-2">
              {categories
                .slice()
                .sort((a, b) => a.sort - b.sort)
                .map((cat, index) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1 rounded-full bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700"
                  >
                    <span>{cat.name}</span>
                    {(cat.saleHoursStart || cat.saleHoursEnd) && (
                      <span className="ml-2 text-xs text-primary-600">
                        ({cat.saleHoursStart || '00:00'} -{' '}
                        {cat.saleHoursEnd || '23:59'})
                      </span>
                    )}
                    <div className="ml-2 flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCategoryModal(cat)}
                        className="rounded p-1 hover:bg-primary-200"
                        title="Editar categoría"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleReorderCategory(cat.id, 'up')}
                          disabled={index === 0}
                          className="disabled:opacity-30"
                          title="Mover arriba"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleReorderCategory(cat.id, 'down')}
                          disabled={index === categories.length - 1}
                          className="disabled:opacity-30"
                          title="Mover abajo"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="rounded p-1 hover:bg-red-100 hover:text-red-600"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Special Categories: Promociones and Productos Destacados */}
        {/* Promociones Section */}
        {(() => {
          const promotionalProducts = products.filter(
            (p) => p.promotionPrice && p.promotionPrice < p.basePrice && p.isGloballyAvailable
          );
          
          if (promotionalProducts.length === 0) return null;
          
          return (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-6 w-6 text-red-600" />
                  <h2 className="text-xl font-semibold">Promociones</h2>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {promotionalProducts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowPromotionsModal(true)}
                  className="btn-secondary text-sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gestionar
                </button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
                  {promotionalProducts.map((product) => (
                    <div key={product.id} className="card min-w-[280px] flex-shrink-0">
                      {product.imageUrl && (
                        <div className="mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-gray-600">
                            {product.masterCategory?.name || 'Sin categoría'}
                          </p>
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-lg font-bold text-red-600">
                              ${((product.promotionPrice! / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            </p>
                            <p className="text-sm font-medium text-gray-400 line-through">
                              ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            </p>
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Promoción
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductModal(product);
                          }}
                          className="btn-secondary w-full text-xs"
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Productos Destacados Section */}
        {(() => {
          const featuredProducts = products.filter(
            (p) => p.isFeatured && p.isGloballyAvailable
          );
          
          if (featuredProducts.length === 0) return null;
          
          return (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-yellow-600" />
                  <h2 className="text-xl font-semibold">Productos Destacados</h2>
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    {featuredProducts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowFeaturedModal(true)}
                  className="btn-secondary text-sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gestionar
                </button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="card min-w-[280px] flex-shrink-0">
                      {product.imageUrl && (
                        <div className="mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{product.name}</h3>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <p className="text-sm text-gray-600">
                            {product.masterCategory?.name || 'Sin categoría'}
                          </p>
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {product.promotionPrice ? (
                              <>
                                <p className="text-lg font-bold text-red-600">
                                  ${((product.promotionPrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                </p>
                                <p className="text-sm font-medium text-gray-400 line-through">
                                  ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                </p>
                              </>
                            ) : (
                              <p className="text-lg font-bold text-primary-600">
                                ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductModal(product);
                          }}
                          className="btn-secondary w-full text-xs"
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Products Grid - Grouped by Category */}
        {categories
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((category) => {
            const categoryProducts = products.filter(
              (p) => p.masterCategoryId === category.id
            );
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">{category.name}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryProducts
                    .slice()
                    .sort((a, b) => a.sort - b.sort)
                    .map((product, productIndex) => (
                    <div key={product.id} className="card">
                      {product.imageUrl && (
                        <div className="mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{product.name}</h3>
                            {product.isFeatured && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {category.name}
                          </p>
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {product.promotionPrice ? (
                              <>
                                <p className="text-lg font-bold text-red-600">
                                  $
                                  {((product.promotionPrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                </p>
                                <p className="text-sm font-medium text-gray-400 line-through">
                                  ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                </p>
                                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                  Promoción
                                </span>
                              </>
                            ) : (
                              <p className="text-lg font-bold text-primary-600">
                                ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              </p>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Tiempo: {product.prepMinutes} min
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`badge ${product.isGloballyAvailable ? 'badge-success' : 'badge-error'
                              }`}
                          >
                            {product.isGloballyAvailable ? 'Disponible' : 'No disponible (Pánico)'}
                          </span>

                          <div className="flex flex-col">
                            <button
                              onClick={() =>
                                handleReorderProduct(product.id, 'up')
                              }
                              disabled={productIndex === 0}
                              className="disabled:opacity-30"
                              title="Mover arriba"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleReorderProduct(product.id, 'down')
                              }
                              disabled={
                                productIndex === categoryProducts.length - 1
                              }
                              className="disabled:opacity-30"
                              title="Mover abajo"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              toggleActive(product.id, product.isGloballyAvailable)
                            }
                            className={`btn-secondary px-2 py-1 text-xs ${!product.isGloballyAvailable ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}`}
                            title={product.isGloballyAvailable ? 'Desactivar (Botón de Pánico)' : 'Activar'}
                          >
                            {product.isGloballyAvailable ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOptionsModal(product);
                            }}
                            className="btn-secondary px-2 py-1 text-xs"
                            title="Gestionar especificaciones"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProductModal(product);
                            }}
                            className="btn-secondary px-2 py-1 text-xs"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product);
                            }}
                            className="btn-secondary px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        {products.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            {categories.length === 0 ? (
              <>
                <p className="mb-4">No hay categorías ni productos.</p>
                <p className="text-sm">
                  Primero crea una categoría, luego agrega productos.
                </p>
              </>
            ) : (
              <p>
                No hay productos en el menú. Click en &quot;Nuevo Producto&quot;
                para agregar.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Product Modal - Continuation in next part due to length */}
      {/* Due to file size limits, I'll continue with the modals in a follow-up edit */}
      
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button
                onClick={handleCloseCategoryModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Bebidas"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: e.target.value,
                    })
                  }
                  className="input w-full"
                  rows={2}
                  placeholder="Bebidas frías y calientes"
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Horario de Venta (Opcional)
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Define en qué horario se pueden vender los productos de esta
                  categoría. Ejemplo: Desayunos hasta las 11:00 AM, Almuerzos
                  hasta las 2:00 PM.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Disponible desde
                    </label>
                    <input
                      type="time"
                      value={categoryFormData.saleHoursStart}
                      onChange={(e) =>
                        setCategoryFormData({
                          ...categoryFormData,
                          saleHoursStart: e.target.value,
                        })
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Disponible hasta
                    </label>
                    <input
                      type="time"
                      value={categoryFormData.saleHoursEnd}
                      onChange={(e) =>
                        setCategoryFormData({
                          ...categoryFormData,
                          saleHoursEnd: e.target.value,
                        })
                      }
                      className="input w-full"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Deja vacío para que esté disponible todo el día
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseCategoryModal}
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
                    : editingCategory
                      ? 'Actualizar Categoría'
                      : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white">
            <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
              <h2 className="text-2xl font-bold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={handleCloseProductModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              id="product-form"
              onSubmit={handleSubmitProduct}
              className="flex-1 space-y-4 overflow-y-auto p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={productFormData.name}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        name: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="Hamburguesa Clásica"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Categoría *
                  </label>
                  <select
                    required
                    value={productFormData.masterCategoryId}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        masterCategoryId: e.target.value,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={productFormData.description}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      description: e.target.value,
                    })
                  }
                  className="input w-full"
                  rows={3}
                  placeholder="Deliciosa hamburguesa con..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Precio (COP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={productFormData.basePrice}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          basePrice: e.target.value,
                        })
                      }
                      className="input w-full pl-8"
                      placeholder="15.99"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Precio Promocional (COP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productFormData.promotionPrice}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          promotionPrice: e.target.value,
                        })
                      }
                      className="input w-full pl-8"
                      placeholder="12.99 (opcional)"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Si se establece, se mostrará como precio promocional
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tiempo Prep (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productFormData.prepMinutes}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        prepMinutes: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="10"
                  />
                </div>
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
                          objectPosition:
                            productFormData.imagePosition || 'center',
                          transform: `scale(${productFormData.imageScale || 1.0})`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowProductImageAdjuster(!showProductImageAdjuster)
                      }
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      {showProductImageAdjuster
                        ? 'Ocultar ajustador'
                        : 'Ajustar imagen'}
                    </button>
                    {showProductImageAdjuster && imagePreview && (
                      <div className="border-t pt-3">
                        <ImageAdjuster
                          imageUrl={imagePreview}
                          initialPosition={
                            productFormData.imagePosition || 'center'
                          }
                          initialScale={productFormData.imageScale || 1.0}
                          onPositionChange={(position) => {
                            setProductFormData({
                              ...productFormData,
                              imagePosition: position || 'center',
                            });
                          }}
                          onScaleChange={(scale) => {
                            setProductFormData({
                              ...productFormData,
                              imageScale: scale || 1.0,
                            });
                          }}
                          containerWidth={400}
                          containerHeight={300}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isGloballyAvailable"
                      checked={productFormData.isGloballyAvailable}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          isGloballyAvailable: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isGloballyAvailable" className="text-sm font-medium text-red-900">
                      Disponible globalmente (Botón de Pánico)
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-red-700">
                    ⚠️ Si desactivas esta opción, el producto se ocultará en TODAS las tiendas de forma inmediata. Úsalo con precaución.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={productFormData.isFeatured}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="isFeatured"
                    className="flex items-center gap-1 text-sm text-gray-700"
                  >
                    <Star className="h-4 w-4 text-yellow-400" />
                    Producto destacado
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Categorías de Comida *
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Selecciona las categorías que mejor describen este producto
                  (ej: Pizza, Hamburguesa, Saludable). Estas categorías ayudan a
                  los clientes a encontrar tu restaurante y productos.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(foodCategories) && foodCategories.length > 0
                    ? foodCategories.map((category) => {
                      if (!category || !category.id || !category.name) {
                        return null;
                      }
                      const isSelected =
                        selectedProductFoodCategoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProductFoodCategoryIds(
                                selectedProductFoodCategoryIds.filter(
                                  (id) => id !== category.id
                                )
                              );
                            } else {
                              setSelectedProductFoodCategoryIds([
                                ...selectedProductFoodCategoryIds,
                                category.id,
                              ]);
                            }
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${isSelected
                            ? 'border-primary-500 bg-primary-100 text-primary-700'
                            : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {category.name}
                        </button>
                      );
                    })
                    : null}
                </div>
                {(!Array.isArray(foodCategories) ||
                  foodCategories.length === 0) && (
                    <p className="text-sm text-gray-500">
                      No hay categorías disponibles
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Medallas
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableBadges.length > 0
                    ? availableBadges
                      .filter((badge) => badge && badge.id && badge.name)
                      .map((badge) => {
                        const isSelected = selectedBadgeIds.includes(
                          badge.id
                        );

                        const colorClasses = {
                          green: isSelected
                            ? 'bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white shadow-md shadow-green-200'
                            : 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-700 hover:from-green-100 hover:to-green-200',
                          blue: isSelected
                            ? 'bg-gradient-to-r from-blue-400 to-blue-500 border-blue-600 text-white shadow-md shadow-blue-200'
                            : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700 hover:from-blue-100 hover:to-blue-200',
                          red: isSelected
                            ? 'bg-gradient-to-r from-red-400 to-red-500 border-red-600 text-white shadow-md shadow-red-200'
                            : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-700 hover:from-red-100 hover:to-red-200',
                          orange: isSelected
                            ? 'bg-gradient-to-r from-orange-400 to-orange-500 border-orange-600 text-white shadow-md shadow-orange-200'
                            : 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 text-orange-700 hover:from-orange-100 hover:to-orange-200',
                          purple: isSelected
                            ? 'bg-gradient-to-r from-purple-400 to-purple-500 border-purple-600 text-white shadow-md shadow-purple-200'
                            : 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 text-purple-700 hover:from-purple-100 hover:to-purple-200',
                          yellow: isSelected
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-600 text-white shadow-md shadow-yellow-200'
                            : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-700 hover:from-yellow-100 hover:to-yellow-200',
                        };

                        const badgeColor =
                          badge.color as keyof typeof colorClasses;
                        const badgeClasses =
                          colorClasses[badgeColor] || colorClasses.green;

                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBadgeIds(
                                  selectedBadgeIds.filter(
                                    (id) => id !== badge.id
                                  )
                                );
                              } else {
                                setSelectedBadgeIds([
                                  ...selectedBadgeIds,
                                  badge.id,
                                ]);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${badgeClasses
                              } ${isSelected ? 'scale-105 ring-2 ring-offset-1' : 'hover:scale-102'}`}
                            title={badge.description || badge.name || ''}
                          >
                            {getBadgeIcon(badge.name) || (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            <span>{badge.name}</span>
                          </button>
                        );
                      })
                    : null}
                </div>
                {availableBadges.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No hay medallas disponibles
                  </p>
                )}
              </div>
            </form>

            <div className="flex flex-shrink-0 gap-3 border-t bg-gray-50 p-6">
              <button
                type="button"
                onClick={handleCloseProductModal}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById(
                    'product-form'
                  ) as HTMLFormElement;
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                className="btn-primary flex-1"
                disabled={submitting}
              >
                {submitting
                  ? 'Guardando...'
                  : editingProduct
                    ? 'Actualizar'
                    : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Management Modal */}
      {showOptionsModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white">
            <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
              <h2 className="text-2xl font-bold">
                Especificaciones: {editingProduct.name}
              </h2>
              <button
                onClick={() => {
                  setShowOptionsModal(false);
                  setEditingProduct(null);
                  setCurrentProductId(null);
                  setOptionGroups([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Agrega especificaciones como término de la carne,
                  acompañamientos, etc.
                </p>
                <button
                  onClick={() => handleOpenOptionGroupModal()}
                  className="btn-primary text-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Especificación
                </button>
              </div>

              {optionGroups.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Settings className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p>No hay especificaciones configuradas</p>
                  <p className="mt-2 text-sm">
                    Agrega especificaciones para que los clientes puedan
                    personalizar este producto
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {optionGroups
                    .slice()
                    .sort((a, b) => a.sort - b.sort)
                    .map((group, groupIndex) => (
                    <div key={group.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {group.name}
                          </h3>
                          <div className="mt-1 text-sm text-gray-600">
                            <span>
                              Selección:{' '}
                              {group.min === group.max
                                ? `${group.max} opción`
                                : `${group.min}-${group.max} opciones`}
                            </span>
                            {group.required && (
                              <span className="ml-2 text-red-600">
                                (Requerido)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleReorderOptionGroup(group.id, 'up')}
                              disabled={groupIndex === 0}
                              className="disabled:opacity-30"
                              title="Mover especificación arriba"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleReorderOptionGroup(group.id, 'down')}
                              disabled={groupIndex === optionGroups.length - 1}
                              className="disabled:opacity-30"
                              title="Mover especificación abajo"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleOpenOptionGroupModal(group)}
                            className="btn-secondary text-sm"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOptionGroup(group.id)}
                            className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Opciones:
                          </span>
                          <button
                            onClick={() => handleOpenOptionModal(group.id)}
                            className="btn-secondary text-xs"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Agregar Opción
                          </button>
                        </div>

                        {group.masterOptions.length === 0 ? (
                          <p className="py-2 text-sm text-gray-500">
                            No hay opciones. Agrega al menos una opción.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {group.masterOptions
                              .slice()
                              .sort((a, b) => a.sort - b.sort)
                              .map((option, optionIndex) => (
                              <div
                                key={option.id}
                                className="flex items-center justify-between rounded bg-gray-50 p-2"
                              >
                                <div className="flex-1">
                                  <span className="font-medium">
                                    {option.name}
                                  </span>
                                  {option.priceDelta !== 0 && (
                                    <span className="ml-2 text-sm text-gray-600">
                                      {option.priceDelta > 0 ? '+' : ''}$
                                      {(
                                        option.priceDelta / 100
                                      ).toLocaleString()}
                                    </span>
                                  )}
                                  {option.priceDelta === 0 && (
                                    <span className="ml-2 text-xs text-green-600">
                                      (Incluido)
                                    </span>
                                  )}
                                  {option.isDefault && (
                                    <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                      Por defecto
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => handleReorderOption(group.id, option.id, 'up')}
                                      disabled={optionIndex === 0}
                                      className="disabled:opacity-30"
                                      title="Mover opción arriba"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleReorderOption(group.id, option.id, 'down')}
                                      disabled={optionIndex === group.masterOptions.length - 1}
                                      className="disabled:opacity-30"
                                      title="Mover opción abajo"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleOpenOptionModal(group.id, option)
                                    }
                                    className="btn-secondary text-xs"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteOption(group.id, option.id)
                                    }
                                    className="btn-secondary text-xs text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Option Group Modal */}
      {showOptionGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingOptionGroup
                  ? 'Editar Especificación'
                  : 'Nueva Especificación'}
              </h2>
              <button
                onClick={() => {
                  setShowOptionGroupModal(false);
                  setEditingOptionGroup(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitOptionGroup} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre de la Especificación *
                </label>
                <input
                  type="text"
                  required
                  value={optionGroupFormData.name}
                  onChange={(e) =>
                    setOptionGroupFormData({
                      ...optionGroupFormData,
                      name: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Ej: Término de la carne, Acompañamientos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={optionGroupFormData.min}
                    onChange={(e) =>
                      setOptionGroupFormData({
                        ...optionGroupFormData,
                        min: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Máximo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={optionGroupFormData.max}
                    onChange={(e) =>
                      setOptionGroupFormData({
                        ...optionGroupFormData,
                        max: parseInt(e.target.value) || 1,
                      })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={optionGroupFormData.required}
                  onChange={(e) =>
                    setOptionGroupFormData({
                      ...optionGroupFormData,
                      required: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="required" className="text-sm text-gray-700">
                  Requerido (el cliente debe seleccionar al menos una opción)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionGroupModal(false);
                    setEditingOptionGroup(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingOptionGroup ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingOption ? 'Editar Opción' : 'Nueva Opción'}
              </h2>
              <button
                onClick={() => {
                  setShowOptionModal(false);
                  setEditingOption(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitOption} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre de la Opción *
                </label>
                <input
                  type="text"
                  required
                  value={optionFormData.name}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      name: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Ej: Término medio, Papas fritas"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Precio Adicional (COP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={optionFormData.priceDelta}
                    onChange={(e) =>
                      setOptionFormData({
                        ...optionFormData,
                        priceDelta: e.target.value,
                      })
                    }
                    className="input w-full pl-8"
                    placeholder="0.00 (dejar en 0 si viene incluido)"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Deja en 0 si esta opción viene incluida con el producto
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={optionFormData.isDefault}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      isDefault: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Opción por defecto (seleccionada automáticamente)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionModal(false);
                    setEditingOption(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingOption ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promociones Management Modal */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-6 w-6 text-red-600" />
                <h2 className="text-2xl font-bold">Gestionar Promociones</h2>
              </div>
              <button
                onClick={() => setShowPromotionsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Los productos con precio de promoción aparecerán automáticamente en esta sección.
              Para agregar una promoción, edita el producto y establece un precio de promoción.
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold">Productos con Promoción Activa</h3>
              {products.filter(p => p.promotionPrice && p.promotionPrice < p.basePrice).length === 0 ? (
                <p className="text-sm text-gray-500">No hay productos con promoción activa</p>
              ) : (
                <div className="space-y-2">
                  {products
                    .filter(p => p.promotionPrice && p.promotionPrice < p.basePrice)
                    .map((product) => (
                      <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm font-bold text-red-600">
                              ${((product.promotionPrice! / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              ${((product.basePrice / 100).toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleOpenProductModal(product);
                            setShowPromotionsModal(false);
                          }}
                          className="btn-secondary text-xs"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Featured Products Management Modal */}
      {showFeaturedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-600" />
                <h2 className="text-2xl font-bold">Gestionar Productos Destacados</h2>
              </div>
              <button
                onClick={() => setShowFeaturedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Selecciona los productos que quieres destacar. Estos aparecerán en la sección de productos destacados.
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold">Todos los Productos</h3>
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">No hay productos disponibles</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={product.isFeatured}
                          onChange={async (e) => {
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

                              const response = await fetch(`/api/central-admin/products/${product.id}`, {
                                method: 'PATCH',
                                headers,
                                credentials: 'include',
                                body: JSON.stringify({
                                  isFeatured: e.target.checked,
                                }),
                              });

                              const data = await response.json();
                              if (data.success) {
                                fetchData();
                              } else {
                                alert(data.error || 'Error al actualizar producto');
                              }
                            } catch (error) {
                              console.error('Error updating featured status:', error);
                              alert('Error al actualizar producto');
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.masterCategory?.name || 'Sin categoría'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleOpenProductModal(product);
                          setShowFeaturedModal(false);
                        }}
                        className="btn-secondary text-xs"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Menu Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Actualizar Menús de Restaurantes
              </h2>
              <button
                onClick={handleCloseSyncModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Selecciona los restaurantes a los que deseas actualizar el menú maestro.
              Los productos locales creados o modificados por el admin del restaurante no serán afectados.
            </p>

            {syncResult && (
              <div className="mb-4 rounded-lg bg-green-50 p-4">
                <h3 className="mb-2 font-semibold text-green-800">Sincronización completada</h3>
                <ul className="text-sm text-green-700">
                  <li>Productos sincronizados: {syncResult.synced}</li>
                  <li>Productos locales respetados: {syncResult.skipped}</li>
                  {syncResult.errors > 0 && (
                    <li className="text-red-600">Errores: {syncResult.errors}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <button
                onClick={handleSelectAllRestaurants}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                {selectedRestaurantIds.length === restaurants.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            <div className="mb-6 max-h-96 overflow-y-auto border rounded-lg p-4">
              {restaurants.length === 0 ? (
                <p className="text-center text-gray-500">No hay restaurantes disponibles</p>
              ) : (
                <div className="space-y-2">
                  {restaurants.map((restaurant) => (
                    <label
                      key={restaurant.id}
                      className="flex items-center gap-3 rounded p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRestaurantIds.includes(restaurant.id)}
                        onChange={() => handleToggleRestaurant(restaurant.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{restaurant.name}</p>
                        <p className="text-xs text-gray-500">{restaurant.place.name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseSyncModal}
                className="btn-secondary"
                disabled={syncing}
              >
                {syncResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!syncResult && (
                <button
                  onClick={handleSyncMenu}
                  disabled={syncing || restaurants.length === 0}
                  className="btn-primary"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {selectedRestaurantIds.length === 0
                        ? 'Actualizar Todos'
                        : `Actualizar ${selectedRestaurantIds.length}`}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
