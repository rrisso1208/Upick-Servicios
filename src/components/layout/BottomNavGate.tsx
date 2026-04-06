'use client';

import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/providers/AuthProvider';

const ADMIN_ROLES = new Set(['superadmin', 'restaurant_admin', 'central_admin']);

export function BottomNavGate() {
  const { userRole, loading } = useAuth();

  // Evita flicker mientras se resuelve sesión/rol
  if (loading) return null;

  // Si es admin, NO mostrar el BottomNav (en móvil)
  if (userRole && ADMIN_ROLES.has(userRole)) return null;

  // BottomNav solo se ve en móvil
  return (
    <div className="md:hidden">
      <BottomNav />
    </div>
  );
}
