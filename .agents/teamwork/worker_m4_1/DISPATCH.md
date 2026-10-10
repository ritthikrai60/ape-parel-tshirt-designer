## 2026-10-10T01:43:32Z

You are Worker M4-1 for Milestone 4 (Multi-Role Portals & Marketplace) in ape-parel.

Your identity: teamwork_preview_worker
Your working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m4_1
Orchestrator conversation ID: b128b841-82a3-43da-89c3-1191302bd832

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. Read ORIGINAL_REQUEST.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read PROJECT.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_2\PROJECT.md
3. Read Explorer 1 handoff: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m4_1\handoff.md
4. Read Explorer 2 handoff: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m4_2\handoff.md
5. Initialize your progress.md with "Last visited: [timestamp]" and update it regularly.

YOUR EXCLUSIVE WRITE OWNERSHIP:
- `src/components/marketplace/ArtworkCard.tsx`
- `src/components/marketplace/CategoryFilter.tsx`
- `src/app/marketplace/page.tsx`
- `src/app/creators/[slug]/page.tsx`
- `src/components/portal/CreatorDashboardClient.tsx`
- `src/app/creator/dashboard/page.tsx`
- `src/components/portal/SupplierDashboardClient.tsx`
- `src/app/supplier/dashboard/page.tsx`
- `src/components/portal/CustomerOrderTrackingClient.tsx`
- `src/app/account/orders/[id]/page.tsx`
- `src/app/api/orders/[id]/route.ts`
- `src/lib/__tests__/portals_marketplace.test.ts`

TASKS:
1. Implement Public Marketplace (`src/app/marketplace/page.tsx` & components):
   - Category filtering (Illustration, Mascot, Typography, Pattern, Logo), search by title/creator, artwork cards with creator avatar, price, and "Customize" CTA linking to `/studio/new?artworkId=[id]`.
2. Implement Creator Storefront (`src/app/creators/[slug]/page.tsx`):
   - Creator profile header (avatar, bio, stats) and full artwork portfolio grid with "Customize" buttons.
3. Implement Creator Dashboard (`src/app/creator/dashboard/page.tsx` & `CreatorDashboardClient.tsx`):
   - Real-time sales volume, gross fees earned, eligible balance, immutable royalty ledger entry table, and payout settlement button calling `POST /api/royalties/settle`.
4. Implement Supplier Dashboard (`src/app/supplier/dashboard/page.tsx` & `SupplierDashboardClient.tsx`):
   - Production job queue, garment details (SKU, color, size, Kornit DTG), status stepper (QUEUED -> PRINTING -> QA -> SHIPPED) with status update action, and 1-click Production Spec download linking to `/api/orders/[id]/production`.
5. Implement Customer Order Tracking (`src/app/account/orders/[id]/page.tsx` & `CustomerOrderTrackingClient.tsx`):
   - Order status stepper, mockup preview, and itemized pricing breakdown matching server engine (Garment, Print, Packaging, Shipping, Licenses, Total).
6. Update `src/app/api/orders/[id]/route.ts`:
   - Add `PATCH` method supporting status transitions (`IN_PRODUCTION`, `QA_PASSED`, `SHIPPED`, `DELIVERED`) and recording `AuditEvent` logs.
7. Implement automated integration tests in `src/lib/__tests__/portals_marketplace.test.ts`.
8. Verification:
   - `npx tsc --noEmit` -> Exit code 0 (0 errors)
   - `npm test` -> 100% tests pass across all test suites
   - `npm run build` -> Next.js production build succeeds, all portal routes compiled cleanly
9. Write complete handoff report to: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m4_1\handoff.md`.
10. Send a message to orchestrator (`b128b841-82a3-43da-89c3-1191302bd832`) when complete.
