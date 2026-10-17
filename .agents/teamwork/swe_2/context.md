# SWE Light Task Context

## Task Description
Implement a dedicated Creator Journal & Payouts page at `/creator/journal` for the ape-parel streetwear marketplace, providing creators with a transparent double-entry royalty ledger, 3% Withholding Tax (WHT) calculations with digital 50 Tawi tax summaries, and real-time PromptPay/bank settlement execution.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

Original request file: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
Parent Sentinel directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork
Working directory for this agent: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_2

## Requirements
### R1. Creator Journal UI & Live Ledger Table
Implement an accessible, streetwear-themed Creator Journal page (`/creator/journal` and `CreatorJournalClient.tsx`) displaying:
- Comprehensive double-entry royalty ledger feed with timestamps, entry types (earnings, payouts), order/settlement references, transaction amounts (+/-), and running balance after each entry.
- Filterable views (All transactions, Earnings, Payouts) and artwork-level attribution.
- Natural, professional Thai and English terminology without mechanical or repetitive jargon.

### R2. Withholding Tax (WHT 3%) & Digital Tax Slip Module
Implement an automated tax calculation module displaying:
- Gross lifetime royalty earnings, 3% withholding tax deduction according to Thai revenue regulations, and net cumulative payout.
- Interactive digital "50 Tawi (หนังสือรับรองการหักภาษี ณ ที่จ่าย)" summary modal displaying payer, payee, tax rate, and verifiable ledger digest.

### R3. Instant PromptPay & Bank Payout Settlement Action
Implement a settlement module connected to the existing `/api/royalties/settle` backend:
- Displays available withdrawable balance and minimum payout threshold.
- Allows the creator to specify PromptPay ID (Phone/Citizen ID) or bank account details, and submit a settlement request.
- Atomically creates a payout ledger entry, updates obligation statuses to settled, and refreshes the ledger feed in place without page reload.

### R4. Automated Testing & Verification
Author a dedicated test suite (`src/lib/__tests__/creator_journal.test.ts`) verifying:
- Accurate ledger summation and balance calculation.
- Correct 3% withholding tax computation.
- Settlement execution and ledger balance conservation.
- Zero regressions across the existing 376 Vitest tests, 0 TypeScript compile errors, and clean Next.js production build.

## Acceptance Criteria
- [ ] Navigating to `/creator/journal` loads the Creator Journal displaying running ledger balance and transaction records.
- [ ] 3% Withholding Tax is calculated accurately ($WHT = \text{Gross} \times 0.03$, $\text{Net} = \text{Gross} - WHT$).
- [ ] Submitting a payout form triggers `/api/royalties/settle`, deducts available balance, and appends a `PAYOUT_SETTLEMENT` entry to the ledger.
- [ ] 50 Tawi digital tax summary modal opens and displays payer/payee tax breakdown correctly.
- [ ] Dedicated Vitest test suite `src/lib/__tests__/creator_journal.test.ts` passes with exit code 0.
- [ ] All 376 existing Vitest tests across the 19 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.
