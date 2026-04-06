'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';
import { addToCart, type CartItem } from '@/lib/cart';
import { PickuMascot } from '@/components/ui/PickuMascot';

interface ProductOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  required: boolean;
  options: ProductOption[];
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promotionPrice?: number | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  prepMinutes: number;
  optionGroups?: ProductOptionGroup[];
}

interface ProductModalProps {
  product: Product;
  restaurantId: string;
  restaurantName: string;
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
  onCartUpdate?: () => void;
  hubId: string;
}

export function ProductModal({
                               product,
                               restaurantId,
                               restaurantName,
                               isOpen,
                               onClose,
                               disabled = false,
                               onCartUpdate,
                               hubId,
                             }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  const hasOptions = !!(product.optionGroups && product.optionGroups.length > 0);

  const basePrice =
    product.promotionPrice && product.promotionPrice < product.price
      ? product.promotionPrice
      : product.price;

  const calculateTotal = () => {
    let total = basePrice;

    for (const group of product.optionGroups || []) {
      const selectedIds = selectedOptions[group.id] || [];
      for (const optId of selectedIds) {
        const option = group.options.find((o) => o.id === optId);
        if (option) total += option.priceDelta;
      }
    }

    return total * quantity;
  };

  const validateOptions = () => {
    const errors: Record<string, string> = {};

    for (const group of product.optionGroups || []) {
      const selectedCount = (selectedOptions[group.id] || []).length;
      const minRequired = group.required
        ? Math.max(1, group.min || 1)
        : group.min || 0;

      if (selectedCount < minRequired) {
        errors[group.id] =
          minRequired === 1
            ? `Selecciona 1 opción`
            : `Selecciona mínimo ${minRequired}`;
      }

      if (group.max > 0 && selectedCount > group.max) {
        errors[group.id] = `Máximo ${group.max} opciones`;
      }
    }

    setOptionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleOption = (groupId: string, optionId: string) => {
    const group = product.optionGroups?.find((g) => g.id === groupId);
    if (!group) return;

    const current = selectedOptions[groupId] || [];

    if (current.includes(optionId)) {
      setSelectedOptions((prev) => ({
        ...prev,
        [groupId]: current.filter((id) => id !== optionId),
      }));
    } else {
      if (group.max === 1) {
        setSelectedOptions((prev) => ({
          ...prev,
          [groupId]: [optionId],
        }));
      } else if (current.length < group.max) {
        setSelectedOptions((prev) => ({
          ...prev,
          [groupId]: [...current, optionId],
        }));
      }
    }

    setOptionErrors((prev) => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
  };

  const handleAddToCart = () => {
    if (hasOptions) {
      const ok = validateOptions();
      if (!ok) return;
    }

    const options: CartItem['options'] = [];

    for (const group of product.optionGroups || []) {
      const selectedIds = selectedOptions[group.id] || [];
      for (const optId of selectedIds) {
        const option = group.options.find((o) => o.id === optId);
        if (option) {
          options.push({
            productOptionId: option.id,
            name: option.name,
            priceDelta: option.priceDelta,
          });
        }
      }
    }

    const result = addToCart({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: basePrice,
      restaurantId,
      restaurantName,
      options: options.length > 0 ? options : undefined,
      notes: notes.trim() || undefined,
    },
      hubId);

    if (result.success) {
      setAdded(true);

      setTimeout(() => {
        setAdded(false);
        onClose();
        onCartUpdate?.();
      }, 1000);
    } else {
      alert(result.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center sm:items-center">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85dvh]  animate-slideUp relative translate-y-[-5%]">

        {/* NAVBAR SUPERIOR */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="bg-white/90 backdrop-blur rounded-full p-2 shadow-md"
          >
            <X className="h-5 w-5" />
          </button>

          <button className="bg-white/90 backdrop-blur rounded-full p-2 shadow-md">
            ❤️
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto">

          <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg bg-gray-50">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <PickuMascot
                  variant="chef"
                  size="lg"
                  className="opacity-80"
                />
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold">{product.name}</h2>

            {product.description && (
              <p className="text-sm text-gray-600">
                {product.description}
              </p>
            )}

            {/* Opciones */}
            {hasOptions &&
              product.optionGroups!.map((group) => (
                <div key={group.id}>
                  <h4 className="font-medium mb-2">
                    {group.name}
                    {group.required && <span className="text-red-600"> *</span>}

                    <span className="block text-xs text-gray-500">
                      {group.max > 0 && (
                        <>
                          Máximo {group.max} opciones ·{' '}
                          {(selectedOptions[group.id]?.length || 0)} seleccionadas
                        </>
                      )}
                    </span>
                  </h4>

                  {optionErrors[group.id] && (
                    <p className="text-sm text-red-600 mb-2">
                      {optionErrors[group.id]}
                    </p>
                  )}

                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(group.id, option.id)}
                        className={`flex w-full justify-between rounded-lg border p-3 ${
                          selectedOptions[group.id]?.includes(option.id)
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span>{option.name}</span>
                        <span>
                        {option.priceDelta > 0 &&
                          `+${formatCurrency(option.priceDelta)}`}
                      </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Comentario especial
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ej: sin cebolla..."
              />
            </div>
          </div>
        </div>

        {/* FOOTER FIJO REAL */}
        <div className="border-t bg-white p-4 flex items-center justify-between">

          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="px-4">{quantity}</span>

            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={disabled || added}
            className="btn btn-primary"
          >
            {added ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Agregado
              </>
            ) : (
              `Agregar ${formatCurrency(calculateTotal())}`
            )}
          </button>
        </div>

      </div>
    </div>
  );
}