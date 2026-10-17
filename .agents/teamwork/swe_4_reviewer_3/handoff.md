# Reviewer Round 3 Handoff Report: Comprehensive Supplier Portal

## 1. What the prior attempt got wrong
1. **Facility Switch State Stalling (Cross-Tenant UI Bug)**
   - **Input:** Supplier switches facility in navbar (e.g. from `bangkok-garment-craft` to `siam-textile-mill`).
   - **Expected:** All portal client components (`SupplierCatalogClient`, `SupplierInventoryClient`, `SupplierFulfillmentClient`, `SupplierFinanceClient`) synchronize their internal state to reflect the new facility's products, stock matrix, orders, and ledger.
   - **Actual:** Client components maintained the initial state of the first facility (`useState(initial...)` without `useEffect` prop synchronization), causing edits in the catalog to attempt mutations with mismatched foreign product IDs, resulting in 404s or cross-facility corruption.
   - **Root cause:** Next.js App Router client components do not automatically remount when shallow search parameter navigation occurs without a dynamic `key` or `useEffect` synchronization.

2. **Negative Payout Amount Currency Formatting Glitch**
   - **Input:** Payout debit transactions in `SupplierFinanceClient`.
   - **Expected:** Formatted as `-฿50 THB`.
   - **Actual:** Rendered as `฿-50 THB` due to `{isEarning ? '+' : ''}฿{tx.amount.toLocaleString()} THB` when `tx.amount` was negative.
   - **Root cause:** String concatenation placed the currency symbol before the negative number.

3. **Untrimmed Recipient Identifier Persistence in Payout Requests**
   - **Input:** `requestSupplierPayout` with `recipientId: '   081-992-4411   '`.
   - **Expected:** Sanitized and trimmed identifier persisted across JournalEntry descriptions, AuditEvent payloads, and return objects.
   - **Actual:** Untrimmed string with surrounding whitespace was saved into JournalEntry and AuditEvent.
   - **Root cause:** `cleanRecipientId` was validated but the raw `recipientId` was used when building journal descriptions and audit payloads.

4. **Silent Ignoring of DTG Pricing Updates when `printingServiceId` was Omitted**
   - **Input:** `updateSupplierPricing` invoked with `pricePerSurface: 88` but without explicitly specifying `printingServiceId`.
   - **Expected:** Default DTG printing service for the supplier is resolved and updated.
   - **Actual:** Print pricing update was silently skipped and `result.printingService` was `null`.
   - **Root cause:** The printing service update block was strictly gated by `if (printingServiceId)` without fallback to look up the supplier's DTG service.

5. **Delivered Order Fulfill Regression Risk**
   - **Input:** `fulfillSupplierOrder` invoked on an order with `status === 'DELIVERED'`.
   - **Expected:** Rejected with error preventing already delivered orders from regressing back to `SHIPPED`.
   - **Actual:** Overwrote status back to `SHIPPED` and re-recorded fulfillment dispatch audit.
   - **Root cause:** Missing lifecycle state invariant guard against `DELIVERED` status.

6. **Cancelled Order Revival via `PATCH /api/orders/[id]`**
   - **Input:** `PATCH /api/orders/[id]` on an order with `status === 'CANCELLED'` attempting transition to `IN_PRODUCTION`.
   - **Expected:** Rejected with HTTP 400.
   - **Actual:** Allowed status transition on cancelled orders.
   - **Root cause:** Missing lifecycle status invariant guard in `src/app/api/orders/[id]/route.ts`.

