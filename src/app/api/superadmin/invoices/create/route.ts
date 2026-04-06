import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { payoutCycleId, number, amount, dueDate, pdfUrl, notes } = body;

    if (!payoutCycleId || !number || !amount || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if invoice number exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { number },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice number already exists' },
        { status: 400 }
      );
    }

    // Create Invoice
    const invoice = await prisma.invoice.create({
      data: {
        payoutCycleId,
        number,
        issueDate: new Date(),
        dueDate: new Date(dueDate),
        amount,
        status: 'issued',
        pdfUrl,
        notes,
      },
    });

    // Update PayoutCycle status
    await prisma.payoutCycle.update({
      where: { id: payoutCycleId },
      data: { status: 'invoiced' },
    });

    return NextResponse.json({ success: true, data: { invoice } });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
