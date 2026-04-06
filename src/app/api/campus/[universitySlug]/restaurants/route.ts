/**
 * GET /api/campus/:universitySlug/restaurants
 * Get list of restaurants for a university
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAvailableSlots } from '../../../../../lib/slots';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ universitySlug: string }> }
) {
  try {
    const { universitySlug } = await params;
    const university = await prisma.place.findUnique({
      where: { slug: universitySlug, isActive: true },
    });

    if (!university) {
      return NextResponse.json(
        { error: 'University not found' },
        { status: 404 }
      );
    }

    const restaurants = await prisma.restaurant.findMany({
      where: {
        placeId: university.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        imageUrl: true,
        description: true,
        openHours: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get next available slot for each restaurant
    const restaurantsWithSlots = await Promise.all(
      restaurants.map(async (restaurant) => {
        const slots = await getAvailableSlots(restaurant.id, 1);
        const nextSlot = slots[0] || null;

        return {
          ...restaurant,
          nextAvailableSlot: nextSlot
            ? {
              slotStart: nextSlot.slotStart,
              slotEnd: nextSlot.slotEnd,
              available: nextSlot.available,
            }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        university: {
          id: university.id,
          name: university.name,
          slug: university.slug,
        },
        restaurants: restaurantsWithSlots,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

