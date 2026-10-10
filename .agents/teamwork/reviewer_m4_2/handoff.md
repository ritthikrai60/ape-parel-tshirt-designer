# Reviewer 2 Handoff Report: Milestone 4 (Multi-Role Portals & Marketplace)

## Review Summary

**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Verbatim Build & Test Telemetry

1. **TypeScript Verification (`npx tsc --noEmit`)**:
   ```
   Command: npx tsc --noEmit
   Exit Code: 0
   Errors: 0
   ```

2. **Vitest Test Suite (`npm test`)**:
   ```
   Command: npm test
   Exit Code: 0
   RUN  v1.6.1 D:/Coding Projects/ape-parel tshirt

   ✓ src/lib/__tests__/orders_royalties_challenger.test.ts  (19 tests) 567ms
   ✓ src/lib/__tests__/orders_royalties.test.ts  (19 tests) 260ms
   ✓ src/lib/__tests__/orders_api_adversarial.test.ts  (33 tests) 212ms
   ✓ src/lib/__tests__/pricing_challenger.test.ts  (44 tests) 244ms
   ✓ src/lib/__tests__/pricing_adversarial.test.ts  (31 tests) 105ms
   ✓ src/lib/__tests__/studio_challenger.test.ts  (12 tests) 124ms
   ✓ src/lib/__tests__/portals_marketplace.test.ts  (18 tests) 196ms
   ✓ src/lib/__tests__/studio_pipeline.test.ts  (12 tests) 106ms
   ✓ src/lib/__tests__/pricing.test.ts  (11 tests) 60ms

   Test Files  9 passed (9)
        Tests  199 passed (199)
     Duration  4.66s
   ```

3. **Next.js Production Build (`npm run build`)**:
   ```
   Command: npm run build
   Exit Code: 0
     ▲ Next.js 14.2.35
     - Environments: .env

      Creating an optimized production build ...
    ✓ Compiled successfully
      Linting and checking validity of types ...
      Collecting page data ...
      Generating static pages (0/8) ...
      Generating static pages (2/8) 
      Generating static pages (4/8) 
      Generating static pages (6/8) 
    ✓ Generating static pages (8/8)
      Finalizing page optimization ...
      Collecting build traces ...

   Route (app)                              Size     First Load JS
   ┌ ○ /                                    175 B          96.1 kB
   ├ ○ /_not-found                          873 B          88.1 kB
   ├ ƒ /account/orders/[id]                 5.05 kB         101 kB
   ├ ƒ /api/orders                          0 B                0 B
   ├ ƒ /api/orders/[id]                     0 B                0 B
   ├ ƒ /api/orders/[id]/production          0 B                0 B
   ├ ƒ /api/pricing/calculate               0 B                0 B
   ├ ƒ /api/royalties/settle                0 B                0 B
   ├ ƒ /creator/dashboard                   5.15 kB        92.4 kB
   ├ ƒ /creators/[slug]                     188 B           101 kB
   ├ ƒ /marketplace                         176 B           100 kB
   ├ ƒ /studio/new                          152 kB          248 kB
   └ ƒ /supplier/dashboard                  4.8 kB         92.1 kB
   + First Load JS shared by all            87.3 kB
   ```

### 1.2 Code Inspection Observations

1. **Creator Dashboard (`src/app/creator/dashboard/page.tsx` & `CreatorDashboardClient.tsx`)**:
   - `page.tsx:82-83`: Fetches real data via `getCreatorLedgerSummary(activeSlug)` and `getCreatorLedgerEntries(activeSlug, { limit: 100 })`.
   - `CreatorDashboardClient.tsx:195-259`: Displays 4 metric cards:
     - Gross Royalties Earned (`data-testid="metric-gross-earnings"`, `summary.lifetimeEarnings`)
     - Sales Volume (`data-testid="metric-sales-volume"`, `summary.salesVolume` pcs)
     - Eligible Balance (`data-testid="metric-eligible-balance"`, `summary.currentBalance`)
     - Settled Payouts (`data-testid="metric-settled-payouts"`, `summary.totalSettled`)
   - `CreatorDashboardClient.tsx:306-389`: Table `data-testid="royalty-ledger-table"` renders timestamp, type badge (`EARNING` vs `PAYOUT_SETTLEMENT`), reference, artwork/description, signed amount (`+฿`/`-฿`), running `balanceAfter`, and `AUDITED` status badge.
   - `CreatorDashboardClient.tsx:58-98, 154-164`: Settlement button `data-testid="settle-payout-btn"` launches modal `data-testid="payout-modal"` invoking `POST /api/royalties/settle`.

2. **Supplier Production Dashboard (`src/app/supplier/dashboard/page.tsx` & `SupplierDashboardClient.tsx`)**:
   - `page.tsx:96-116`: Queries order queue from Prisma filtered by `supplierId`, including garment product variants and artwork obligations.
   - `SupplierDashboardClient.tsx:199-383`: Job queue container `data-testid="supplier-job-queue"` with job cards `data-testid="job-card-${order.orderNumber}"`.
   - `SupplierDashboardClient.tsx:304-328`: Workflow stepper: Queued (`PAYMENT_CONFIRMED`) -> Printing (`IN_PRODUCTION`) -> QA Check (`QA`/`QA_PASSED`) -> Shipped (`SHIPPED`/`DELIVERED`).
   - `SupplierDashboardClient.tsx:254-297`: Garment specifications display blank SKU (`APX-HVY-001`), color swatch (`#131718`), size (`L`), quantity, print technique (Kornit Digital DTG, 35x45 cm platen), and delivery destination.
   - `SupplierDashboardClient.tsx:232-250`: 1-click factory specification download `<a data-testid="download-spec-${order.orderNumber}" href="/api/orders/${order.id}/production" download="...">` and in-browser RIP inspector modal.

