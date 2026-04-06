/**
 * Reset Password page - Set new password after clicking email link
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/layout/Header';
import { supabase } from '../../../providers/AuthProvider';
import { Lock, CheckCircle, Loader2, Eye, EyeOff, XCircle } from 'lucide-react';
import {
  validatePassword,
  getPasswordRequirementsMessage,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  type PasswordValidationResult,
} from '../../../lib/password-validation';

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check if we have a valid session (user clicked the reset link)
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsValidToken(!!session);
      } catch (err) {
        setIsValidToken(false);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidationResult = validatePassword(password);
    setPasswordValidation(passwordValidationResult);

    if (!passwordValidationResult.isValid) {
      setError('Por favor corrige los errores en tu contraseña');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña');
        return;
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.message ||
          'Error al procesar la solicitud. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (!mounted || isValidToken === null) {
    return (
      <>
        <Header title="Upick" />
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
              <p className="mt-4 text-sm text-gray-600">
                Verificando enlace...
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isValidToken) {
    return (
      <>
        <Header title="Upick" />
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card text-center">
              <div className="mb-4 rounded-lg bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Enlace inválido o expirado
                </p>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                El enlace de recuperación de contraseña no es válido o ha
                expirado. Por favor solicita un nuevo enlace.
              </p>
              <Link
                href="/auth/forgot-password"
                className="btn-primary inline-block"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Upick" />
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Lock className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Restablecer Contraseña
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Ingresa tu nueva contraseña
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setPassword(newPassword);
                        // Validate password in real-time
                        if (newPassword.length > 0) {
                          setPasswordValidation(validatePassword(newPassword));
                        } else {
                          setPasswordValidation(null);
                        }
                      }}
                      placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial"
                      className={`input pl-10 pr-10 ${
                        passwordValidation && !passwordValidation.isValid && password.length > 0
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
                    >
                      {!showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password requirements and validation feedback */}
                  {password.length > 0 && passwordValidation && (
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
                              password.length >= 8
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {password.length >= 8 ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Al menos 8 caracteres
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[A-Z]/.test(password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[A-Z]/.test(password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Una letra mayúscula
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[a-z]/.test(password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[a-z]/.test(password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Una letra minúscula
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[0-9]/.test(password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[0-9]/.test(password) ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Un número
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) ? (
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
                  {password.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {getPasswordRequirementsMessage()}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma tu contraseña"
                      className="input pl-10 pr-10"
                      disabled={loading}
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {!showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
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
                      Actualizando...
                    </>
                  ) : (
                    <>
                      Restablecer contraseña
                      <Lock className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Contraseña actualizada exitosamente
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Tu contraseña ha sido actualizada. Serás redirigido al inicio
                  de sesión...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Upick" />
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-lg text-gray-600">Cargando...</div>
          </div>
        </>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
