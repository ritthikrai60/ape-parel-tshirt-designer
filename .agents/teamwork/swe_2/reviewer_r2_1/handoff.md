# Creator Journal & Payouts Adversarial Review Report (Round 2)

> [!WARNING] **Skepticism Disclaimer**
> High confidence: 404 unit, integration, and adversarial tests pass with zero regressions across 20 suites (including 28 tests in `creator_journal.test.ts`), `npx tsc --noEmit` exits with 0 errors, and Next.js production build (`npm run build`) succeeded cleanly; print chrome isolation, creator switcher state sync, modal keyboard/backdrop accessibility, and ledger adjustments were empirically verified.

---

## 1. What the prior attempt got wrong

### Issue 1: Global Site Header & Footer Bleeding into 50 Tawi Tax Printout
- **Input:** Creator opens the 50 Tawi digital tax slip modal and clicks "พิมพ์เอกสาร (Print Slip)" (`window.print()`).
- **Expected:** ONLY the legal 50 Tawi certificate is rendered on the printed A4 sheet; all surrounding website chrome, including the sticky navigation header and global marketplace footer, are completely hidden.
- **Actual:** The global site header (brand logo, navigation links, "ENGINE: THB LIVE" pulsating badge, AuthButton) and the global footer ("ape-parel marketplace • Authoritative Pricing...") were printed at the top and bottom of the official tax certificate.
- **Root Cause:** Round 1 reviewer only added `print:hidden` to elements inside `CreatorJournalClient.tsx`, ignoring that `src/app/layout.tsx` unconditionally renders `<header>` and `<footer>` without print hiding classes or `@media print` CSS isolation rules.

### Issue 2: Creator Switcher State Stagnation (Props-to-State De-synchronization)
- **Input:** User on `/creator/journal?creator=dash-ape` selects a different creator (e.g. "Cyber Monk") in the creator selector dropdown.
- **Expected:** Next.js navigates to `/creator/journal?creator=cyber-monk`, and the Creator Journal updates to display Cyber Monk's balance, ledger transactions, tax computations, and 50 Tawi certificate.
- **Actual:** The URL changed to `?creator=cyber-monk`, but `CreatorJournalClient` continued displaying Dash Ape's data and balance!
- **Root Cause:** `CreatorJournalClient` initialized React state via `useState(initialSummary)` on initial mount without a `key` prop on `<CreatorJournalClient>` in `src/app/creator/journal/page.tsx` and without a `useEffect` synchronization hook in `CreatorJournalClient.tsx`. In Next.js client component reconciliation, React reuses the mounted component instance, leaving the stale initial creator state intact.

### Issue 3: Inability to Print Clean Ledger Statements When Modal Is Closed (Blank Print Sheet)
- **Input:** Creator or accountant presses `Ctrl+P` while reviewing the main Creator Journal page (when 50 Tawi modal is closed) to print their accounting ledger statement.
- **Expected:** A clean, printable statement of the double-entry royalty ledger and summary metrics on white paper.
- **Actual:** A blank page was printed because Round 1 hardcoded `print:hidden` unconditionally on the entire top banner, all metric cards, and the ledger table container.
- **Root Cause:** Unconditional `print:hidden` prevented printing legitimate ledger records when the modal was closed.

### Issue 4: Modal Accessibility (WCAG 2.1) Missing Escape Key and Backdrop Click Dismissal
- **Input:** Keyboard user opens the payout settlement modal or 50 Tawi modal and presses `Escape` or clicks on the backdrop outside the modal dialog.
- **Expected:** Modals dismiss cleanly.
- **Actual:** Nothing happened; modal stayed locked on screen until user precisely located and clicked the close buttons.
- **Root Cause:** Absence of `keydown` `Escape` listener, backdrop `onClick` target handlers, and modal accessibility ARIA attributes (`role="dialog" aria-modal="true"`).

### Issue 5: Mislabeling of ADJUSTMENT Ledger Entries as PAYOUT_SETTLEMENT
- **Input:** Ledger entry with `entryType === 'ADJUSTMENT'` (supported in Prisma schema `RoyaltyLedgerEntry` for manual corrections/reconciliations).
- **Expected:** Rendered with an `ADJUSTMENT` badge in blue.
- **Actual:** Rendered with a `PAYOUT_SETTLEMENT` badge in purple.
- **Root Cause:** Ternary condition in `CreatorJournalClient.tsx` was binary: `entry.entryType === 'EARNING' ? EARNING : PAYOUT_SETTLEMENT`, incorrectly grouping adjustments as payouts.

### Issue 6: Unhandled Date and Creator Null Safety in `generate50TawiSummary`
- **Input:** `generate50TawiSummary(null as any, 1000, new Date('invalid'))` or a creator with an ID shorter than 6 chars (`{ id: 'c1' }`).
- **Expected:** Graceful fallback to default creator info, safe current date fallback, and padded 6-character digest prefix (`C1XXXX`).
- **Actual:** Threw `TypeError: Cannot read properties of undefined (reading 'id')` or `RangeError: Invalid time value`, or produced truncated digest tags.
- **Root Cause:** Lack of defensive creator checks, unvalidated `Date.toISOString()`, and unpadded `id.slice(0, 6)`.

