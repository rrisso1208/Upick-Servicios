/**
 * Signup page - Register new users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/layout/Header';
import { UserPlus, ArrowRight, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../providers/AuthProvider';
import { getCSRFTokenForRequest } from '../../../hooks/useCSRFToken';
import {
  validatePassword,
  getPasswordRequirementsMessage,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  type PasswordValidationResult,
} from '../../../lib/password-validation';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    documentType: 'CC',
    documentNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password before proceeding
    const passwordValidationResult = validatePassword(formData.password);
    setPasswordValidation(passwordValidationResult);

    if (!passwordValidationResult.isValid) {
      setError('Por favor corrige los errores en tu contraseña');
      setLoading(false);
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Debes aceptar los Términos y Condiciones y la Política de Privacidad');
      setLoading(false);
      return;
    }

    try {
      // Normalize email to lowercase
      const normalizedEmail = formData.email.toLowerCase().trim();

      // 1. Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phoneNumber,
            documentType: formData.documentType,
            documentNumber: formData.documentNumber,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. Create user record in our database
      // Get CSRF token for the request
      const csrfToken = await getCSRFTokenForRequest();
      if (!csrfToken) {
        throw new Error('No se pudo obtener el token de seguridad. Por favor recarga la página.');
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          ...formData,
          role: 'student', // Default role for signups
          acceptedTerms,
          acceptedPrivacy,
          acceptedAt: new Date().toISOString(),
          termsVersion: '1.0',
          privacyVersion: '1.0'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSent(true);
    } catch (err: any) {
      setError(
        err.message || 'Error al registrarse. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Upick" />
      <main className="flex min-h-screen items-center justify-center px-4 py-12 pb-24">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <UserPlus className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
              <p className="mt-2 text-sm text-gray-600">
                Regístrate para empezar a ordenar
              </p>
            </div>

            {!sent ? (
              <form onSubmit={handleSignup} className="space-y-4">
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="documentType"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Tipo
                    </label>
                    <select
                      id="documentType"
                      required
                      value={formData.documentType}
                      onChange={(e) =>
                        setFormData({ ...formData, documentType: e.target.value })
                      }
                      className="input"
                      disabled={loading}
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PP">PP</option>
                      <option value="NIT">NIT</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="documentNumber"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Número
                    </label>
                    <input
                      id="documentNumber"
                      type="text"
                      required
                      value={formData.documentNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, documentNumber: e.target.value })
                      }
                      placeholder="Número de identificación"
                      className="input"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Correo
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="tu@correo.com"
                    className="input"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setFormData({ ...formData, password: newPassword });
                        // Validate password in real-time
                        if (newPassword.length > 0) {
                          setPasswordValidation(validatePassword(newPassword));
                        } else {
                          setPasswordValidation(null);
                        }
                      }}
                      placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial"
                      className={`input pr-10 ${
                        passwordValidation && !passwordValidation.isValid && formData.password.length > 0
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : passwordValidation?.isValid
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                            : ''
                      }`}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {!showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password requirements and validation feedback */}
                  {formData.password.length > 0 && passwordValidation && (
                    <div className="mt-2 space-y-2">
                      {/* Password strength indicator */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">
                          Fortaleza:
                        </span>
                        <span
                          className={`text-xs font-semibold ${getPasswordStrengthColor(
                            passwordValidation.strength
                          )}`}
                        >
                          {getPasswordStrengthLabel(passwordValidation.strength)}
                        </span>
                      </div>

                      {/* Requirements checklist */}
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <p className="mb-2 text-xs font-medium text-gray-700">
                          Requisitos:
                        </p>
                        <ul className="space-y-1 text-xs">
                          <li
                            className={`flex items-center gap-2 ${
                              formData.password.length >= 8
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {formData.password.length >= 8 ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Al menos 8 caracteres
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[A-Z]/.test(formData.password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[A-Z]/.test(formData.password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Una letra mayúscula
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[a-z]/.test(formData.password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[a-z]/.test(formData.password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Una letra minúscula
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[0-9]/.test(formData.password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[0-9]/.test(formData.password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Un número
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(
                                formData.password
                              )
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(
                              formData.password
                            ) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Un carácter especial (!@#$%^&*...)
                          </li>
                        </ul>
                      </div>

                      {/* Error messages */}
                      {!passwordValidation.isValid && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                          <ul className="space-y-1 text-xs text-red-700">
                            {passwordValidation.errors.map((error, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Initial hint when password field is empty */}
                  {formData.password.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {getPasswordRequirementsMessage()}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="300 123 4567"
                    className="input"
                    disabled={loading}
                  />
                  <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-medium">💡 Información</p>
                    <p className="mt-1">
                      Agregar tu número de teléfono es para recibir
                      notificaciones por WhatsApp cuando tu pedido esté listo.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Terms and Privacy Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      disabled={loading}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      required
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700">
                      Acepto los{' '}
                      <Link
                        href="/terminos-y-condiciones"
                        className="font-medium text-primary-600 hover:underline"
                        target="_blank"
                      >
                        Términos y Condiciones
                      </Link>
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="privacy"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      disabled={loading}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      required
                    />
                    <label htmlFor="privacy" className="text-sm text-gray-700">
                      Acepto la{' '}
                      <Link
                        href="/politica-privacidad"
                        className="font-medium text-primary-600 hover:underline"
                        target="_blank"
                      >
                        Política de Privacidad
                      </Link>
                    </label>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-600">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    href="/auth/login"
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Inicia sesión
                  </Link>
                </p>


              </form>
            ) : (
              <div className="text-center">
                <div className="mb-4 rounded-lg bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Cuenta creada exitosamente
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Tu cuenta ha sido creada. Ya puedes iniciar sesión.
                </p>
                <Link
                  href="/auth/login"
                  className="btn-primary mt-4 inline-block"
                >
                  Ir a Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