3. **Customer Order Tracking (`src/app/account/orders/[id]/page.tsx` & `CustomerOrderTrackingClient.tsx`)**:
   - `page.tsx:28`: Calls `getOrderByIdOrNumber(id)` and returns 404 via `notFound()` if non-existent.
   - `CustomerOrderTrackingClient.tsx:143-201`: Stepper `data-testid="order-status-stepper"` with 5 steps (`PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `QA`/`QA_PASSED`, `SHIPPED`, `DELIVERED`).
   - `CustomerOrderTrackingClient.tsx:208-301`: Mockup preview `data-testid="mockup-preview-card"` with Front/Back canvas toggles, authentic garment background color (`#131718`), 35x45cm print zone outline, and absolute positioning of placed artwork elements.
   - `CustomerOrderTrackingClient.tsx:355-422`: Itemized pricing breakdown `data-testid="itemized-pricing-breakdown"`:
     - Garment Blank: ฿150
     - Kornit DTG Printing: ฿80
     - Packaging: ฿15
     - Shipping: ฿40
     - Artwork Licensing: ฿125
     - Total: ฿410 THB matching server pricing engine.

4. **Order Status API Route (`src/app/api/orders/[id]/route.ts`)**:
   - `route.ts:8-19`: Validates payload with Zod schema for status enum (`PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `QA`, `QA_PASSED`, `SHIPPED`, `DELIVERED`, `CANCELLED`) and optional notes.
   - `route.ts:142-163`: Executes atomic database transaction:
     ```typescript
     const updatedOrder = await prisma.$transaction(async (tx) => {
       const order = await tx.order.update({
         where: { id: existingOrder.id },
         data: { status },
       });
       await tx.auditEvent.create({
         data: {
           action: 'ORDER_STATUS_UPDATED',
           entityType: 'Order',
           entityId: order.id,
           payload: JSON.stringify({
             previousStatus,
             newStatus: status,
             notes: notes ?? null,
             updatedAt: new Date().toISOString(),
           }),
         },
       });
       return order;
     });
     ```

5. **Creator Privacy Enforcement (`src/app/creators/[slug]/page.tsx`)**:
   - `page.tsx:257-308`: Explicitly omits `payoutDetails` from public storefront DTO.

---

## 2. Logic Chain

1. **Verification of Requirements R4 & AC**:
   - The user request and PROJECT.md specify public marketplace, creator storefronts, creator dashboard, supplier dashboard, customer order tracking, and production spec exports.
   - All 5 routes (`/marketplace`, `/creators/[slug]`, `/creator/dashboard`, `/supplier/dashboard`, `/account/orders/[id]`) and supporting API routes (`/api/orders/[id]`, `/api/orders/[id]/production`, `/api/royalties/settle`) are implemented with full server-side Prisma querying and client interactivity.
2. **Integrity Audit**:
   - Source code was checked for hardcoded stubs, dummy facades, or bypassed logic. None were found:
     - Prisma queries are real and relational.
     - Transactions are atomic (`prisma.$transaction`).
     - Calculation matches authoritative server math (150 + 80 + 15 + 40 + 125 = 410 THB).
     - Test suite runs real integration tests against seeded SQLite database.
3. **Build and Test Verification**:
   - TypeScript passed with zero errors (`tsc --noEmit`).
   - Vitest suite passed 100% of tests (199/199 green).
   - Production build compiled successfully (`npm run build`).

---

## 3. Adversarial Challenges & Findings

### [Minor / Enhancement] Challenge 1: Order State Transition Machine Validation
- **Assumption**: API callers transition statuses sequentially as guided by the UI buttons.
- **Attack Scenario**: Direct `PATCH /api/orders/[id]` invocation could jump from `PAYMENT_CONFIRMED` straight to `DELIVERED` or transition backwards from `DELIVERED` to `IN_PRODUCTION`.
- **Blast Radius**: Although `AuditEvent` records all transitions atomically and the UI enforces forward stepping, the backend route handler does not restrict non-sequential transitions.
- **Mitigation / Recommendation**: In Milestone 5 hardening, implement a status transition map (e.g. `VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]>`) in `orders.ts` to reject invalid state transitions with HTTP 422/400.

### [Minor / Enhancement] Challenge 2: Role-Based Access Control (RBAC)
- **Assumption**: Development mode environment where persona switchers simulate multi-role user portals.
- **Attack Scenario**: Any unauthenticated client can trigger payout settlements via `POST /api/royalties/settle` for any `creatorId`, or advance supplier jobs for any facility.
- **Blast Radius**: Acceptable for current development and test integrity mode, but production will require session-based authentication (e.g., NextAuth/Auth.js) and role checks.
- **Mitigation / Recommendation**: Document as a prerequisite for production deployment.

---

## 4. Conclusion

Milestone 4 (Multi-Role Portals & Marketplace) is **fully implemented**, adhering to all specifications and interface contracts without shortcuts, facades, or integrity violations.

Final Verdict: **APPROVE**

---

## 5. Verification Method

To independently verify the implementation:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, 0 errors.

2. **Full Test Suite Execution**:
   ```powershell
   npm test
   ```
   *Expected outcome*: Exit code 0, 9 passed test files, 199/199 passed tests.

3. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected outcome*: Exit code 0, all routes compiled cleanly.

4. **Invalidation Conditions**:
   - Any failure in `npm test` or `npx tsc --noEmit`.
   - `PATCH /api/orders/[id]` failing to create an `AuditEvent`.
   - Leak of `payoutDetails` on public storefronts.
   - Failure of 1-click spec download on `/supplier/dashboard`.
