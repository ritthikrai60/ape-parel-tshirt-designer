## 2026-10-10T01:36:51Z
You are Explorer 2 for Milestone 4 (Multi-Role Portals & Marketplace) in ape-parel.

Your identity: teamwork_preview_explorer
Your working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m4_2
Orchestrator conversation ID: b128b841-82a3-43da-89c3-1191302bd832

MANDATORY FIRST STEPS:
1. Read ORIGINAL_REQUEST.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read PROJECT.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_2\PROJECT.md
3. Initialize your progress.md with "Last visited: [timestamp]" and update it regularly.

YOUR SCOPE & OBJECTIVE:
Creator Dashboard (`/creator/dashboard`), Supplier Dashboard (`/supplier/dashboard`), and Customer Order Tracking (`/account/orders/[id]`).

TASKS:
1. Inspect existing backend services and APIs:
   - `src/lib/royalties.ts` (`getCreatorLedgerSummary`, `executeCreatorPayoutSettlement`, `getCreatorLedgerEntries`)
   - `src/lib/orders.ts` (`getOrderByIdOrNumber`)
   - `src/lib/production.ts` (`generateProductionPackage`)
   - `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/production`, `/api/royalties/settle`
2. Design Creator Dashboard (`src/app/creator/dashboard/page.tsx`):
   - Key metrics cards: Gross Royalties Earned (฿), Volume (Units Sold), Eligible Balance (฿), Settled Payouts (฿).
   - Payout settlement action button (triggering `/api/royalties/settle` and updating balance).
   - Immutable Royalty Ledger table displaying date, entry type (`EARNING`, `PAYOUT_SETTLEMENT`), amount, balance after, reference order, and status.
3. Design Supplier Dashboard (`src/app/supplier/dashboard/page.tsx`):
   - Production job queue listing orders.
   - Status stepper (QUEUED -> PRINTING -> QA -> SHIPPED) with status update action.
   - Garment details: SKU, variant (color, size), quantity, print technique.
   - 1-click Production Spec download linking to `/api/orders/[id]/production`.
4. Design Customer Order Tracking (`src/app/account/orders/[id]/page.tsx`):
   - Order summary with status stepper.
   - Design mockup preview and garment details.
   - Itemized pricing breakdown strictly matching server engine (Garment, Print, Packaging, Shipping, Artwork Licenses, Total).
5. Provide complete component blueprints and code proposals in `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m4_2\handoff.md`.
6. Send a message to orchestrator (`b128b841-82a3-43da-89c3-1191302bd832`) with your summary.
