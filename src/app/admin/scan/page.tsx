/**
 * QR Scanner for order pickup validation
 * Updated to scan QR codes from camera
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import {
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  CameraOff,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../providers/AuthProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    order?: {
      id: string;
      totalAmount: number;
      student?: {
        firstName?: string;
        email: string;
      };
    };
  } | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-reader';

  // Verify user is restaurant admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'restaurant_admin') {
        router.push('/');
        return;
      }
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (qrCodeRef.current) {
        qrCodeRef.current
          .stop()
          .then(() => {
            qrCodeRef.current?.clear();
          })
          .catch(() => {
            // Ignore errors on cleanup
          });
      }
    };
  }, []);

  const handleValidateQR = async (qrData: string) => {
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
            order: data.data,
          });

          // Stop camera scanning
          if (qrCodeRef.current && cameraScanning) {
            await qrCodeRef.current.stop();
            setCameraScanning(false);
          }

          setTimeout(() => {
            setResult(null);
            setManualCode('');
            // Restart camera if it was scanning
            if (cameraScanning) {
              startCameraScan();
            }
          }, 3000);
        } else {
          setResult({
            success: false,
            message: 'Error al marcar como entregado',
          });
        }
      } else {
        setResult({
          success: false,
          message:
            data.error ||
            'Código QR inválido o no autorizado. Solo administradores del restaurante pueden escanear códigos QR.',
        });
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

  const stopCameraScan = async () => {
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop();
        qrCodeRef.current.clear();
        qrCodeRef.current = null;
        setCameraScanning(false);
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <>
        <Header title="Validar Entrega" />
        <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </main>
      </>
    );
  }

  // Show error if not admin
  if (!user || userRole !== 'restaurant_admin') {
    return (
      <>
        <Header title="Validar Entrega" />
        <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
          <div className="card border-l-4 border-red-500 bg-red-50">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 flex-shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">
                  Acceso no autorizado
                </h2>
                <p className="mt-2 text-red-800">
                  Solo los administradores de restaurante pueden escanear
                  códigos QR.
                </p>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Validar Entrega" />
      <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <QrCode className="h-10 w-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold">Validar Entrega</h1>
          <p className="mt-2 text-gray-600">
            Escanea el QR o ingresa el código manualmente
          </p>
        </div>

        {/* Camera Scanner */}
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Escáner de Cámara</h2>
            {!cameraScanning ? (
              <button
                onClick={startCameraScan}
                disabled={scanning}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Camera className="h-5 w-5" />
                Activar Cámara
              </button>
            ) : (
              <button
                onClick={stopCameraScan}
                disabled={scanning}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                <CameraOff className="h-5 w-5" />
                Detener Cámara
              </button>
            )}
          </div>
          <div id={scannerId} className="w-full rounded-lg"></div>
          {cameraScanning && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Apunta la cámara al código QR del pedido
            </p>
          )}
        </div>

        {/* Manual Code Input */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Código Manual</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-center text-sm font-medium text-gray-700">
                Código de recogida o ID del pedido
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="input text-center text-xl font-bold tracking-wider"
                placeholder="ABC123 o ID del pedido"
                disabled={scanning}
                autoFocus
              />
              <p className="mt-2 text-center text-xs text-gray-500">
                Puedes ingresar el código de 6 caracteres o el ID del pedido
              </p>
            </div>

            <button
              type="submit"
              disabled={manualCode.trim().length < 6 || scanning}
              className="btn-primary w-full"
            >
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar y Entregar'
              )}
            </button>
          </form>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`card mt-6 border-l-4 ${
              result.success
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle className="h-8 w-8 flex-shrink-0 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 flex-shrink-0 text-red-600" />
              )}
              <div className="flex-1">
                <p
                  className={`text-lg font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.message}
                </p>
                {result.success && result.order && (
                  <div className="mt-3 space-y-1 text-sm text-green-800">
                    <p>
                      <strong>Cliente:</strong>{' '}
                      {result.order.student?.firstName ||
                        result.order.student?.email}
                    </p>
                    <p>
                      <strong>Total:</strong> $
                      {(result.order.totalAmount / 100).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card mt-8 bg-blue-50">
          <h3 className="mb-3 font-semibold text-blue-900">Instrucciones:</h3>
          <ol className="ml-4 list-decimal space-y-2 text-sm text-blue-800">
            <li>Activa la cámara y apunta al código QR del pedido</li>
            <li>O ingresa el código manualmente en el campo de arriba</li>
            <li>
              El sistema verificará y marcará como entregado automáticamente
            </li>
            <li>
              El código QR desaparecerá del recibo del cliente después de la
              entrega
            </li>
          </ol>
        </div>
      </main>
    </>
  );
}
