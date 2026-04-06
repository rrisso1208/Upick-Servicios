/**
 * QR Scanner Modal Component for Admin Orders Panel
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  CameraOff,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../providers/AuthProvider';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: QRScannerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    order?: {
      id: string;
      pickupCode: string;
      totalAmount: number;
    };
  } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-scanner-modal';

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = async () => {
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop();
        qrCodeRef.current.clear();
        qrCodeRef.current = null;
        setCameraScanning(false);
      } catch (error) {
        // Ignore errors on cleanup
      }
    }
  };

  const handleValidateQR = async (qrData: string) => {
    if (scanning) return; // Prevent multiple simultaneous scans

    setScanning(true);
    setResult(null);

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

      // Validate QR code
      const response = await fetch('/api/admin/orders/validate-qr', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ qrData }),
      });

      const data = await response.json();

      if (data.success) {
        // Mark as delivered
        const deliverResponse = await fetch(
          `/api/admin/orders/${data.data.id}/status`,
          {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ status: 'delivered' }),
          }
        );

        if (deliverResponse.ok) {
          setResult({
            success: true,
            message: '¡Pedido entregado exitosamente!',
            order: {
              id: data.data.id,
              pickupCode: data.data.pickupCode,
              totalAmount: data.data.totalAmount,
            },
          });

          // Stop camera scanning
          await stopCamera();

          // Call success callback
          if (onSuccess) {
            onSuccess(data.data.id);
          }

          // Auto-close after 2 seconds
          setTimeout(() => {
            setResult(null);
            setManualCode('');
            onClose();
          }, 2000);
        } else {
          setResult({
            success: false,
            message: 'Error al marcar como entregado',
          });
        }
      } else {
        // Check if error is about already delivered order
        const errorMessage =
          typeof data.error === 'string'
            ? data.error
            : 'Código QR inválido o pedido no encontrado';
        const isAlreadyDelivered =
          errorMessage.includes('ya fue entregado') ||
          errorMessage.includes('no es válido para una segunda entrega');

        setResult({
          success: false,
          message: errorMessage,
        });

        // If already delivered, stop camera and show warning prominently
        if (isAlreadyDelivered) {
          await stopCamera();
        }
      }
    } catch (error) {
      console.error('Error validating QR:', error);
      setResult({
        success: false,
        message: 'Error de conexión',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim().length >= 6) {
      handleValidateQR(manualCode.trim());
    }
  };

  const startCameraScan = async () => {
    if (qrCodeRef.current) {
      return; // Already scanning
    }

    try {
      const qrCode = new Html5Qrcode(scannerId);
      qrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          handleValidateQR(decodedText);
        },
        (errorMessage) => {
          // Error callback - ignore, will keep scanning
        }
      );

      setCameraScanning(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      setResult({
        success: false,
        message: 'Error al acceder a la cámara. Verifica los permisos.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <QrCode className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold">Escanear QR de Entrega</h2>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              result.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <p className="font-medium">{result.message}</p>
            </div>
            {result.success && result.order && (
              <div className="mt-2 text-sm">
                <p>Código: {result.order.pickupCode}</p>
                <p>
                  Total:{' '}
                  {((result.order.totalAmount || 0) / 100).toLocaleString(
                    'es-CO',
                    {
                      style: 'currency',
                      currency: 'COP',
                    }
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Camera Scanner */}
        <div className="mb-4">
          <div
            id={scannerId}
            className="mx-auto w-full max-w-xs overflow-hidden rounded-lg bg-gray-100"
            style={{ minHeight: '250px' }}
          />
          {!cameraScanning && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={startCameraScan}
                disabled={scanning}
                className="btn-primary flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Activar Cámara
              </button>
            </div>
          )}
          {cameraScanning && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={stopCamera}
                disabled={scanning}
                className="btn-secondary flex items-center gap-2"
              >
                <CameraOff className="h-4 w-4" />
                Detener Cámara
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 flex items-center gap-2">
          <div className="flex-1 border-t border-gray-300" />
          <span className="text-sm text-gray-500">O</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        {/* Manual Code Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Ingresar código manualmente
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Ej: QIGTBE"
              maxLength={6}
              className="input flex-1 uppercase"
              disabled={scanning}
            />
            <button
              type="submit"
              disabled={scanning || manualCode.trim().length < 6}
              className="btn-primary"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Validar'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Ingresa el código de 6 caracteres del pedido
          </p>
        </form>

        {/* Info */}
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Escanea el código QR del recibo del cliente o ingresa el código
              manualmente para validar la entrega.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
