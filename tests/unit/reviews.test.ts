/**
 * Unit tests for Reviews API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/reviews/route';
import { GET } from '../../src/app/api/reviews/[restaurantId]/route';

// Mock Prisma
vi.mock('../../src/lib/db', () => ({
  prisma: {
    review: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    restaurant: {
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('../../src/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a review successfully', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-1',
      studentId: 'user-1',
      restaurantId: 'restaurant-1',
      items: [
        {
          productId: 'product-1',
          product: { id: 'product-1', name: 'Product 1' },
        },
      ],
      restaurant: { id: 'restaurant-1' },
    } as any);

    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.review.create).mockResolvedValue({
      id: 'review-1',
      orderId: 'order-1',
      restaurantId: 'restaurant-1',
      userId: 'user-1',
      rating: 5,
      comment: 'Great!',
    } as any);

    vi.mocked(prisma.review.findMany).mockResolvedValue([
      { rating: 5 },
      { rating: 4 },
    ] as any);

    vi.mocked(prisma.restaurant.update).mockResolvedValue({} as any);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        orderId: 'order-1',
        restaurantId: 'restaurant-1',
        rating: 5,
        comment: 'Great!',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.review.create).toHaveBeenCalled();
  });

  it('should reject review if order does not belong to user', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-1',
      studentId: 'user-2', // Different user
      restaurantId: 'restaurant-1',
    } as any);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        orderId: 'order-1',
        restaurantId: 'restaurant-1',
        rating: 5,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should reject review if already exists', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-1',
      studentId: 'user-1',
      restaurantId: 'restaurant-1',
    } as any);

    vi.mocked(prisma.review.findUnique).mockResolvedValue({
      id: 'review-1',
    } as any);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        orderId: 'order-1',
        restaurantId: 'restaurant-1',
        rating: 5,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already exists');
  });
});

describe('GET /api/reviews/[restaurantId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return reviews for restaurant', async () => {
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(prisma.review.findMany).mockResolvedValue([
      {
        id: 'review-1',
        rating: 5,
        createdAt: new Date(),
        product: { id: 'product-1', name: 'Product 1' },
      },
    ] as any);

    const req = new NextRequest('http://localhost/api/reviews/restaurant-1');
    const response = await GET(req, {
      params: Promise.resolve({ restaurantId: 'restaurant-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.reviews).toHaveLength(1);
    expect(data.data.reviews[0].rating).toBe(5);
  });
});
