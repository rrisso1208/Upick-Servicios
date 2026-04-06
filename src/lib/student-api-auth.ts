import { NextRequest } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from './auth';
import type { AuthUser } from './auth';

export async function getAuthenticatedStudent(
  req: NextRequest
): Promise<AuthUser | null> {
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  let user: AuthUser | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    user = await getAuthUserFromHeader(authHeader);
  }
  if (!user) {
    user = await getAuthUser();
  }
  if (!user || user.role !== 'student') {
    return null;
  }
  return user;
}
