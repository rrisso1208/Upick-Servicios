/**
 * Floating cart button with item count
 *
 * ✅ Lee el carrito desde localStorage (via lib/cart)
 * ✅ Se actualiza cuando alguien hace window.dispatchEvent(new Event('cart-updated'))
 * ✅ También escucha el evento 'storage' (cambios de localStorage desde OTRA pestaña)
 * ✅ Al hacer click redirige a /[universitySlug]/checkout
 */

'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { getCartItemCount, getCartTotal, clearCart } from '@/lib/cart';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface CartButtonProps {
  // Se usa para construir la ruta de checkout: /{universitySlug}/checkout
  universitySlug?: string;
  hubId: string;
  // Dos modos UI: flotante (desktop) o barra inferior (mobile)
  variant?: 'floating' | 'mobile-bar';
}

export function CartButton({ universitySlug, hubId, variant = 'floating' }: CartButtonProps) {
  const router = useRouter();

  // Estado UI: cantidad total de ítems (sum de quantities) y total en dinero
  const [itemCount, setItemCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const updateCart = () => {
      setItemCount(getCartItemCount(hubId));
      setTotal(getCartTotal(hubId));
    };

    updateCart();

    window.addEventListener('storage', updateCart);
    window.addEventListener('cart-updated', updateCart);

    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart-updated', updateCart);
    };
  }, [hubId]);

  // Si no hay items, no renderiza nada (no estorba la UI)
  if (itemCount === 0) return null;

  /**
   * Navega a la página de checkout.
   * Si tiene universitySlug: /{slug}/checkout
   * Si no: /checkout (fallback)
   */
  const handleCheckout = () => {
    const path = universitySlug ? `/${universitySlug}/checkout` : '/checkout';
    router.push(path);
  };

  /**
   * Vacía el carrito:
   * - stopPropagation para que no se dispare handleCheckout si estás clickeando dentro del botón grande
   * - confirm nativo del navegador
   * - clearCart() borra localStorage
   * - setItemCount/setTotal para reflejar inmediatamente en UI
   * - dispara 'cart-updated' para que el resto de componentes se enteren
   */
  const handleClearCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirm('¿Estás seguro de que quieres vaciar tu canasta? Esto eliminará todos los productos.')) {
      clearCart(hubId);

      // UI inmediata
      setItemCount(0);
      setTotal(0);

      // Notificar al resto de la app
      window.dispatchEvent(new Event('cart-updated'));
    }
  };

  /**
   * Variant: Barra inferior para móvil
   * - Muestra total + contador + botón de vaciar
   * - El botón principal navega a checkout
   */
  if (variant === 'mobile-bar') {
    return (
      <div className="fixed bottom-[60px] inset-x-0 z-40 px-4 pb-4 md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleClearCart}
            className="flex shrink-0 items-center justify-center rounded-xl bg-red-50 p-3 text-red-600 transition-colors hover:bg-red-100 active:scale-95"
            title="Vaciar canasta"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          <button
            onClick={handleCheckout}
            className="flex flex-1 items-center justify-between rounded-xl bg-primary-600 px-4 py-3.5 text-white shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-600">
                {itemCount}
              </div>
              <span className="text-sm font-bold">{formatCurrency(total)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Ver Canasta</span>
              <ShoppingCart className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  /**
   * Variant: Botón flotante (desktop)
   * - Dos botones: vaciar y ver carrito
   * - Badge con contador encima del icono
   */
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        onClick={handleClearCart}
        className="flex items-center justify-center rounded-full bg-red-500 p-3 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl active:scale-95"
        title="Vaciar canasta"
      >
        <Trash2 className="h-5 w-5" />
      </button>

      <button
        onClick={handleCheckout}
        className="flex items-center gap-3 rounded-full bg-primary-600 px-6 py-4 text-white shadow-2xl transition-all hover:bg-primary-700 hover:shadow-3xl active:scale-95"
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />

          {/* Badge contador */}
          {itemCount > 0 && (
            <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-600">
              {itemCount}
            </div>
          )}
        </div>

        <div className="text-left">
          <p className="text-sm font-medium">Ver carrito</p>
          <p className="text-lg font-bold">{formatCurrency(total)}</p>
        </div>
      </button>
    </div>
  );
}
