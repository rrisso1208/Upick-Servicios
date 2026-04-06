/**
 * User Settings page - Manage profile and preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import {
  Settings,
  User,
  Phone,
  Mail,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/AuthProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    documentType: 'CC',
    documentNumber: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  const fetchUserProfile = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/auth/user?email=${encodeURIComponent(user.email)}`
      );

      if (response.ok) {
        const data = await response.json();
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          documentType: data.documentType || 'CC',
          documentNumber: data.documentNumber || '',
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar perfil');
      }
    } catch (err: any) {
      setError('Error al cargar perfil');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

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

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber ? formData.phoneNumber.replace(/\s+/g, '') : null,
          documentType: formData.documentType || null,
          documentNumber: formData.documentNumber || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar perfil');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header title="Configuración" showBack />
        <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Configuración" showBack />
      <main className="mx-auto min-h-screen max-w-4xl px-4 pt-8 pb-32 md:pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Settings className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Configuración
              </h1>
              <p className="mt-1 text-gray-600">
                Gestiona tu perfil y preferencias
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Información Personal */}
          <div className="card">
            <div className="mb-6 flex items-center gap-2 border-b pb-4">
              <User className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-semibold">Información Personal</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="input"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="input"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  <Mail className="mr-2 inline h-4 w-4" />
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="input bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  El correo no se puede cambiar
                </p>
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  <Phone className="mr-2 inline h-4 w-4" />
                  Número de teléfono
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="300 123 4567"
                  className="input"
                  disabled={saving}
                />
                <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">
                        💡 ¿Por qué agregar mi teléfono?
                      </p>
                      <p className="mt-1">
                        Recibirás notificaciones por WhatsApp cuando tu pedido
                        esté listo para recoger. ¡No te pierdas ningún pedido!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label
                    htmlFor="documentType"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Tipo Doc.
                  </label>
                  <select
                    id="documentType"
                    value={formData.documentType}
                    onChange={(e) =>
                      setFormData({ ...formData, documentType: e.target.value })
                    }
                    className="input"
                    disabled={saving}
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="TI">TI</option>
                    <option value="PP">PP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label
                    htmlFor="documentNumber"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Número de Documento
                  </label>
                  <input
                    id="documentNumber"
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, documentNumber: e.target.value })
                    }
                    placeholder="1234567890"
                    className="input"
                    disabled={saving}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <p>Perfil actualizado exitosamente</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Información Adicional */}
          <div className="space-y-6">
            {/* Notificaciones */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2 border-b pb-4">
                <Bell className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-semibold">Notificaciones</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Notificaciones WhatsApp
                    </p>
                    <p className="text-sm text-gray-600">
                      Recibe avisos cuando tu pedido esté listo
                    </p>
                  </div>
                  <div className="flex items-center">
                    {formData.phoneNumber ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
                {!formData.phoneNumber && (
                  <p className="text-sm text-gray-500">
                    Agrega tu número de teléfono arriba para activar las
                    notificaciones
                  </p>
                )}
              </div>
            </div>

            {/* Información de Cuenta */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2 border-b pb-4">
                <User className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-semibold">Información de Cuenta</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID de Usuario:</span>
                  <span className="font-mono text-gray-900">
                    {user?.id?.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rol:</span>
                  <span className="font-medium capitalize text-gray-900">
                    {user?.role === 'student'
                      ? 'Estudiante'
                      : user?.role === 'restaurant_admin'
                        ? 'Administrador'
                        : user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
