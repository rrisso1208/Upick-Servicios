
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let user = await getAuthUser();

        if (!user) {
            const headersList = await headers();
            const authHeader = headersList.get('authorization');
            if (authHeader) {
                user = await getAuthUserFromHeader(authHeader);
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                documentType: true,
                documentNumber: true,
                invoiceData: {
                    select: {
                        documentType: true,
                        documentNumber: true,
                    },
                },
            },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: dbUser,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
