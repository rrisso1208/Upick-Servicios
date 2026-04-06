/**
 * Review Form Component
 * Form to create a review for an order
 */

'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { supabase } from '../../providers/AuthProvider';

interface ReviewFormProps {
  orderId: string;
  restaurantId: string;
  productId?: string;
  productName?: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  orderId,
  restaurantId,
  productId,
  productName,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Get the session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          restaurantId,
          productId: productId || undefined,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRating(0);
        setComment('');
        setError('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || 'Error al enviar la reseña');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {productName && (
        <div className="text-sm text-gray-600">
          <span>Calificando: </span>
          <span className="font-semibold">{productName}</span>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Calificación *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Comentario (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="input w-full"
          placeholder="Comparte tu experiencia..."
        />
        <p className="mt-1 text-xs text-gray-500">
          {comment.length}/1000 caracteres
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="btn-primary flex w-full items-center justify-center gap-2"
      >
        {submitting ? (
          'Enviando...'
        ) : (
          <>
            <Send className="h-4 w-4" />
            Enviar Reseña
          </>
        )}
      </button>
    </form>
  );
}
