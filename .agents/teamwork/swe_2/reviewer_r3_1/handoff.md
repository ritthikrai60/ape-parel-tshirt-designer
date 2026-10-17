# Creator Journal & Payouts Adversarial Review Report (Round 3)

> [!WARNING] **Skepticism Disclaimer**
> High confidence: 412 unit, integration, and adversarial tests pass with zero regressions across 20 suites (including 36 tests in `creator_journal.test.ts`), `npx tsc --noEmit` exits with code 0, and Next.js production build (`npm run build`) succeeded cleanly. Navigation dead-ends, query parameter polymorphism, payout detail state propagation, settlement endpoint testing, SSR timestamp hydration safety, and input sanitization have been empirically resolved and verified.

---

## 1. What the prior attempt got wrong

### Issue 1: Missing End-to-End Test Verification for `POST /api/royalties/settle` Route
- **Input:** Prior test suite in Round 2 imported `POST as postSettleApi` on line 16 of `src/lib/__tests__/creator_journal.test.ts`.
- **Expected:** Dedicated test cases exercising the `POST /api/royalties/settle` NextRequest handler directly, testing valid settlement transactions, invalid JSON bodies, missing creator IDs, and 404 non-existent creators.
- **Actual:** `postSettleApi` was never called anywhere in the test file — the import sat completely unused and untested.
- **Root Cause:** Incomplete test authoring; the prior author verified the service library (`executeCreatorPayoutSettlement`) directly but omitted the actual Next.js API route test coverage required by R3 and R4.

### Issue 2: Dead-End Navigation (Missing Backlink to Creator Dashboard)
- **Input:** Creator navigates to `/creator/journal` from `/creator/dashboard` via the "Journal & Tax 50 Tawi" link.
- **Expected:** A clear navigation breadcrumb or link allowing creators to return to `/creator/dashboard` with their active creator context preserved.
- **Actual:** Creator was stranded on `/creator/journal` with no backlink to the creator dashboard. `Link` was imported at the top of `CreatorJournalClient.tsx` but never used anywhere in the JSX.
- **Root Cause:** Omission of a top-level breadcrumb navigation backlink.

### Issue 3: Asymmetric Query Parameter Handling in `/creator/journal` Page
- **Input:** User or external link accesses `/creator/journal?creatorId=cyber-monk`.
- **Expected:** Page displays Cyber Monk's journal dataset, matching the polymorphism supported in `GET /api/creator/journal` (`creatorId || creator`).
- **Actual:** `CreatorJournalPage` strictly checked `searchParams?.creator`, completely ignoring `searchParams?.creatorId` and falling back to the default creator (`dash-ape`).
- **Root Cause:** Rigid query parameter parsing in `src/app/creator/journal/page.tsx` (`searchParams?.creator` only).

### Issue 4: Whitespace-Only Parameter Handling in API Route
- **Input:** Client querying `GET /api/creator/journal?creatorId=%20%20%20`.
- **Expected:** HTTP 400 Bad Request with message `'Query parameter "creatorId" is required and cannot be empty.'`.
- **Actual:** Returned HTTP 404 Not Found because `"   "` was truthy in `if (!creatorId)`, triggering a database lookup that failed.
- **Root Cause:** Missing `.trim()` on extracted query parameters before validation.

### Issue 5: Payout Reference State Stagnation After Settlement
- **Input:** Creator enters a custom PromptPay ID in the settlement modal and submits a payout.
- **Expected:** Top header's "บัญชีรับเงิน (Payout Details)" and the modal input update to reflect the newly confirmed payout reference.
- **Actual:** Header retained the creator's previous payout details, and subsequent modal openings reset to the old value.
- **Root Cause:** `handleExecuteSettlement` updated `currentBalance` and `totalSettled` in `updatedSummary`, but omitted `payoutDetails: payoutRef`, and did not update `payoutTargetInput`.

### Issue 6: Unsanitized Payout Input Lengths
- **Input:** Long user input in `payoutTargetInput` (> 100 chars) or `payoutNotesInput` (> 500 chars).
- **Expected:** Clamped safely to backend schema constraints before sending to `/api/royalties/settle`.
- **Actual:** If passed programmatically or without client-side HTML constraints, could exceed Zod validation limits.
- **Root Cause:** Lack of defensive `.slice()` sanitization on payload fields.

