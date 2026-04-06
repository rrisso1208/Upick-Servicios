/**
 * User menu component - Shows logged in user info and logout
 *
 * Este componente controla el "menú de usuario" que ves arriba:
 * - Si NO hay usuario: muestra botones Registrarse / Iniciar sesión
 * - Si SÍ hay usuario: muestra botón con iniciales + dropdown con opciones según rol
 * - Si el rol es student: también muestra el saldo de créditos y lo actualiza
 */

'use client';
// ✅ Es Client Component porque:
// - usa useState, useEffect
// - usa eventos onClick
// - usa window/document (listeners)

import { useState, useRef, useEffect } from 'react';

// Hook/provider de autenticación DEL PROYECTO
// De aquí salen: user, userRole, signOut
import { useAuth, supabase } from '@/providers/AuthProvider';
import type { PlaceType } from '@prisma/client';

// Iconos (solo UI)
import {
  LogOut,
  Settings,
  Package,
  Utensils,
  Heart,
  Tag,
  MessageSquare,
  Users,
  Clock,
  Phone,
  User,
  Wallet,
  CreditCard,
  FileText,
  MapPin,
  HandCoins,
  Sparkles,
  CalendarClock,
  ClipboardList,
  PartyPopper,
  LayoutGrid,
  Ticket,
  CalendarCheck,
  Loader2,
} from 'lucide-react';

// Router del App Router (para redirigir después de logout)
import { useRouter, usePathname } from 'next/navigation';

// Link interno optimizado
import Link from 'next/link';