7. **False 'FRONT' Surface Attribution on Blank Garment Packing Slips (Open Issue #6)**
   - **Input:** Plain blank garment order with `printingCost === 0` and empty design elements.
   - **Expected:** `surfaces` is empty `[]`.
   - **Actual:** Defaulted to `['FRONT']`, misleading factory packing staff into looking for a non-existent print.
   - **Root cause:** `generatePackingSlipData` unconditionally pushed `'FRONT'` when `surfaces.length === 0`.

8. **Zero Surface DTG Print Calculation Clamping**
   - **Input:** `calculateTransparentCostBreakdown({ surfacesCount: 0 })`.
   - **Expected:** 0 THB DTG printing fee.
   - **Actual:** Clamped to 1 surface by `safeInt(input?.surfacesCount, 1, 1)`.
   - **Root cause:** `min` parameter in `safeInt` was hardcoded to 1.

## 2. What I changed
- **`src/lib/supplier.ts`**:
  - Allowed `surfacesCount === 0` in `calculateTransparentCostBreakdown` for unprinted plain blank garment cost calculation.
  - Hardened `updateSupplierPricing` to automatically discover and update the supplier's default DTG service when `printingServiceId` is omitted.
  - Added `existing.status === 'DELIVERED'` lifecycle guard in `fulfillSupplierOrder`.
  - Resolved Open Issue #6 in `generatePackingSlipData` by only defaulting to `'FRONT'` if `order.printingCost > 0`.
  - Persisted `cleanRecipientId` consistently in `requestSupplierPayout` across JournalEntry descriptions, AuditEvents, and return payloads.
- **`src/app/api/orders/[id]/route.ts`**:
  - Added guard rejecting status updates on `CANCELLED` orders with HTTP 400.
- **`src/components/portal/SupplierCatalogClient.tsx`**:
  - Added `useEffect` hook to synchronize form state when the active facility or initial props change.
  - Added defensive guard for missing `product.id`.
- **`src/components/portal/SupplierInventoryClient.tsx`**:
  - Added `useEffect` hook to synchronize `stockMap` when the active facility or `initialMatrix` updates.
- **`src/components/portal/SupplierFulfillmentClient.tsx`**:
  - Added `useEffect` hook to synchronize `orders` when the active facility updates.
  - Parsed print surfaces from design documents in `handleOpenPackingSlip` and rendered surface badges in A6 thermal labels and A4 packing slips.
- **`src/components/portal/SupplierFinanceClient.tsx`**:
  - Added `useEffect` hook to synchronize financial summary when the active facility updates.
  - Corrected currency formatting for debit payouts from `฿-X THB` to `-฿X THB`.
- **`src/lib/__tests__/supplier_portal.test.ts`**:
  - Added 6 new adversarial test cases covering surfacesCount 0, DTG service auto-resolution, DELIVERED order fulfillment rejection, CANCELLED order PATCH 400 rejection, blank garment packing slip surfaces, and recipient ID whitespace sanitization. (Total 41 tests, all passing).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx vitest run src/lib/__tests__/supplier_portal.test.ts`: **PASS (41/41 tests passing, 432ms)**.
  - `npx vitest run`: **PASS (22/22 test files passing, 500/500 tests passing, 0 regressions)**.
  - `npx tsc --noEmit`: **PASS (Exit code 0, 0 TypeScript compilation errors)**.
  - `npm run build`: **PASS (Exit code 0, all 19 production routes compiled and optimized successfully)**.
- **Shallow Verification (manual only):**
  - Verified natural Thai/English transparent pricing terminology (`ราคาเสื้อเปล่า`, `ค่างานพิมพ์ DTG`, `ค่าบรรจุภัณฑ์`, `ค่าจัดส่ง`, `ระบบคำนวณราคาโปร่งใสตามจริง`) across UI labels and API payloads.
  - Inspected A6 thermal label (100x150mm) and A4 warehouse packing slip CSS print media queries.
- **Unverified aspects:**
  - Physical thermal label printer hardware integration (Zebra ZD421 / Xprinter).
  - External banking API / PromptPay automated settlement webhook callbacks (mocked via double-entry journal entries).
  - Real-time carrier courier tracking APIs (Thailand Post / Flash Express live API pings).

## 4. Known Issues
- `Minor Robustness Risk`: SQLite file-level write locking under thousands of simultaneous requests per second is mitigated via 15s maxWait transactions, but high-throughput enterprise scale would ultimately benefit from Postgres connection pooling.

## 5. Remaining risk & next step
The Supplier Portal implementation is fully verified, defensively hardened against edge cases, and completely regression-free across all 500 system tests. The task is complete.