### Issue 7: Potential SSR Hydration Mismatch on Formatted Timestamps
- **Input:** Dynamic server render on a server with UTC timezone vs client browser in Bangkok (`UTC+7`).
- **Expected:** Zero React hydration warnings when rendering localized timestamps.
- **Actual:** `formatDate` output could mismatch between server-rendered HTML and client hydration.
- **Root Cause:** Missing `suppressHydrationWarning` on timestamp DOM nodes.

---

## 2. What I changed

1. **`src/app/api/creator/journal/route.ts`**:
   - Trimmed query parameters (`rawParam?.trim()`), rejecting whitespace-only creator IDs with HTTP 400 Bad Request.

2. **`src/app/creator/journal/page.tsx`**:
   - Added `import React from 'react';` for JSX compatibility across both Next.js compiler and test execution runners.
   - Supported polymorphic query parameters (`searchParams?.creator ?? searchParams?.creatorId`) with trimming.
   - Guaranteed that `allCreators` array includes the active `summary` creator if missing, preventing dropdown desynchronization.

3. **`src/components/portal/CreatorJournalClient.tsx`**:
   - Added breadcrumb navigation link back to `/creator/dashboard?creator=...` with `ChevronLeft` icon.
   - Propagated `payoutDetails: payoutRef` to `updatedSummary` and `setPayoutTargetInput(payoutRef)`.
   - Added `router.refresh()` on settlement completion for server component data freshness.
   - Computed `maxWithdrawable` considering `eligibleObligations.totalAmount` for accurate modal tax/settle preview.
   - Added `autoFocus` on `payout-target-input` in the settlement modal.
   - Added `suppressHydrationWarning` on timestamp cells in the ledger table and 50 Tawi modal.
   - Defensively clamped `payoutRef` (100 chars) and `notes` (500 chars).

4. **`src/lib/creatorJournal.ts`**:
   - Defensively trimmed `id`, `displayName`, `slug`, and `payoutDetails` in `generate50TawiSummary` to prevent whitespace-only truthy fallbacks.
   - Rounded `netBalance` with `Math.round(running * 100) / 100` in `verifyLedgerBalanceConservation`.

5. **`src/lib/__tests__/creator_journal.test.ts`**:
   - Added 8 new adversarial test cases (36 tests total, up from 28 in Round 2):
     - End-to-end execution of `POST /api/royalties/settle` API route with obligation transition and balance deduction.
     - `POST /api/royalties/settle` rejection of invalid JSON body (HTTP 400).
     - `POST /api/royalties/settle` rejection of missing `creatorId` (HTTP 400).
     - `POST /api/royalties/settle` rejection of non-existent creator (HTTP 404).
     - `GET /api/creator/journal` rejection of whitespace-only `creatorId` (HTTP 400).
     - Trimming and fallback for whitespace-only creator details in `generate50TawiSummary`.
     - Null and undefined array element resilience in `calculateLedgerTotals` and `calculateLedgerRunningBalances`.
     - Server component `CreatorJournalPage` handling polymorphic and trimmed query parameters.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx vitest run src/lib/__tests__/creator_journal.test.ts`: **Passed (36/36 tests, 224ms).**
  - `npx vitest run`: **Passed across all 20 test files, 412 tests total, 0 failures, 0 regressions (11.02s).**
  - `npx tsc --noEmit`: **Exit code 0, 0 compiler errors.**
  - `npm run build`: **Exit code 0, all 13 static and dynamic routes compiled cleanly; `/creator/journal` compiled at 26.5 kB.**
- **Shallow Verification (manual only):**
  - Inspected DOM structures, ARIA modal attributes, backdrop event targets, and CSS `@media print` rules.
- **Unverified aspects:**
  - Physical paper spooling from actual hardware printers (DOM styles and print stylesheets verified).
  - External live PromptPay webhook gateways (verified using Prisma transactional execution).

---

## 4. Known Issues

- `Minor Robustness Risk`: Certain browser-native print preview dialogs include header/footer checkboxes (date and URL) controlled by the user's browser print settings.
- `Shallow Verification`: Backdrop click dismiss relies on standard React synthetic event target matching.

---

## 5. Remaining risk & next step

- All R1-R4 requirements and acceptance criteria are satisfied and verified with 412 passing tests, 0 TypeScript compile errors, and a clean production Next.js build.
- Ready for orchestrator approval and production deployment.