export function UserMenu() {
  /**
   * ESTADO GLOBAL DE AUTH
   *
   * user: info del usuario (probablemente viene de Supabase)
   * userRole: role en string (student, restaurant_admin, etc.)
   * signOut: función para cerrar sesión
   */
  const { user, userRole, signOut } = useAuth();

  /**
   * ESTADOS LOCALES DEL MENÚ
   */
  const [isOpen, setIsOpen] = useState(false); // controla si el dropdown está abierto

  // saldo de créditos (solo para student), en centavos (por el /100 que hacen después)
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  /** PlaceType del negocio (solo restaurant_admin); se carga al abrir sesión. */
  const [adminPlaceType, setAdminPlaceType] = useState<PlaceType | null>(null);
  const [adminMenuLoading, setAdminMenuLoading] = useState(false);

  /**
   * REFERENCIA AL CONTENEDOR DEL MENÚ
   * Se usa para detectar clicks fuera del menú y cerrarlo
   */
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  /**
   * EFECTO 1: Cerrar menú si se hace click fuera
   *
   * - Si el menú está abierto, se agrega listener
   * - Si se cierra, se quita listener
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Si existe el menú y el click NO fue dentro del menú => cerrar
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Solo agregamos el listener si está abierto (optimización)
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      // Cleanup: quitar listener cuando cambie isOpen o se desmonte
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  /**
   * EFECTO 2: Cuando hay usuario + rol student, trae el saldo
   *
   * Importante: se ejecuta cuando cambie user o userRole
   */
  useEffect(() => {
    if (user && userRole === 'student') {
      fetchCreditBalance();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (userRole !== 'restaurant_admin') {
      setAdminPlaceType(null);
      setAdminMenuLoading(false);
      return;
    }

    let cancelled = false;
    setAdminMenuLoading(true);

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/admin/restaurant-context', { headers });
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data?.type) {
          setAdminPlaceType(json.data.type as PlaceType);
        } else {
          setAdminPlaceType('RESTAURANT');
        }
      } catch {
        if (!cancelled) setAdminPlaceType('RESTAURANT');
      } finally {
        if (!cancelled) setAdminMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userRole, user?.id]);

  /**
   * EFECTO 3: Refrescar saldo cuando:
   * - el tab vuelve a ser visible
   * - la ventana vuelve a estar en foco
   *
   * Esto es útil si el saldo cambia en otra pantalla (ej: cancelación de pedido).
   */
  useEffect(() => {
    if (user && userRole === 'student') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[UserMenu] Page visible, refreshing credit balance...');
          fetchCreditBalance();
        }
      };

      const handleFocus = () => {
        console.log('[UserMenu] Window focused, refreshing credit balance...');
        fetchCreditBalance();
      };

      // Suscribirse a eventos del navegador
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      // Cleanup: quitar listeners
      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user, userRole]);

  /**
   * FUNCIÓN: Traer saldo de créditos del estudiante
   *
   * Hace request a /api/student/credits
   * Envia Authorization: Bearer <token> si existe sesión
   */
  const fetchCreditBalance = async () => {
    try {
      /**
       * Import dinámico de supabase desde AuthProvider
       * (esto sugiere que AuthProvider exporta supabase como singleton)
       */
      const { supabase } = await import('../../providers/AuthProvider');

      // Obtiene la sesión actual (con access_token)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Headers base
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Si hay token, se envía al backend para autorizar la request
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Llamada al endpoint interno
      const response = await fetch('/api/student/credits', {
        headers,
        credentials: 'include', // incluye cookies si las usan
      });

      const data = await response.json();

      // Convención del backend: { success, data }
      if (data.success) {
        // balance viene en centavos
        setCreditBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch credit balance:', error);
    }
  };

  // Path actual (para redirección al login con ?redirect=...)
  const pathname = usePathname();

  /**
   * CASO 1: NO HAY USUARIO LOGUEADO
   *
   * - Muestra botones de registrarse e iniciar sesión.
   * - Si ya estás en /auth/*, no arma redirect extraño.
   */
  if (!user) {
    const isAuthPage = pathname?.startsWith('/auth/');

    // Si ya estás en auth, login normal.
    // Si no, login con redirect a la página actual para volver después de loguearte.
    const loginUrl = isAuthPage
      ? '/auth/login'
      : `/auth/login?redirect=${encodeURIComponent(pathname || '/')}`;

    return (
      <div className="flex items-center gap-1.5 sm:gap-3">
        <Link href={loginUrl} className="rounded-full border-2 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-4 sm:py-2 sm:text-sm">
          Iniciar Sesión
        </Link>
        <Link href="/auth/signup" className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95 sm:px-4 sm:py-2 sm:text-sm">
          Registrarse
        </Link>
      </div>
      );
    }

  /**
   * FUNCIÓN: Logout
   *
   * - llama signOut (del AuthProvider)
   * - luego redirige a home
   */
  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Iniciales: toma los primeros 2 caracteres del email
  // (es una forma rápida de avatar)
  const userInitials = user.email?.substring(0, 2).toUpperCase() || 'U';

  // Traducción del rol a texto amigable
  const roleLabels: Record<string, string> = {
    student: 'Usuario',
    restaurant_admin: 'Admin Restaurante',
    central_admin: 'Admin Central',
    superadmin: 'Superadmin',
  };

  return (
    // Contenedor relativo para posicionar el dropdown
    <div className="relative" ref={menuRef}>

      {/* Botón principal que abre/cierra el menú */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50"
      >
        {/* Avatar con iniciales */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
          {userInitials}
        </div>

        {/* Muestra el username (parte antes del @) solo en pantallas md+ */}
        <span className="hidden md:inline-block">
          {user.email?.split('@')[0]}
        </span>
      </button>

      {/* Si isOpen es true, mostramos el dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">

          {/* Sección superior con info del usuario */}
          <div className="border-b p-4">
            <p className="max-w-full truncate font-medium text-gray-900" title={user.email}>
              {user.email}
            </p>

            {/* Texto del rol */}
            {userRole && (
              <p className="mt-1 text-sm text-gray-600">
                {roleLabels[userRole] || userRole}
              </p>
            )}

            {/* Si es student y ya cargó el balance, mostramos saldo */}
            {userRole === 'student' && creditBalance !== null && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2">
                <Wallet className="h-4 w-4 text-primary-700" />
                <span className="text-sm font-semibold text-primary-700">
                  {/*
                    balance/100:
                    Esto indica que creditBalance viene en "centavos"
                    y lo convierten a pesos para mostrarlo.
                  */}
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(creditBalance / 100)}
                </span>
              </div>
            )}
          </div>

          {/* Lista scrollable con opciones */}
          <div className="max-h-[60vh] overflow-y-auto p-2 pb-20 sm:max-h-[70vh] sm:pb-2">

            {/* MENU PARA STUDENT */}
            {userRole === 'student' && (
              <>
                {/*
                  Nota:
                  En cada link hacen:
                  - stopPropagation() para que no se cierre por event bubbling raro
                  - setIsOpen(false) para cerrar el dropdown al navegar
                */}
                <Link
                  href="/orders"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Package className="h-4 w-4" />
                  Mis Pedidos
                </Link>

                <Link
                  href="/favorites"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Heart className="h-4 w-4" />
                  Favoritos
                </Link>

                <Link
                  href="/credits"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Wallet className="h-4 w-4" />
                  Mis Créditos
                </Link>
                {/*
                <Link
                  href="/payment-methods"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <CreditCard className="h-4 w-4" />
                  Métodos de Pago
                </Link>
                */}
                <Link
                  href="/cases"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4" />
                  Mis Casos
                </Link>

                <Link
                  href="/settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Configuración
                </Link>
              </>
            )}

            {/* MENU PARA RESTAURANT_ADMIN (según PlaceType del negocio) */}
            {userRole === 'restaurant_admin' && (
              <>
                {adminMenuLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Cargando menú del panel…
                  </div>
                )}

                {!adminMenuLoading && adminPlaceType === 'SERVICE' && (
                  <>
                    <Link
                      href="/admin/services"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Sparkles className="h-4 w-4" />
                      Servicios
                    </Link>
                    <Link
                      href="/admin/service-schedule"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Horarios y cupos
                    </Link>
                    <Link
                      href="/admin/service-reservations"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Reservas de servicio
                    </Link>
                    <Link
                      href="/admin/metrics"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      Estadísticas
                    </Link>
                  </>
                )}

                {!adminMenuLoading && adminPlaceType === 'DISCOTECA' && (
                  <>
                    <Link
                      href="/admin/events"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <PartyPopper className="h-4 w-4" />
                      Eventos
                    </Link>
                    <Link
                      href="/admin/tables"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Mesas
                    </Link>
                    <Link
                      href="/admin/table-reservations"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Reservas de mesa
                    </Link>
                    <Link
                      href="/admin/tickets"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Ticket className="h-4 w-4" />
                      Boletas vendidas
                    </Link>
                    <Link
                      href="/admin/menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Utensils className="h-4 w-4" />
                      Menú
                    </Link>
                    <Link
                      href="/admin/metrics"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      Estadísticas
                    </Link>
                    <Link
                      href="/admin/settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Clock className="h-4 w-4" />
                      Horarios y Franjas
                    </Link>
                  </>
                )}

                {!adminMenuLoading &&
                  (adminPlaceType === 'RESTAURANT' || adminPlaceType === null) && (
                  <>
                    <Link
                      href="/admin/orders"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Package className="h-4 w-4" />
                      Panel de Pedidos
                    </Link>

                    <Link
                      href="/admin/menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Utensils className="h-4 w-4" />
                      Gestión de Menú
                    </Link>

                    <Link
                      href="/admin/crm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Users className="h-4 w-4" />
                      CRM - Clientes
                    </Link>

                    <Link
                      href="/admin/invoices"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4" />
                      Facturación Electrónica
                    </Link>

                    <Link
                      href="/admin/commission"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <HandCoins className="h-4 w-4" />
                      Ingresos y Comisiones
                    </Link>

                    <Link
                      href="/admin/metrics"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      Métricas
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Clock className="h-4 w-4" />
                      Horarios y Franjas
                    </Link>

                    <Link
                      href="/admin/coupons"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Tag className="h-4 w-4" />
                      Cupones
                    </Link>

                    <Link
                      href="/admin/reviews"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Reseñas
                    </Link>

                    <Link
                      href="/admin/notifications"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Notificaciones
                    </Link>

                    <Link
                      href="/admin/inventory"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Package className="h-4 w-4" />
                      Inventario
                    </Link>
                  </>
                )}

                {!adminMenuLoading && (
                  <>
                    <Link
                      href="/settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Link>

                    <a
                      href="https://wa.me/573225725739"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                    >
                      <Phone className="h-4 w-4" />
                      Soporte WhatsApp
                    </a>
                  </>
                )}
              </>
            )}

            {/* MENU PARA CENTRAL_ADMIN */}
            {userRole === 'central_admin' && (
              <>
                <Link href="/central-admin/dashboard" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Panel Central
                </Link>

                <Link href="/central-admin/products" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Package className="h-4 w-4" />
                  Menú Maestro
                </Link>
              </>
            )}

            {/* MENU PARA SUPERADMIN */}
            {userRole === 'superadmin' && (
              <>
                <Link href="/superadmin/notifications" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <MessageSquare className="h-4 w-4" />
                  Notificaciones
                </Link>

                <Link href="/superadmin/cases" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4" />
                  Casos
                </Link>

                <Link href="/superadmin/delivery-points" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <MapPin className="h-4 w-4" />
                  Puntos de Entrega
                </Link>

                <Link href="/superadmin/dashboard" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Panel Superadmin
                </Link>
              </>
            )}

            {/* Botón de logout (aparece para todos los roles) */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

