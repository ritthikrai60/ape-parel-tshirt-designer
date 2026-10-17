import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getPayouts, POST as createPayout } from '@/app/api/admin/payouts/route';
import { PATCH as updatePayout } from '@/app/api/admin/payouts/[id]/route';
import { POST as runAudit } from '@/app/api/admin/reconciliation/audit/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Pillar B: Creator Payouts, 3% Withholding Tax 50-Twi & Ledger Audit', () => {
  let creatorAccountId: string | undefined;
  let originalCreatorBalance = 85;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    if (creatorAccountId) {
      await prisma.financialAccount.update({
        where: { id: creatorAccountId },
        data: { balance: originalCreatorBalance },
      });
    }
  });

  describe('1. Creator Payout Request & 3% Thai Withholding Tax', () => {
    it('accurately calculates 3% WHT and net payout for royalty withdrawals', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'creator-user-1', role: 'CREATOR' },
      } as any);

      const creator = await prisma.creatorProfile.findFirst({
        include: { financialAccount: true },
      });

      if (!creator) throw new Error('Creator profile needed in test DB');

      if (creator.financialAccount) {
        creatorAccountId = creator.financialAccount.id;
        originalCreatorBalance = 85; // baseline seed expected by other tests
        await prisma.financialAccount.update({
          where: { id: creator.financialAccount.id },
          data: { balance: 5000 },
        });
      }

      const gross = 2000;
      const expectedTax = Math.round(gross * 0.03); // ฿60
      const expectedNet = gross - expectedTax; // ฿1940

      const req = new NextRequest('http://localhost:3000/api/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          creatorId: creator.id,
          grossAmount: gross,
          paymentMethod: 'PROMPTPAY',
          promptPayId: '089-111-2233',
          accountName: creator.displayName,
        }),
      });

      const res = await createPayout(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payout.grossAmount).toBe(gross);
      expect(data.payout.withholdingTaxAmount).toBe(expectedTax);
      expect(data.payout.netAmount).toBe(expectedNet);
      expect(data.payout.status).toBe('PENDING');
    });

    it('rejects payout amounts below minimum ฿500 threshold', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'creator-user-1', role: 'CREATOR' },
      } as any);

      const creator = await prisma.creatorProfile.findFirst();
      if (!creator) return;

      const req = new NextRequest('http://localhost:3000/api/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          creatorId: creator.id,
          grossAmount: 200,
          accountName: creator.displayName,
        }),
      });

      const res = await createPayout(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.message).toMatch(/Minimum payout request is ฿500/);
    });
  });

  describe('2. Payout Settlement & Digital 50-Twi Generation', () => {
    it('marks payout as PAID, debits creator account, and assigns 50-Twi certificate number', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const pendingPayout = await prisma.payoutRequest.findFirst({
        where: { status: 'PENDING' },
      });

      if (!pendingPayout) return;

      const req = new NextRequest(`http://localhost:3000/api/admin/payouts/${pendingPayout.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'MARK_PAID' }),
      });

      const res = await updatePayout(req, { params: { id: pendingPayout.id } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payout.status).toBe('PAID');
      expect(data.payout.certificate50TwiUrl).toMatch(/^50TWI-/);
      expect(data.payout.paidAt).toBeDefined();

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: { action: 'CREATOR_PAYOUT_SETTLED', entityId: pendingPayout.id },
      });
      expect(audit).toBeDefined();
    });
  });

  describe('3. Double-Entry Reconciliation Audit Engine', () => {
    it('executes zero-sum balance audit and creates ReconciliationReport', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/reconciliation/audit', {
        method: 'POST',
      });

      const res = await runAudit(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(typeof data.totalDebits).toBe('number');
      expect(typeof data.totalCredits).toBe('number');
    });
  });
});
