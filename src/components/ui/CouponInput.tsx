/**
 * Coupon Input Component
 * Input field to apply a coupon code
 */

'use client';

import { useState } from 'react';
import { Tag, X, Check, Loader2 } from 'lucide-react';

interface CouponInputProps {
  restaurantId: string;
  orderAmount: number; // In cents
  onCouponApplied?: (coupon: {
    id: string;
    code: string;
    discountAmount: number;
  }) => void;
  onCouponRemoved?: () => void;
}

export function CouponInput({
  restaurantId,
  orderAmount,
  onCouponApplied,
  onCouponRemoved,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Ingresa un código de cupón');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get session token for Authorization header
      const { supabase } = await import('../../providers/AuthProvider');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          code: code.trim(),
          restaurantId,
          orderAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const discountAmount = data.data.coupon.discountAmount;
        setAppliedCoupon({
          id: data.data.coupon.id,
          code: data.data.coupon.code,
          discountAmount: discountAmount,
        });
        setCode('');
        if (onCouponApplied) {
          onCouponApplied({
            id: data.data.coupon.id,
            code: data.data.coupon.code,
            discountAmount: discountAmount,
          });
        }
      } else {
        setError(data.error || 'Cupón inválido');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCode('');
    setError('');
    if (onCouponRemoved) {
      onCouponRemoved();
    }
  };

  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Cupón aplicado: {appliedCoupon.code}
              </p>
              <p className="text-sm text-green-700">
                Descuento: $
                {(appliedCoupon.discountAmount / 100).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        ¿Tienes un cupón de descuento?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidate();
              }
            }}
            placeholder="Ingresa el código"
            className="input w-full pl-10"
            disabled={loading}
          />
        </div>
        <button
          type="button"
          onClick={handleValidate}
          disabled={loading || !code.trim()}
          className="btn-secondary flex items-center gap-2 px-4 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
