/**
 * Favorite button component - Toggle favorite status
 */

'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../providers/AuthProvider';

interface FavoriteButtonProps {
  type: 'restaurant' | 'product';
  restaurantId?: string;
  productId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({
  type,
  restaurantId,
  productId,
  className = '',
  size = 'md',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Check if already favorited on mount
  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    } else {
      setChecking(false);
    }
  }, [user, restaurantId, productId]);

  const checkFavoriteStatus = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setChecking(false);
        return;
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${session.access_token}`,
      };

      const url =
        type === 'restaurant'
          ? `/api/student/favorites?type=restaurant&restaurantId=${restaurantId}`
          : `/api/student/favorites?type=product&productId=${productId}`;

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // Check if this specific item is in favorites
        const favorites = data.data.favorites || [];
        const found = favorites.some(
          (f: any) =>
            (type === 'restaurant' && f.restaurantId === restaurantId) ||
            (type === 'product' && f.productId === productId)
        );
        setIsFavorite(found);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!user) {
      alert('Por favor inicia sesión para agregar a favoritos');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert('Por favor inicia sesión para agregar a favoritos');
        setLoading(false);
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };

      if (isFavorite) {
        // Remove from favorites
        const url =
          type === 'restaurant'
            ? `/api/student/favorites?restaurantId=${restaurantId}`
            : `/api/student/favorites?productId=${productId}`;

        const response = await fetch(url, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success) {
          setIsFavorite(false);
        } else {
          alert('Error al eliminar de favoritos');
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/student/favorites', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            type,
            restaurantId: type === 'restaurant' ? restaurantId : undefined,
            productId: type === 'product' ? productId : undefined,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setIsFavorite(true);
        } else {
          alert(data.error || 'Error al agregar a favoritos');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error al actualizar favoritos');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return null; // Don't show button while checking
  }

  if (!user) {
    return null; // Don't show button if not logged in
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`rounded-full p-2 transition-all ${
        isFavorite
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
      } ${className}`}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        className={`${sizeClasses[size]} ${
          isFavorite ? 'fill-current' : ''
        } transition-all`}
      />
    </button>
  );
}
