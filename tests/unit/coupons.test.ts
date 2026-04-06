/**
 * Unit tests for Coupons API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/coupons/validate/route';
import {
  GET,
  POST as CREATE_COUPON,
} from '../../src/app/api/admin/coupons/route';

// Mock Prisma
vi.mock('../../src/lib/db', () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('../../src/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('../../src/lib/admin-helpers', () => ({
  getAdminRestaurant: vi.fn(),
}));

describe('POST /api/coupons/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate coupon successfully', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    const now = new Date();
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-1',
      code: 'TEST10',
      restaurantId: 'restaurant-1',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: null,
      maxUses: null,
      usedCount: 0,
      isActive: true,
      validFrom: new Date(now.getTime() - 86400000), // Yesterday
      validUntil: new Date(now.getTime() + 86400000), // Tomorrow
      restaurant: null,
      university: null,
    } as any);

    const req = new NextRequest('http://localhost/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: 'TEST10',
        restaurantId: 'restaurant-1',
        orderAmount: 50000, // 50,000 COP
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.coupon.code).toBe('TEST10');
    expect(data.data.discountAmount).toBe(5000); // 10% of 50,000
  });

  it('should reject expired coupon', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    const now = new Date();
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-1',
      code: 'EXPIRED',
      isActive: true,
      validFrom: new Date(now.getTime() - 172800000), // 2 days ago
      validUntil: new Date(now.getTime() - 86400000), // Yesterday (expired)
    } as any);

    const req = new NextRequest('http://localhost/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: 'EXPIRED',
        restaurantId: 'restaurant-1',
        orderAmount: 50000,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('vigencia');
  });

  it('should reject coupon if order amount is below minimum', async () => {
    const { getAuthUser } = await import('../../src/lib/auth');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: 'student',
    });

    const now = new Date();
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-1',
      code: 'MIN50',
      isActive: true,
      minOrderAmount: 50000, // Minimum 50,000 COP
      validFrom: new Date(now.getTime() - 86400000),
      validUntil: new Date(now.getTime() + 86400000),
    } as any);

    const req = new NextRequest('http://localhost/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: 'MIN50',
        restaurantId: 'restaurant-1',
        orderAmount: 30000, // Below minimum
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('pedido mínimo');
  });
});

describe('GET /api/admin/coupons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return coupons for restaurant', async () => {
    const { getAdminRestaurant } = await import('../../src/lib/admin-helpers');
    const { prisma } = await import('../../src/lib/db');

    vi.mocked(getAdminRestaurant).mockResolvedValue('restaurant-1');
    vi.mocked(prisma.coupon.findMany).mockResolvedValue([
      {
        id: 'coupon-1',
        code: 'TEST10',
        discountType: 'percentage',
        discountValue: 10,
        usedCount: 5,
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(),
      },
    ] as any);

    const req = new NextRequest('http://localhost/api/admin/coupons');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.coupons).toHaveLength(1);
  });
});
