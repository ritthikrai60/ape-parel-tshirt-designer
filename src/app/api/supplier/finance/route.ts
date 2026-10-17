import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSupplierFinancialLedger,
  requestSupplierPayout,
} from '@/lib/supplier';

export const dynamic = 'force-dynamic';

const payoutRequestSchema = z
  .object({
    supplier: z.string().min(1),
    amount: z.number().int().min(1),
    method: z.enum(['PROMPTPAY', 'BANK_TRANSFER']),
    recipientId: z.string().min(3),
    bankName: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.method === 'BANK_TRANSFER') {
        return Boolean(data.bankName && data.bankName.trim().length > 0);
      }
      return true;
    },
    {
      message: 'Bank name is required when payout method is BANK_TRANSFER',
      path: ['bankName'],
    }
  );

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const supplierQuery = searchParams.get('supplier') || 'bangkok-garment-craft';

  try {
    const summary = await getSupplierFinancialLedger(supplierQuery);
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('[GET /api/supplier/finance] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch financial ledger' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const parsed = payoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', issues: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await requestSupplierPayout({
      supplierIdOrSlug: parsed.data.supplier,
      amount: parsed.data.amount,
      method: parsed.data.method,
      recipientId: parsed.data.recipientId,
      bankName: parsed.data.bankName,
      notes: parsed.data.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Payout request ${result.payoutReference} of ฿${result.amount.toLocaleString()} submitted successfully`,
      payout: result,
    });
  } catch (error: any) {
    console.error('[POST /api/supplier/finance] Error:', error);
    return NextResponse.json(
      { error: 'Payment Request Error', message: error?.message || 'Failed to process payout' },
      { status: 400 }
    );
  }
}
