/**
 * Helper to get restaurant ID from authenticated admin user
 *
 * Responsabilidad:
 * - Autenticar al usuario (admin)
 * - Verificar que tenga rol restaurant_admin
 * - Devolver el restaurantId asociado a ese admin
 *
 * 👉 Se usa en APIs privadas tipo:
 * /api/admin/restaurant/overload
 */

import { getAuthUser } from './auth';
import { NextRequest } from 'next/server';

export async function getAdminRestaurant(req?: NextRequest) {
  try {
    let user;

    /**
     * 1️⃣ INTENTO 1: Authorization header (Bearer token)
     * Este camino es MÁS confiable para requests desde frontend (fetch)
     */
    if (req) {
      const authHeader = req.headers.get('authorization');

      if (authHeader) {
        // Import dinámico para evitar cargarlo si no se necesita
        const { getAuthUserFromHeader } = await import('./auth');

        // Decodifica el token y obtiene el usuario
        user = await getAuthUserFromHeader(authHeader);
      }
    }

    /**
     * 2️⃣ INTENTO 2 (fallback): Cookies (SSR / server actions)
     * Si no vino Authorization header o falló, intenta auth por cookies
     */
    if (!user) {
      user = await getAuthUser();
    }

    /**
     * 🔍 Logs de debugging (muy útiles en desarrollo)
     */
    console.log(
      'getAdminRestaurant - User:',
      user
        ? {
          id: user.id,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
        }
        : 'null'
    );

    /**
     * 3️⃣ Validaciones de seguridad
     */

    // No hay usuario autenticado
    if (!user) {
      console.error('getAdminRestaurant - No user found');
      return null;
    }

    // El usuario existe pero NO es admin de restaurante
    if (user.role !== 'restaurant_admin') {
      console.error(
        'getAdminRestaurant - User role is not restaurant_admin:',
        user.role
      );
      return null;
    }

    // Es admin pero no tiene restaurante asignado
    if (!user.restaurantId) {
      console.error('getAdminRestaurant - User has no restaurantId assigned');
      return null;
    }

    /**
     * ✅ Caso exitoso:
     * Devuelve el restaurantId que se usará en la API
     */
    return user.restaurantId;
  } catch (error) {
    console.error('Error getting admin restaurant:', error);
    return null;
  }
}
