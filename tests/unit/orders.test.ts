/**
 * Unit tests for Order API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/orders/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    restaurant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    productCapacity: {
      findUnique: vi.fn(),
    },
    orderItem: {
      count: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/slots', () => ({
  getAvailableSlots: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  generatePickupCode: vi.fn(() => '123456'),
}));

vi.mock('@/lib/validations/order', () => ({
  createOrderSchema: {
    parse: vi.fn((data) => data),
  },
}));

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'test-restaurant-id',
        items: [],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 if user is not a student', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-id',
      email: 'admin@test.com',
      role: 'restaurant_admin',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'test-restaurant-id',
        items: [],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if restaurant not found', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-id',
      email: 'student@test.com',
      role: 'student',
    } as any);

    vi.mocked(prisma.restaurant.findUnique).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'non-existent-restaurant',
        items: [],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Restaurant not found');
  });

  it('should return 503 if restaurant is overloaded', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-id',
      email: 'student@test.com',
      role: 'student',
    } as any);

    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);

    vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({
      id: 'restaurant-id',
      isOverloaded: true,
      overloadUntil: futureDate,
      pickupSlotMinutes: 10,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'restaurant-id',
        items: [],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Restaurante sobre pedidos');
    expect(data.message).toContain('El restaurante está a full capacidad');
  });

  it('should return 400 if product not found', async () => {
    const { getAuthUser } = await import('@/lib/auth');
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-id',
      email: 'student@test.com',
      role: 'student',
    } as any);

    vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({
      id: 'restaurant-id',
      isOverloaded: false,
      overloadUntil: null,
      pickupSlotMinutes: 10,
    } as any);

    const { getAvailableSlots } = await import('@/lib/slots');
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);
    vi.mocked(getAvailableSlots).mockResolvedValue([
      {
        slotStart: futureDate,
        slotEnd: new Date(futureDate.getTime() + 10 * 60000),
        available: 10,
        capacity: 10,
      },
    ]);

    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'restaurant-id',
        items: [
          {
            productId: 'non-existent-product',
            quantity: 1,
            options: [],
          },
        ],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not found or inactive');
  });
});
