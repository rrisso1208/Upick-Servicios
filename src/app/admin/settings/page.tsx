/**
 * Restaurant Admin - Settings (Horarios y Franjas)
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Loader2,
  Save,
  Clock,
  Calendar,
  Truck,
  Plug,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AVAILABLE_POS_TYPES } from '../../../lib/pos/connectors';
import { POSType, POSCredentials } from '../../../lib/pos/types';

interface OpenHours {
  [key: string]: {
    open: string;
    close: string;
  } | null;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function SettingsPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [openHours, setOpenHours] = useState<OpenHours>({});
  const [pickupSlotMinutes, setPickupSlotMinutes] = useState(10);
  const [capacityPerSlotDefault, setCapacityPerSlotDefault] = useState(25);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [takeoutFee, setTakeoutFee] = useState(0);
  const [allowEatIn, setAllowEatIn] = useState(true)
  const [allowTakeout, setAllowTakeout] = useState(true)
  const [allowInternalDelivery, setAllowInternalDelivery] = useState(false)

  // POS Configuration
  const [posType, setPosType] = useState<POSType | null>(null);
  const [posEnabled, setPosEnabled] = useState(false);
  const [posCredentials, setPosCredentials] = useState<POSCredentials>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && user && userRole === 'restaurant_admin') {
      fetchRestaurantSettings();
    }
  }, [user, userRole, authLoading]);

  const fetchRestaurantSettings = async () => {
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

      const response = await fetch('/api/admin/restaurant/settings', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const restaurantData = data.data.restaurant;
        setRestaurant(restaurantData);
        setPickupSlotMinutes(restaurantData.pickupSlotMinutes || 10);
        setCapacityPerSlotDefault(restaurantData.capacityPerSlotDefault || 25);
        setAllowEatIn(restaurantData.allowEatIn ?? true)
        setAllowTakeout(restaurantData.allowTakeout ?? true)
        setAllowInternalDelivery(restaurantData.allowInternalDelivery ?? false)
        setDeliveryFee(restaurantData.deliveryFee || 0);
        setTakeoutFee(restaurantData.takeoutFee || 0);

        // POS Configuration
        setPosType((restaurantData.posType as POSType) || null);
        setPosEnabled(restaurantData.posEnabled || false);
        setPosCredentials(
          (restaurantData.posCredentials as POSCredentials) || {}
        );

        // Initialize open hours
        const hours = (restaurantData.openHours as OpenHours) || {};
        const initializedHours: OpenHours = {};
        DAYS_OF_WEEK.forEach((day) => {
          initializedHours[day.key] = hours[day.key] || null;
        });
        setOpenHours(initializedHours);
      } else {
        alert(data.error || 'Error al cargar configuración');
      }
    } catch (error) {
      console.error('Error fetching restaurant settings:', error);
      alert('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayKey: string) => {
    setOpenHours((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey] ? null : { open: '08:00', close: '18:00' },
    }));
  };

  const handleTimeChange = (
    dayKey: string,
    field: 'open' | 'close',
    value: string
  ) => {
    setOpenHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...(prev[dayKey] || { open: '08:00', close: '18:00' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
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

      // Clean up null values from openHours
      const cleanedOpenHours: OpenHours = {};
      Object.keys(openHours).forEach((key) => {
        if (openHours[key] !== null) {
          cleanedOpenHours[key] = openHours[key]!;
        }
      });

      const response = await fetch('/api/admin/restaurant/settings', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          openHours: cleanedOpenHours,
          pickupSlotMinutes: parseInt(pickupSlotMinutes.toString()),
          capacityPerSlotDefault: parseInt(capacityPerSlotDefault.toString()),
          allowEatIn,
          allowTakeout,
          allowInternalDelivery,
          deliveryFee: Math.round(parseFloat(deliveryFee.toString())), // Already in cents, no need to multiply
          takeoutFee: Math.round(parseFloat(takeoutFee.toString())),
          posType,
          posEnabled,
          posCredentials:
            Object.keys(posCredentials).length > 0 ? posCredentials : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Configuración guardada exitosamente');
        await fetchRestaurantSettings();
      } else {
        alert(data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!posType) {
      alert('Por favor selecciona un tipo de POS primero');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

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

      // Primero guardar la configuración temporal
      await fetch('/api/admin/restaurant/pos/config', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          posType,
          posEnabled: true,
          posCredentials,
        }),
      });

      // Luego probar la conexión
      const response = await fetch(
        '/api/admin/restaurant/pos/test-connection',
        {
          method: 'POST',
          headers,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Conexión exitosa',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || data.error || 'Error al conectar',
        });
      }
    } catch (error) {
      console.error('Error testing POS connection:', error);
      setTestResult({
        success: false,
        message: 'Error al probar conexión. Intenta nuevamente.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Configuración" showBack />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  if (!user || userRole !== 'restaurant_admin') {
    return (
      <>
        <Header title="Configuración" showBack />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-600">No autorizado</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Configuración" showBack />
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Configuración de {restaurant?.type === 'DISCOTECA' ? 'la Discoteca' : restaurant?.type === 'SERVICE' ? 'del Servicio' : 'del Restaurante'}
          </h1>
          <p className="mt-2 text-gray-600">
            Configura los horarios de apertura y las franjas de entrega para
            que los clientes puedan realizar pedidos.
          </p>
        </div>

        <div className="space-y-6">
          {/* Horarios de Apertura */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-bold">Horarios de Apertura</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Define los horarios de apertura para cada día de la semana. Las
              franjas de recogida se generarán automáticamente según estos
              horarios.
            </p>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const isOpen = openHours[day.key] !== null;
                return (
                  <div
                    key={day.key}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex w-32 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={() => handleDayToggle(day.key)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label className="font-medium">{day.label}</label>
                    </div>

                    {isOpen && (
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Abre:</label>
                          <input
                            type="time"
                            value={openHours[day.key]?.open || '08:00'}
                            onChange={(e) =>
                              handleTimeChange(day.key, 'open', e.target.value)
                            }
                            className="rounded border border-gray-300 px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">
                            Cierra:
                          </label>
                          <input
                            type="time"
                            value={openHours[day.key]?.close || '18:00'}
                            onChange={(e) =>
                              handleTimeChange(day.key, 'close', e.target.value)
                            }
                            className="rounded border border-gray-300 px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    )}

                    {!isOpen && (
                      <div className="flex-1 text-sm text-gray-400">
                        Cerrado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuración de Pedidos */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-bold">Configuración de Pedidos</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Configura las opciones generales para los pedidos.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de pedidos disponibles
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Selecciona qué opciones de pedido pueden elegir tus clientes
                  en el checkout.
                </p>
                <div className="space-y-3">

                  {/* Comer aquí */}
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allowEatIn}
                      onChange={(e) => setAllowEatIn(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>
                      {restaurant?.type === 'DISCOTECA' ? 'Permitir llevar a la mesa' : 'Permitir comer aquí'}
                    </span>
                  </label>

                  {/* Para llevar */}
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allowTakeout}
                      onChange={(e) => setAllowTakeout(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>
                      {restaurant?.type === 'DISCOTECA' ? 'Permitir recoger en barra' : 'Permitir para llevar'}
                    </span>
                  </label>

                </div>
              </div>

              {allowTakeout && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Precio extra por {restaurant?.type === 'DISCOTECA' ? '"Recoger en barra"' : '"Para llevar"'} (COP)
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Este valor se sumará automáticamente al total cuando el cliente
                      seleccione la opción "Para llevar".
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={takeoutFee / 100}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setTakeoutFee(Math.round(value * 100));
                        }}
                        className="input w-full max-w-xs"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">COP</span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Valor actual: ${(takeoutFee / 100).toLocaleString('es-CO')} COP
                    </p>
                  </div>
                )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Duración de cada franja (minutos)
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  Cada franja tendrá esta duración. Ejemplo: 10 minutos =
                  franjas de 10:00-10:10, 10:10-10:20, etc.
                </p>
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="5"
                  value={pickupSlotMinutes}
                  onChange={(e) =>
                    setPickupSlotMinutes(parseInt(e.target.value) || 10)
                  }
                  className="input w-full max-w-xs"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Capacidad por defecto de cada franja
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  Número máximo de pedidos que se pueden aceptar en cada franja
                  antes de que se agote.
                </p>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={capacityPerSlotDefault}
                  onChange={(e) =>
                    setCapacityPerSlotDefault(parseInt(e.target.value) || 25)
                  }
                  className="input w-full max-w-xs"
                />
              </div>
            </div>
          </div>

          {/* Domicilio Interno Configuration */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-bold">Domicilio Interno</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Configura el servicio de domicilio interno dentro del Hub. Los
              clientes podrán solicitar que se les entregue el pedido en un
              punto de entrega predefinido.
            </p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowInternalDelivery}
                    onChange={(e) =>
                      setAllowInternalDelivery(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar Domicilio Interno
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Si está habilitado, los clientes podrán seleccionar "Domicilio
                  Interno" en el checkout y elegir un punto de entrega
                  predefinido por el Super Admin.
                </p>
              </div>

              {allowInternalDelivery && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Costo del Domicilio (COP)
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Este costo se agregará al total del pedido cuando el cliente
                    seleccione "Domicilio Interno". Puede ser $0 para ofrecer
                    domicilio gratis.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={deliveryFee / 100} // Display in pesos, store in cents
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setDeliveryFee(Math.round(value * 100)); // Convert to cents
                      }}
                      className="input w-full max-w-xs"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">COP</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Valor actual: ${(deliveryFee / 100).toLocaleString('es-CO')}{' '}
                    COP
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Integración POS */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-bold">Integración POS</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Configura la integración con tu sistema de punto de venta (POS)
              para enviar pedidos automáticamente.
            </p>

            <div className="space-y-4">
              {/* Habilitar POS */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={posEnabled}
                    onChange={(e) => setPosEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar integración POS
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Cuando está habilitado, los pedidos se enviarán
                  automáticamente a tu sistema POS.
                </p>
              </div>

              {posEnabled && (
                <>
                  {/* Tipo de POS */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo de POS
                    </label>
                    <select
                      value={posType || ''}
                      onChange={(e) =>
                        setPosType(e.target.value as POSType | null)
                      }
                      className="input w-full"
                    >
                      <option value="">Selecciona un POS</option>
                      {AVAILABLE_POS_TYPES.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label} - {pos.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Credenciales según el tipo de POS */}
                  {posType && (
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Credenciales
                      </label>

                      {/* API Key / Token */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          API Key o Token
                        </label>
                        <input
                          type="password"
                          value={
                            posCredentials.apiKey ||
                            posCredentials.apiToken ||
                            ''
                          }
                          onChange={(e) =>
                            setPosCredentials({
                              ...posCredentials,
                              apiKey: e.target.value,
                              apiToken: e.target.value,
                            })
                          }
                          placeholder="Ingresa tu API Key o Token"
                          className="input w-full"
                        />
                      </div>

                      {/* Base URL */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          URL Base (opcional)
                        </label>
                        <input
                          type="text"
                          value={posCredentials.baseUrl || ''}
                          onChange={(e) =>
                            setPosCredentials({
                              ...posCredentials,
                              baseUrl: e.target.value,
                            })
                          }
                          placeholder="https://api.tu-pos.com"
                          className="input w-full"
                        />
                      </div>

                      {/* Restaurant ID en POS (si aplica) */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          ID del Restaurante en POS (opcional)
                        </label>
                        <input
                          type="text"
                          value={posCredentials.restaurantId || ''}
                          onChange={(e) =>
                            setPosCredentials({
                              ...posCredentials,
                              restaurantId: e.target.value,
                            })
                          }
                          placeholder="ID del restaurante en el sistema POS"
                          className="input w-full"
                        />
                      </div>

                      {/* Botón Test Connection */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection || !posType}
                          className="btn-secondary flex items-center gap-2"
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Probando conexión...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Probar Conexión
                            </>
                          )}
                        </button>

                        {/* Resultado del test */}
                        {testResult && (
                          <div
                            className={`flex items-center gap-2 text-sm ${
                              testResult.success
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {testResult.success ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                            <span>{testResult.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
