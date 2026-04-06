/**
 * GET /api/superadmin/universities - Get all places
 * POST /api/superadmin/universities - Create place
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Database configuration error',
          details: 'DATABASE_URL environment variable is not set.',
        },
        { status: 503 }
      );
    }

    console.log('Fetching places from database...');

    // Get places with all fields including imageUrl and city
    const placesRaw = await prisma.place.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        cityId: true,
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        imageUrl: true,
        imagePosition: true,
        imageScale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    }) as any[];

    console.log(`Found ${placesRaw.length} places in database`);

    // Get restaurant counts separately for each place
    const places = await Promise.all(
      placesRaw.map(async (p) => {
        const restaurantCount = await prisma.restaurant.count({
          where: { placeId: p.id },
        });

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: (p as any).category,
          cityId: (p as any).cityId,
          city: (p as any).city,
          imageUrl: p.imageUrl,
          imagePosition: p.imagePosition,
          imageScale: p.imageScale,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          _count: {
            restaurants: restaurantCount,
          },
        };
      })
    );

    console.log(`Processed ${places.length} places with counts`);

    return NextResponse.json({
      success: true,
      data: { universities: places }, // Mantener 'universities' para compatibilidad con el frontend
    });
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      name: error?.name || 'Error',
      meta: error?.meta || null,
    };

    console.error('Error fetching places:', errorDetails);
    console.error('Full error:', error);

    // Check for connection errors
    const isConnectionError =
      errorDetails.message?.includes("Can't reach database") ||
      errorDetails.code === 'P1001' ||
      errorDetails.code === 'P1000' ||
      errorDetails.message?.includes('ECONNREFUSED') ||
      errorDetails.message?.includes('connection') ||
      errorDetails.message?.includes('timeout') ||
      errorDetails.message?.includes('ECONNRESET');

    if (isConnectionError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error',
          details:
            'Unable to connect to the database. Please check DATABASE_URL configuration.',
          code: errorDetails.code,
        },
        { status: 503 }
      );
    }

    // Return detailed error for debugging
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener lugares',
        details: errorDetails.message,
        code: errorDetails.code,
        name: errorDetails.name,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, category, cityId, imageUrl, imagePosition, imageScale, isActive } = body;

    if (!name || !slug || !cityId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos (nombre, slug y ciudad son obligatorios)' },
        { status: 400 }
      );
    }

    const place = await prisma.place.create({
      data: {
        name,
        slug,
        category: category || null,
        cityId: cityId || null,
        imageUrl: imageUrl || null,
        imagePosition: imagePosition || 'center',
        imageScale: imageScale || 1.0,
        isActive: isActive !== undefined ? isActive : true,
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: place,
    });
  } catch (error) {
    console.error('Error creating place:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear lugar',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
