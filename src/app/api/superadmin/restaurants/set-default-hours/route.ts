/**
 * POST /api/superadmin/restaurants/set-default-hours
 * Set default hours for all restaurants without hours or with incomplete hours
 */

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

const defaultOpenHours = {
  monday: { open: '08:00', close: '20:00' },
  tuesday: { open: '08:00', close: '20:00' },
  wednesday: { open: '08:00', close: '20:00' },
  thursday: { open: '08:00', close: '20:00' },
  friday: { open: '08:00', close: '20:00' },
  saturday: { open: '09:00', close: '15:00' },
  sunday: { open: '00:00', close: '00:00' }, // Closed
};

function isValidHours(hours: any): boolean {
  if (!hours || typeof hours !== 'object') return false;

  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of requiredDays) {
    if (!hours[day] || !hours[day].open || !hours[day].close) {
      return false;
    }
  }
  return true;
}

export async function POST() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        openHours: true,
      },
    });

    const updated = [];
    const skipped = [];

    for (const restaurant of restaurants) {
      // Check if restaurant needs hours update
      if (!isValidHours(restaurant.openHours)) {
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            openHours: defaultOpenHours,
          },
        });
        updated.push({
          id: restaurant.id,
          name: restaurant.name,
        });
      } else {
        skipped.push({
          id: restaurant.id,
          name: restaurant.name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Actualizados ${updated.length} restaurantes, ${skipped.length} ya tenían horarios válidos`,
      updated,
      skipped: skipped.slice(0, 5), // Show first 5 skipped
      total: restaurants.length,
    });
  } catch (error) {
    console.error('Error setting default hours:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al configurar horarios',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
