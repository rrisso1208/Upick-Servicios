/**
 * Unit tests for Authentication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/auth/user/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/auth/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if email is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/user', {
      method: 'GET',
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('email');
  });

  it('should return 404 if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/auth/user?email=notfound@test.com',
      {
        method: 'GET',
      }
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return user role if user exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-id',
      email: 'student@test.com',
      role: 'student',
      firstName: 'Test',
      lastName: 'User',
    } as any);

    const req = new NextRequest(
      'http://localhost:3000/api/auth/user?email=student@test.com',
      {
        method: 'GET',
      }
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe('student');
    expect(data.email).toBe('student@test.com');
  });

  it('should normalize email to lowercase', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-id',
      email: 'student@test.com',
      role: 'student',
    } as any);

    const req = new NextRequest(
      'http://localhost:3000/api/auth/user?email=STUDENT@TEST.COM',
      {
        method: 'GET',
      }
    );

    await GET(req);

    // Verify that findUnique was called with lowercase email
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'student@test.com',
        }),
      })
    );
  });
});
