import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateWithholdingTax,
  generate50TawiSummary,
  calculateLedgerTotals,
  calculateLedgerRunningBalances,
  verifyLedgerBalanceConservation,
  getCreatorJournalData,
  WITHHOLDING_TAX_RATE,
  MIN_PAYOUT_THRESHOLD_THB,
} from '@/lib/creatorJournal';
import { executeCreatorPayoutSettlement } from '@/lib/royalties';
import { GET as getCreatorJournalApi } from '@/app/api/creator/journal/route';
import { POST as postSettleApi } from '@/app/api/royalties/settle/route';
import CreatorJournalPage from '@/app/creator/journal/page';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'test-admin', role: 'ADMIN' },
  }),
}));

describe('Creator Journal, 3% Withholding Tax & Settlement Suite (R1 - R4)', () => {
  // Isolated test entities for zero regression and clean teardown
  let isolatedUser: any;
  let isolatedCreator: any;
  let isolatedArtwork: any;
  let isolatedLicense: any;
  let isolatedOrder: any;
  let isolatedDesign: any;
  let isolatedObligation: any;
  let isolatedLedgerEntry: any;

  const createdSettlementIds: string[] = [];

  beforeAll(async () => {
    // 1. Create isolated creator user
    isolatedUser = await prisma.user.create({
      data: {
        email: `journal-tester-${Date.now()}@ape-parel.com`,
        name: 'Journal Test Creator',
        role: 'CREATOR',
      },
    });

    // 2. Create isolated creator profile
    isolatedCreator = await prisma.creatorProfile.create({
      data: {
        userId: isolatedUser.id,
        slug: `journal-test-${Date.now()}`,
        displayName: 'Journal Test Studio',
        payoutDetails: 'PromptPay: 081-998-7711 (Bangkok Bank)',
      },
    });

    // 3. Create isolated artwork
    isolatedArtwork = await prisma.artwork.create({
      data: {
        creatorId: isolatedCreator.id,
        title: 'Cyber Lotus Glitch',
        description: 'Exclusive streetwear floral graphic',
        previewUrl: '/uploads/cyber-lotus.png',
        originalUrl: '/assets/cyber-lotus.png',
        mimeType: 'image/png',
        tags: 'cyber,streetwear',
      },
    });

    // 4. Create isolated license option
    isolatedLicense = await prisma.licenseOption.create({
      data: {
        artworkId: isolatedArtwork.id,
        name: 'COMMERCIAL_GARMENT',
        terms: 'Standard Garment License',
        price: 150,
      },
    });
  });

  afterAll(async () => {
    // Clean up all isolated test data in reverse foreign-key order
    if (createdSettlementIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: {
          entityType: 'CreatorSettlement',
          entityId: { in: createdSettlementIds },
        },
      });
      await prisma.creatorSettlement.deleteMany({
        where: { id: { in: createdSettlementIds } },
      });
    }

    if (isolatedCreator) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { creatorId: isolatedCreator.id },
      });
      await prisma.royaltyObligation.deleteMany({
        where: { creatorId: isolatedCreator.id },
      });
    }

    if (isolatedOrder) {
      await prisma.order.deleteMany({
        where: { id: isolatedOrder.id },
      });
    }

    if (isolatedDesign) {
      await prisma.designDocument.deleteMany({
        where: { id: isolatedDesign.id },
      });
    }

    if (isolatedLicense) {
      await prisma.licenseOption.deleteMany({
        where: { id: isolatedLicense.id },
      });
    }

    if (isolatedArtwork) {
      await prisma.artwork.deleteMany({
        where: { id: isolatedArtwork.id },
      });
    }

    if (isolatedCreator) {
      await prisma.creatorProfile.deleteMany({
        where: { id: isolatedCreator.id },
      });
    }

    if (isolatedUser) {
      await prisma.user.deleteMany({
        where: { id: isolatedUser.id },
      });
    }
  });

  // ==========================================================================
  // SECTION 1: 3% WITHHOLDING TAX (WHT) COMPUTATION ACCURACY
  // ==========================================================================
  describe('1. 3% Withholding Tax (WHT) Calculations', () => {
    it('verifies standard withholding tax rate is strictly 3% (0.03)', () => {
      expect(WITHHOLDING_TAX_RATE).toBe(0.03);
    });

    it('computes 3% withholding tax accurately across benchmark amounts', () => {
      // 0 THB
      const zeroResult = calculateWithholdingTax(0);
      expect(zeroResult.grossAmount).toBe(0);
      expect(zeroResult.taxRate).toBe(0.03);
      expect(zeroResult.taxAmount).toBe(0);
      expect(zeroResult.netAmount).toBe(0);

      // 100 THB -> WHT: 3 THB, Net: 97 THB
      const hundredResult = calculateWithholdingTax(100);
      expect(hundredResult.grossAmount).toBe(100);
      expect(hundredResult.taxAmount).toBe(3);
      expect(hundredResult.netAmount).toBe(97);

      // 125 THB -> WHT: 3.75 THB, Net: 121.25 THB
      const bench125 = calculateWithholdingTax(125);
      expect(bench125.taxAmount).toBe(3.75);
      expect(bench125.netAmount).toBe(121.25);

      // 410 THB (ape-parel standard tee benchmark) -> WHT: 12.30 THB, Net: 397.70 THB
      const bench410 = calculateWithholdingTax(410);
      expect(bench410.taxAmount).toBe(12.3);
      expect(bench410.netAmount).toBe(397.7);

      // 1,000 THB -> WHT: 30 THB, Net: 970 THB
      const thousandResult = calculateWithholdingTax(1000);
      expect(thousandResult.taxAmount).toBe(30);
      expect(thousandResult.netAmount).toBe(970);

      // 10,000 THB -> WHT: 300 THB, Net: 9,700 THB
      const tenThousandResult = calculateWithholdingTax(10000);
      expect(tenThousandResult.taxAmount).toBe(300);
      expect(tenThousandResult.netAmount).toBe(9700);
    });

    it('handles decimal precision and Thai satang rounding properly', () => {
      // 333.33 THB -> 333.33 * 0.03 = 9.9999 -> rounds to 10.00 THB
      const decimalResult = calculateWithholdingTax(333.33);
      expect(decimalResult.taxAmount).toBe(10);
      expect(decimalResult.netAmount).toBe(323.33);
      expect(decimalResult.grossAmount).toBe(333.33);
    });

    it('safely clamps negative amounts to 0 without generating negative tax', () => {
      const negativeResult = calculateWithholdingTax(-500);
      expect(negativeResult.grossAmount).toBe(0);
      expect(negativeResult.taxAmount).toBe(0);
      expect(negativeResult.netAmount).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 2: DIGITAL 50 TAWI TAX SLIP SUMMARY GENERATOR
  // ==========================================================================
  describe('2. Digital 50 Tawi (หนังสือรับรองการหักภาษี ณ ที่จ่าย) Generator', () => {
    it('generates fully populated, transparent royalty settlement summary', () => {
      const testDate = new Date('2026-10-15T10:00:00Z');
      const summary = generate50TawiSummary(
        {
          id: 'creator_dash_01',
          displayName: 'Dash Ape Studio',
          slug: 'dash-ape',
          payoutDetails: 'PromptPay: 081-998-7711',
        },
        10000,
        testDate
      );

      // Form header & transparent description
      expect(summary.formName).toContain('ใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์');
      expect(summary.formName).toContain('Royalty Settlement Statement');
      expect(summary.status).toBe('VERIFIED');

      // Payer details (Platform settlement service)
      expect(summary.payer.companyNameTh).toBe('ระบบแพลตฟอร์ม APE-PAREL (Platform Settlement Services)');
      expect(summary.payer.companyNameEn).toBe('APE-PAREL Platform Settlement Services');
      expect(summary.payer.taxId).toBe('PLATFORM-SETTLEMENT');
      expect(summary.payer.address).toContain('APE-PAREL');

      // Payee details
      expect(summary.payee.creatorId).toBe('creator_dash_01');
      expect(summary.payee.displayName).toBe('Dash Ape Studio');
      expect(summary.payee.slug).toBe('dash-ape');
      expect(summary.payee.taxOrPayoutId).toBe('PromptPay: 081-998-7711');

      // Income Category (Section 40(3) Royalties & Buddhist Era 2569)
      expect(summary.incomeCategory.section).toContain('มาตรา 40(3)');
      expect(summary.incomeCategory.taxYear).toBe(2026 + 543); // 2569

      // Tax breakdown
      expect(summary.taxCalculation.grossAmount).toBe(10000);
      expect(summary.taxCalculation.taxRate).toBe(0.03);
      expect(summary.taxCalculation.taxAmount).toBe(300);
      expect(summary.taxCalculation.netAmount).toBe(9700);

      // Verifiable ledger reference
      expect(summary.auditDigest).toMatch(/^REF:ROYALTY-CREATO-[0-9A-F]{8}-2026$/);
      expect(summary.issuedAt).toBe(testDate.toISOString());
    });

    it('falls back gracefully when creator payout details are null or omitted', () => {
      const summary = generate50TawiSummary(
        {
          id: 'creator_unseeded_99',
          displayName: 'Solo Creator',
          slug: 'solo-creator',
          payoutDetails: null,
        },
        500
      );

      expect(summary.payee.taxOrPayoutId).toContain('REF-ID-CREATOR_');
      expect(summary.taxCalculation.taxAmount).toBe(15);
      expect(summary.taxCalculation.netAmount).toBe(485);
    });
  });

  // ==========================================================================
  // SECTION 3: DOUBLE-ENTRY LEDGER SUMMATION & BALANCE CONSERVATION
  // ==========================================================================
  describe('3. Double-Entry Ledger Summation & Running Balance Verification', () => {
    it('computes accurate totals from itemized ledger entries', () => {
      const sampleEntries = [
        { amount: 150, entryType: 'EARNING' },
        { amount: 60, entryType: 'EARNING' },
        { amount: 200, entryType: 'EARNING' },
        { amount: -300, entryType: 'PAYOUT_SETTLEMENT' },
        { amount: 90, entryType: 'EARNING' },
        { amount: -100, entryType: 'PAYOUT_SETTLEMENT' },
      ];

      const totals = calculateLedgerTotals(sampleEntries);
      expect(totals.totalEarnings).toBe(500); // 150 + 60 + 200 + 90
      expect(totals.totalPayouts).toBe(400); // 300 + 100
      expect(totals.netBalance).toBe(100); // 500 - 400
    });

    it('calculates chronological running balance sequence correctly', () => {
      const entries = [
        { amount: 120 },
        { amount: 80 },
        { amount: -50 },
        { amount: 200 },
        { amount: -150 },
      ];

      const runningBalances = calculateLedgerRunningBalances(entries, 0);
      expect(runningBalances).toEqual([120, 200, 150, 350, 200]);
    });

    it('verifies strict double-entry balance conservation without discrepancies', () => {
      const consistentLedger = [
        { amount: 100, balanceAfter: 100, entryType: 'EARNING' },
        { amount: 250, balanceAfter: 350, entryType: 'EARNING' },
        { amount: -200, balanceAfter: 150, entryType: 'PAYOUT_SETTLEMENT' },
        { amount: 50, balanceAfter: 200, entryType: 'EARNING' },
      ];

      const audit = verifyLedgerBalanceConservation(consistentLedger, 0);
      expect(audit.isConserved).toBe(true);
      expect(audit.discrepanciesCount).toBe(0);
      expect(audit.totalEarnings).toBe(400);
      expect(audit.totalPayouts).toBe(200);
      expect(audit.netBalance).toBe(200);
    });

    it('flags discrepancies if balanceAfter was tampered with or desynchronized', () => {
      const corruptedLedger = [
        { amount: 100, balanceAfter: 100, entryType: 'EARNING' },
        { amount: 50, balanceAfter: 999, entryType: 'EARNING' }, // Desynchronized!
        { amount: -50, balanceAfter: 100, entryType: 'PAYOUT_SETTLEMENT' },
      ];

      const audit = verifyLedgerBalanceConservation(corruptedLedger, 0);
      expect(audit.isConserved).toBe(false);
      expect(audit.discrepanciesCount).toBeGreaterThanOrEqual(1);
    });

    it('handles empty entries array gracefully', () => {
      const totals = calculateLedgerTotals([]);
      expect(totals.totalEarnings).toBe(0);
      expect(totals.totalPayouts).toBe(0);
      expect(totals.netBalance).toBe(0);

      const audit = verifyLedgerBalanceConservation([]);
      expect(audit.isConserved).toBe(true);
      expect(audit.entryCount).toBe(0);
      expect(audit.netBalance).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 4: SETTLEMENT EXECUTION & BALANCE DEDUCTION
  // ==========================================================================
  describe('4. Instant Settlement Execution & Ledger Conservation', () => {
    it('executes atomic payout settlement, deducts balance, and writes PAYOUT_SETTLEMENT entry', async () => {
      // Setup: create 2 eligible obligations and an initial ledger entry for isolatedCreator
      const baseOrder = await prisma.order.findFirstOrThrow();

      const ob1 = await prisma.royaltyObligation.create({
        data: {
          orderId: baseOrder.id,
          creatorId: isolatedCreator.id,
          artworkId: isolatedArtwork.id,
          licenseOptionId: isolatedLicense.id,
          unitRoyalty: 150,
          quantity: 2,
          totalAmount: 300,
          status: 'ELIGIBLE',
        },
      });

      const ob2 = await prisma.royaltyObligation.create({
        data: {
          orderId: baseOrder.id,
          creatorId: isolatedCreator.id,
          artworkId: isolatedArtwork.id,
          licenseOptionId: isolatedLicense.id,
          unitRoyalty: 150,
          quantity: 1,
          totalAmount: 150,
          status: 'ELIGIBLE',
        },
      });

      // Post initial earning ledger entry: +450 THB
      await prisma.royaltyLedgerEntry.create({
        data: {
          creatorId: isolatedCreator.id,
          entryType: 'EARNING',
          amount: 450,
          balanceAfter: 450,
          reference: 'INIT-EARNING-TEST',
          notes: 'Test initial earning entry',
        },
      });

      // Execute settlement via library function
      const settlement = await executeCreatorPayoutSettlement(isolatedCreator.id, {
        payoutRef: 'PromptPay: 081-998-7711',
        notes: 'Verification test payout settlement',
      });

      createdSettlementIds.push(settlement.settlementId);

      // Verify settlement outcome
      expect(settlement.totalAmount).toBe(450);
      expect(settlement.settledObligationsCount).toBe(2);
      expect(settlement.balanceBefore).toBe(450);
      expect(settlement.balanceAfter).toBe(0);
      expect(settlement.payoutReference).toBe('PromptPay: 081-998-7711');
      expect(settlement.settlementNumber).toMatch(/^APX-STL-/);

      // Verify negative PAYOUT_SETTLEMENT ledger entry was created
      const payoutEntry = await prisma.royaltyLedgerEntry.findUnique({
        where: { id: settlement.ledgerEntryId },
      });
      expect(payoutEntry).not.toBeNull();
      expect(payoutEntry?.entryType).toBe('PAYOUT_SETTLEMENT');
      expect(payoutEntry?.amount).toBe(-450);
      expect(payoutEntry?.balanceAfter).toBe(0);
      expect(payoutEntry?.reference).toBe(settlement.settlementNumber);

      // Verify obligations transitioned to SETTLED
      const updatedObs = await prisma.royaltyObligation.findMany({
        where: { id: { in: [ob1.id, ob2.id] } },
      });
      for (const ob of updatedObs) {
        expect(ob.status).toBe('SETTLED');
      }
    });

    it('rejects settlement when creator has zero eligible obligations', async () => {
      await expect(
        executeCreatorPayoutSettlement(isolatedCreator.id, {
          payoutRef: 'PromptPay: 081-998-7711',
        })
      ).rejects.toThrow(/No eligible royalty obligations found/);
    });
  });

  // ==========================================================================
  // SECTION 5: CREATOR JOURNAL DATA AGGREGATION & API ENDPOINT
  // ==========================================================================
  describe('5. Creator Journal Aggregation Service & API Route', () => {
    it('getCreatorJournalData loads summary, entries, 3% tax, and 50 Tawi slip', async () => {
      // Use benchmark seed creator 'dash-ape'
      const journalData = await getCreatorJournalData('dash-ape');

      expect(journalData.summary).toBeDefined();
      expect(journalData.summary.slug).toBe('dash-ape');
      expect(journalData.summary.currentBalance).toBeGreaterThanOrEqual(0);
      expect(journalData.summary.lifetimeEarnings).toBeGreaterThanOrEqual(0);

      expect(journalData.entries).toBeInstanceOf(Array);
      expect(journalData.tax).toBeDefined();
      expect(journalData.tax.taxRate).toBe(0.03);
      expect(journalData.tax.grossAmount).toBe(journalData.summary.lifetimeEarnings);
      expect(journalData.tax.taxAmount).toBe(
        Math.round(journalData.summary.lifetimeEarnings * 0.03 * 100) / 100
      );

      expect(journalData.taxSlip).toBeDefined();
      expect(journalData.taxSlip.payer.taxId).toBe('PLATFORM-SETTLEMENT');
      expect(journalData.taxSlip.payee.slug).toBe('dash-ape');
      expect(journalData.taxSlip.auditDigest).toContain('REF:ROYALTY-');
      expect(journalData.minThreshold).toBe(MIN_PAYOUT_THRESHOLD_THB);
    });

    it('GET /api/creator/journal returns 200 OK for valid creatorId', async () => {
      const req = new NextRequest('http://localhost:3000/api/creator/journal?creatorId=dash-ape');
      const res = await getCreatorJournalApi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.summary.slug).toBe('dash-ape');
      expect(json.tax.taxRate).toBe(0.03);
      expect(json.taxSlip.formName).toContain('ใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์');
      expect(json.minThreshold).toBe(100);
    });

    it('GET /api/creator/journal rejects missing creatorId with HTTP 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/creator/journal');
      const res = await getCreatorJournalApi(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Bad Request');
      expect(json.message).toContain('creatorId');
    });

    it('GET /api/creator/journal rejects non-existent creator with HTTP 404 Not Found', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/creator/journal?creatorId=non_existent_creator_xyz'
      );
      const res = await getCreatorJournalApi(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Not Found');
    });
  });

  // ==========================================================================
  // SECTION 6: ADVERSARIAL & STRESS TESTING (CLOCK SKEW, MALFORMED DATA, CONCURRENCY)
  // ==========================================================================
  describe('6. Adversarial Stress & Robustness Suite', () => {
    it('handles non-finite inputs (NaN, Infinity) and unusual tax rates in calculateWithholdingTax', () => {
      // NaN gross
      const nanResult = calculateWithholdingTax(NaN);
      expect(nanResult.grossAmount).toBe(0);
      expect(nanResult.taxAmount).toBe(0);
      expect(nanResult.netAmount).toBe(0);

      // Infinity gross
      const infResult = calculateWithholdingTax(Infinity);
      expect(infResult.grossAmount).toBe(0);
      expect(infResult.taxAmount).toBe(0);
      expect(infResult.netAmount).toBe(0);

      // Custom tax rate: 5% (0.05)
      const customRate = calculateWithholdingTax(1000, 0.05);
      expect(customRate.taxRate).toBe(0.05);
      expect(customRate.taxAmount).toBe(50);
      expect(customRate.netAmount).toBe(950);

      // Negative tax rate defaults safely to standard 3%
      const invalidRate = calculateWithholdingTax(1000, -0.1);
      expect(invalidRate.taxRate).toBe(0.03);
      expect(invalidRate.taxAmount).toBe(30);
    });

    it('resists Buddhist Era clock skew and avoids double conversion (year 3112 bug)', () => {
      // Create a date where getFullYear() returns 2569 (as in certain Thai server clocks or BE timestamps)
      const beDate = new Date('2569-10-15T12:00:00Z');
      const summary = generate50TawiSummary(
        {
          id: 'creator_clock_skew_01',
          displayName: 'Clock Skew Creator',
          slug: 'clock-skew',
          payoutDetails: 'PromptPay: 081-998-7711',
        },
        5000,
        beDate
      );

      // The taxYear should normalize properly to 2569, NEVER 2569 + 543 = 3112!
      expect(summary.incomeCategory.taxYear).toBe(2569);
      // The audit digest should reflect the normalized Gregorian year 2026
      expect(summary.auditDigest).toContain('-2026');
    });

    it('processes leap year date without errors in 50 Tawi generator', () => {
      const leapDate = new Date('2028-02-29T12:00:00Z');
      const summary = generate50TawiSummary(
        {
          id: 'creator_leap_01',
          displayName: 'Leap Year Creator',
          slug: 'leap-year',
        },
        2000,
        leapDate
      );

      expect(summary.incomeCategory.taxYear).toBe(2028 + 543);
      expect(summary.auditDigest).toContain('-2028');
    });

    it('handles null, undefined, and malformed inputs to ledger calculation functions gracefully', () => {
      // Null / undefined entries
      expect(calculateLedgerTotals(null as any)).toEqual({
        totalEarnings: 0,
        totalPayouts: 0,
        netBalance: 0,
      });
      expect(calculateLedgerTotals(undefined as any)).toEqual({
        totalEarnings: 0,
        totalPayouts: 0,
        netBalance: 0,
      });

      expect(calculateLedgerRunningBalances(null as any)).toEqual([]);
      expect(calculateLedgerRunningBalances(undefined as any)).toEqual([]);

      const nullAudit = verifyLedgerBalanceConservation(null as any);
      expect(nullAudit.isConserved).toBe(true);
      expect(nullAudit.netBalance).toBe(0);

      // Entries containing NaN or non-numeric amount
      const corruptEntries = [
        { amount: 100 },
        { amount: NaN },
        { amount: 'invalid' as any },
        { amount: 50 },
      ];
      const balances = calculateLedgerRunningBalances(corruptEntries, 0);
      expect(balances).toEqual([100, 100, 100, 150]);

      // Zero-amount transaction preserves conservation
      const ledgerWithZero = [
        { amount: 100, balanceAfter: 100 },
        { amount: 0, balanceAfter: 100 },
        { amount: -50, balanceAfter: 50 },
      ];
      const zeroAudit = verifyLedgerBalanceConservation(ledgerWithZero, 0);
      expect(zeroAudit.isConserved).toBe(true);
      expect(zeroAudit.discrepanciesCount).toBe(0);
    });

    it('preserves arbitrary PromptPay phone formats, spaces, and national ID formats', async () => {
      const formats = [
        '+66-81-998-7711',
        '081 998 7711',
        '1-1002-00123-45-6',
        '014-2-12345-6 (SCB Thonglor)',
      ];

      for (const fmt of formats) {
        const slip = generate50TawiSummary(
          {
            id: 'creator_fmt_test',
            displayName: 'Format Test',
            slug: 'fmt-test',
            payoutDetails: fmt,
          },
          1000
        );
        expect(slip.payee.taxOrPayoutId).toBe(fmt);
      }
    });

    it('enforces concurrency protection preventing double-settlement on simultaneous requests', async () => {
      // 1. Setup isolated eligible obligation and initial earning entry
      const baseOrder = await prisma.order.findFirstOrThrow();
      const concurOb = await prisma.royaltyObligation.create({
        data: {
          orderId: baseOrder.id,
          creatorId: isolatedCreator.id,
          artworkId: isolatedArtwork.id,
          licenseOptionId: isolatedLicense.id,
          unitRoyalty: 200,
          quantity: 1,
          totalAmount: 200,
          status: 'ELIGIBLE',
        },
      });

      await prisma.royaltyLedgerEntry.create({
        data: {
          creatorId: isolatedCreator.id,
          entryType: 'EARNING',
          amount: 200,
          balanceAfter: 200,
          reference: 'CONCURRENCY-INIT',
          notes: 'Initial earning for concurrency test',
        },
      });

      // 2. Fire 2 simultaneous settlements for the exact same creator
      const settlePromises = [
        executeCreatorPayoutSettlement(isolatedCreator.id, {
          payoutRef: 'PromptPay Concurrent Alpha',
          notes: 'Concurrent test settlement alpha',
        }),
        executeCreatorPayoutSettlement(isolatedCreator.id, {
          payoutRef: 'PromptPay Concurrent Beta',
          notes: 'Concurrent test settlement beta',
        }),
      ];

      const results = await Promise.allSettled(settlePromises);

      // Exactly ONE must succeed and ONE must fail
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Track successful settlement for cleanup
      if (fulfilled[0].status === 'fulfilled') {
        createdSettlementIds.push(fulfilled[0].value.settlementId);
        expect(fulfilled[0].value.totalAmount).toBe(200);
        expect(fulfilled[0].value.balanceAfter).toBe(0);
      }

      // Rejected promise should have informative rejection message
      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason.message).toMatch(
          /No eligible royalty obligations found/
        );
      }

      // 3. Verify obligation transitioned to SETTLED
      const updatedOb = await prisma.royaltyObligation.findUnique({
        where: { id: concurOb.id },
      });
      expect(updatedOb?.status).toBe('SETTLED');

      // 4. Verify double-entry ledger balance conservation across isolatedCreator entries
      const allEntries = await prisma.royaltyLedgerEntry.findMany({
        where: { creatorId: isolatedCreator.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      const audit = verifyLedgerBalanceConservation(allEntries, 0);
      expect(audit.isConserved).toBe(true);
      expect(audit.discrepanciesCount).toBe(0);
      expect(audit.netBalance).toBe(0);
    });

    it('safely handles null creator and invalid Date objects in generate50TawiSummary', () => {
      const invalidDate = new Date('not-a-valid-date');
      const summary = generate50TawiSummary(null as any, 1000, invalidDate);

      expect(summary.payee.creatorId).toBe('CREATOR-UNKNOWN');
      expect(summary.payee.displayName).toBe('Creator');
      expect(summary.taxCalculation.grossAmount).toBe(1000);
      expect(summary.taxCalculation.taxAmount).toBe(30);
      expect(summary.taxCalculation.netAmount).toBe(970);
      expect(summary.auditDigest).toMatch(/^REF:ROYALTY-CREATO-[0-9A-F]{8}-\d{4}$/);
      expect(summary.status).toBe('VERIFIED');
    });

    it('pads short creator IDs to 6 characters in 50 Tawi audit digest', () => {
      const summary = generate50TawiSummary(
        { id: 'c1', displayName: 'Short ID', slug: 'short-id' },
        500
      );
      // 'c1' padded to 6 chars is 'C1XXXX'
      expect(summary.auditDigest).toMatch(/^REF:ROYALTY-C1XXXX-[0-9A-F]{8}-\d{4}$/);
    });

    it('clamps excessive tax rate (> 1.0 / 100%) to 1.0 to prevent negative net income', () => {
      const excessiveRate = calculateWithholdingTax(1000, 1.5);
      expect(excessiveRate.taxRate).toBe(1.0);
      expect(excessiveRate.taxAmount).toBe(1000);
      expect(excessiveRate.netAmount).toBe(0);
    });

    it('supports query param polymorphism via "creator" in GET /api/creator/journal', async () => {
      const req = new NextRequest('http://localhost:3000/api/creator/journal?creator=dash-ape');
      const res = await getCreatorJournalApi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.summary.slug).toBe('dash-ape');
      expect(json.tax.grossAmount).toBe(json.summary.lifetimeEarnings);
    });

    it('conserves double-entry ledger balance with ADJUSTMENT entry types', () => {
      const ledgerWithAdjustments = [
        { amount: 300, balanceAfter: 300, entryType: 'EARNING' },
        { amount: -50, balanceAfter: 250, entryType: 'ADJUSTMENT' },
        { amount: 100, balanceAfter: 350, entryType: 'EARNING' },
        { amount: 50, balanceAfter: 400, entryType: 'ADJUSTMENT' },
        { amount: -400, balanceAfter: 0, entryType: 'PAYOUT_SETTLEMENT' },
      ];

      const audit = verifyLedgerBalanceConservation(ledgerWithAdjustments, 0);
      expect(audit.isConserved).toBe(true);
      expect(audit.discrepanciesCount).toBe(0);
      expect(audit.netBalance).toBe(0);

      const totals = calculateLedgerTotals(ledgerWithAdjustments);
      expect(totals.totalEarnings).toBe(450); // 300 + 100 + 50
      expect(totals.totalPayouts).toBe(450); // 50 + 400
      expect(totals.netBalance).toBe(0);
    });

    it('executes payout settlement end-to-end via POST /api/royalties/settle API route', async () => {
      // 1. Create eligible obligations for isolatedCreator
      const baseOrder = await prisma.order.findFirstOrThrow();
      const apiOb = await prisma.royaltyObligation.create({
        data: {
          orderId: baseOrder.id,
          creatorId: isolatedCreator.id,
          artworkId: isolatedArtwork.id,
          licenseOptionId: isolatedLicense.id,
          unitRoyalty: 120,
          quantity: 2,
          totalAmount: 240,
          status: 'ELIGIBLE',
        },
      });

      await prisma.royaltyLedgerEntry.create({
        data: {
          creatorId: isolatedCreator.id,
          entryType: 'EARNING',
          amount: 240,
          balanceAfter: 240,
          reference: 'API-EARNING-TEST',
          notes: 'Initial earning for API settlement test',
        },
      });

      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: isolatedCreator.id,
          payoutReference: 'PromptPay: 081-998-7711',
          notes: 'Test settlement via API route',
        }),
      });

      const res = await postSettleApi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.settlement).toBeDefined();
      expect(json.settlement.totalAmount).toBe(240);
      expect(json.settlement.balanceAfter).toBe(0);
      expect(json.settlement.payoutReference).toBe('PromptPay: 081-998-7711');
      createdSettlementIds.push(json.settlement.settlementId);

      // Verify DB obligation transitioned to SETTLED
      const updatedOb = await prisma.royaltyObligation.findUnique({
        where: { id: apiOb.id },
      });
      expect(updatedOb?.status).toBe('SETTLED');
    });

    it('rejects invalid JSON body in POST /api/royalties/settle with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-non-json-string',
      });
      const res = await postSettleApi(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid JSON');
    });

    it('rejects missing creatorId in POST /api/royalties/settle with 400 Validation Error', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutReference: 'PromptPay Test',
        }),
      });
      const res = await postSettleApi(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation Error');
    });

    it('rejects non-existent creator in POST /api/royalties/settle with 404 Not Found', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'non_existent_creator_xyz',
          payoutReference: 'PromptPay Test',
        }),
      });
      const res = await postSettleApi(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Not Found');
    });

    it('GET /api/creator/journal rejects whitespace-only creatorId with HTTP 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/creator/journal?creatorId=%20%20%20');
      const res = await getCreatorJournalApi(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Bad Request');
    });

    it('trims whitespace-only creator details and falls back to safe defaults in generate50TawiSummary', () => {
      const summary = generate50TawiSummary(
        {
          id: '   ',
          displayName: '   ',
          slug: '   ',
          payoutDetails: '   ',
        },
        1000
      );

      expect(summary.payee.creatorId).toBe('CREATOR-UNKNOWN');
      expect(summary.payee.displayName).toBe('Creator');
      expect(summary.payee.slug).toBe('creator');
      expect(summary.payee.taxOrPayoutId).toContain('REF-ID-CREATOR-');
      expect(summary.taxCalculation.taxAmount).toBe(30);
    });

    it('handles arrays containing null and undefined entry objects in ledger calculations', () => {
      const mixedEntries = [
        { amount: 200, entryType: 'EARNING' },
        null as any,
        undefined as any,
        { amount: -50, entryType: 'PAYOUT_SETTLEMENT' },
      ];

      const totals = calculateLedgerTotals(mixedEntries);
      expect(totals.totalEarnings).toBe(200);
      expect(totals.totalPayouts).toBe(50);
      expect(totals.netBalance).toBe(150);

      const balances = calculateLedgerRunningBalances(mixedEntries, 0);
      expect(balances).toEqual([200, 200, 200, 150]);
    });

    it('CreatorJournalPage server component handles polymorphic creatorId and trimmed query params', async () => {
      // 1. Using creatorId query parameter
      const pageWithCreatorId = await CreatorJournalPage({
        searchParams: { creatorId: 'dash-ape' },
      });
      expect(pageWithCreatorId).toBeDefined();
      expect(pageWithCreatorId.props.children.props.currentSlug).toBe('dash-ape');

      // 2. Using whitespace padded creator parameter
      const pageWithPaddedCreator = await CreatorJournalPage({
        searchParams: { creator: '   dash-ape   ' },
      });
      expect(pageWithPaddedCreator).toBeDefined();
      expect(pageWithPaddedCreator.props.children.props.currentSlug).toBe('dash-ape');

      // 3. Using empty searchParams falls back gracefully
      const pageWithEmptyParams = await CreatorJournalPage({
        searchParams: {},
      });
      expect(pageWithEmptyParams).toBeDefined();
      expect(pageWithEmptyParams.props.children.props.currentSlug).toBeDefined();
    });
  });
});