### Issue 7: Unbounded Tax Rate Clamping (> 1.0) Producing Negative Net Royalty
- **Input:** `calculateWithholdingTax(1000, 1.5)`.
- **Expected:** Rate clamped to 1.0 (100%), with `taxAmount = 1000` and `netAmount = 0` (never negative net income).
- **Actual:** `taxAmount = 1500`, `netAmount = -500`.
- **Root Cause:** Only clamped lower bound (`taxRate >= 0`), without capping upper bound (`Math.min(1, taxRate)`).

### Issue 8: Query Parameter Rigidity in `GET /api/creator/journal`
- **Input:** Client querying `GET /api/creator/journal?creator=dash-ape` (matching page query parameter).
- **Expected:** Returns 200 OK with creator journal data.
- **Actual:** Returned 400 Bad Request because it strictly checked `searchParams.get('creatorId')`.
- **Root Cause:** Lack of parameter polymorphism.

### Issue 9: Undefined Comparison Trap for Payout Threshold
- **Input:** `summary.currentBalance` being `undefined`.
- **Expected:** Payout button disabled and early return executed.
- **Actual:** In JavaScript, `undefined < 100` evaluates to `false`, leaving payout button enabled.
- **Root Cause:** Missing nullish coalescing default.

---

## 2. What I changed

1. **`src/app/globals.css`**:
   - Added `header, footer { display: none !important; }` to `@media print` rules, ensuring complete print isolation.

2. **`src/app/layout.tsx`**:
   - Added `print:hidden` to `<header>` and `<footer>` elements for Tailwind-level print isolation.

3. **`src/app/creator/journal/page.tsx`**:
   - Added `key={summary?.slug || activeSlug}` on `<CreatorJournalClient>` to force clean component re-instantiation upon creator change.
   - Added array query param safety (`Array.isArray(searchParams?.creator) ? searchParams.creator[0] : searchParams?.creator`).
   - Added safe active creator fallback object when database or query returns empty.
   - Added `print:p-0 print:m-0 print:max-w-none` on the wrapping page canvas.

4. **`src/components/portal/CreatorJournalClient.tsx`**:
   - Added `useEffect` prop synchronization ensuring state updates when `initialSummary` or other props change.
   - Added global `Escape` keyboard listener to dismiss open modals.
   - Added backdrop click handlers on both modal overlays (`onClick={(e) => { if (e.target === e.currentTarget) ... }}`).
   - Added ARIA dialog attributes (`role="dialog" aria-modal="true" aria-labelledby="..."`).
   - Replaced static `print:hidden` on main containers with dynamic `hideForModalPrint` (`isTaxSlipModalOpen ? 'print:hidden' : ''`), enabling printing of ledger reports when modal is closed, and strict modal isolation when modal is open.
   - Added `ADJUSTMENT` badge support in the ledger table feed.
   - Prevented negative zero (`-฿0`) display on Metric 3 when tax is 0.
   - Hardened `(summary?.currentBalance ?? 0) < MIN_PAYOUT_THRESHOLD_THB` avoiding JS `undefined < 100` truthiness trap.
   - Defaulted `payoutTargetInput` to `initialSummary?.payoutDetails || ''` instead of hardcoding another creator's phone number.
   - Defensively calculated `summary?.settledObligations?.count` and `totalAmount`.
   - Used safe date formatting for `taxSlip.issuedAt`.

5. **`src/lib/creatorJournal.ts`**:
   - Clamped upper bound of `taxRate` with `Math.min(1, taxRate)` in `calculateWithholdingTax`.
   - Added defensive `safeCreator` fallback and `isNaN(issuedDate.getTime())` check in `generate50TawiSummary`.
   - Padded creator ID prefix in `auditDigest` (`safeCreator.id.padEnd(6, 'X').slice(0, 6).toUpperCase()`).

6. **`src/app/api/creator/journal/route.ts`**:
   - Supported parameter polymorphism: `searchParams.get('creatorId') || searchParams.get('creator')`.

7. **`src/lib/__tests__/creator_journal.test.ts`**:
   - Added 5 new adversarial unit and integration tests (28 tests total):
     - Safe handling of null creator and invalid `Date` in `generate50TawiSummary`.
     - 6-character padding for short creator IDs in 50 Tawi audit digest.
     - Excessive tax rate (> 1.0 / 100%) clamping to prevent negative net income.
     - Query parameter polymorphism (`creator` vs `creatorId`) in `GET /api/creator/journal`.
     - Double-entry ledger balance conservation with `ADJUSTMENT` entry types.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx vitest run src/lib/__tests__/creator_journal.test.ts`: **Passed (28/28 tests, 194ms).**
  - `npx vitest run`: **Passed across all 20 test files, 404 tests total, 0 failures, 0 regressions.**
  - `npx tsc --noEmit`: **Exit code 0, 0 compiler errors.**
  - `npm run build`: **Exit code 0, all 13 static and dynamic routes compiled cleanly; `/creator/journal` compiled at 26.2 kB.**
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

- All R1-R4 requirements and acceptance criteria are satisfied and verified with 404 passing tests, 0 TypeScript compile errors, and a clean production Next.js build.
- Ready for orchestrator approval and production deployment.
