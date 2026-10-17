# Original User Request

## 2026-10-09T23:22:07Z

ape-parel is a creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with interactive 2D/3D customizer, server-authoritative pricing, and auditable royalty tracking.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: development

## Requirements

### R1. 2D & 3D Interactive Design Studio
- 2D Canvas centered on transparent background with authentic garment colors (Ink Black, Optic White, Paper Beige, Warm Kraft), large full-bleed garment display without intrusive print boundary boxes.
- 3D Viewport powered by Three.js with OrbitControls, neutral 3-point lighting, floor shadow, and independent Front (u in [0, 0.5]) and Back (u in [0.5, 1.0]) texture mapping onto tshirt.obj.
- Multi-artwork placement with interactive positioning, scaling, rotation, and artwork layer management.

### R2. Authoritative Server-Side Pricing Engine & Checkout
- Real-time live price calculation strictly validated on server: garment base + print technique (DTG/Screen) + packaging + shipping + total artwork license fees.
- Exact benchmark verification: Garment (THB 150) + DTG Print (THB 80) + Packaging (THB 15) + Shipping (THB 40) + Artwork Licenses (THB 40 + THB 60 + THB 25 = THB 125) = THB 410 for 1 unit.
- Server rejects unauthorized pricing and client-side fee tampering.

### R3. Auditable Royalty Ledger & Supplier Production Specs
- Atomic order placement generating immutable RoyaltyObligation and RoyaltyLedgerEntry records for every licensed artwork.
- Settlement and payout calculation tracking creator earnings, platform commissions, and payment statuses.
- Automated generation of production specification packages for suppliers (print placement coordinates, dimensions, blank garment SKUs, high-res asset references).

### R4. Multi-Role Portals & Marketplace
- Public Marketplace and Creator storefronts with artwork catalog and licensing terms.
- Creator Dashboard displaying sales volume, license fees earned, and royalty ledger status.
- Supplier Dashboard displaying pending production jobs and manufacturing specifications.
- Customer Order Tracking portal showing design previews, production progress, and item breakdown.

## Verification Resources
- Pre-seeded SQLite database with test creators, suppliers, garments, and artworks (prisma/seed.mjs).
- Unit tests: src/lib/__tests__/pricing.test.ts validating the THB 410 pricing benchmark.
- Integration tests: src/lib/__tests__/orders_royalties.test.ts validating atomic order creation and ledger accuracy.

## Acceptance Criteria

### Pricing & Business Logic
- [ ] Server recalculates all cart items independently of client input.
- [ ] 1-unit benchmark order with the 3 specified licenses calculates to exactly THB 410.
- [ ] Order creation atomically writes royalty obligations and ledger entries for all artists.

### 2D/3D Studio Functionality
- [ ] 2D studio renders shirts large and centered on transparent canvas with no bounding boxes obscuring the garment.
- [ ] 3D studio loads tshirt.obj in Three.js and correctly maps Front and Back canvases separately without mirroring or cross-bleed.

### End-to-End Build & Execution
- [ ] TypeScript type checks pass with zero errors (npx tsc --noEmit).
- [ ] Vitest test suite passes (npm test).
- [ ] Next.js production build completes successfully (npm run build).


## 2026-10-10T05:13:06Z

ape-parel Graphic Creator Portal & Financial Reconciliation Engine: A self-service creator onboarding, storefront management, graphic asset validation, and double-entry accounting/reconciliation system for independent designers on ape-parel.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Creator Onboarding & Storefront Management
- Self-service creator account onboarding and profile registration (display name, bio, social links, banner/avatar, custom store slug).
- Creator public storefront & gallery customization (/creators/[slug]) showcasing curated portfolios, bio, badge verification, and commercial licensing tiers.
- Intuitive, responsive, streetwear-inspired UX/UI adhering to ape-parel design tokens (Ink Black, Paper Beige, Warm Kraft).

### R2. Graphic Asset Upload & Strict Format Enforcement
- Artwork upload workflow with strict validation on file formats (PNG with transparency, SVG, high-res TIFF/JPEG), DPI verification (minimum 300 DPI or vector check), file size limits, and aspect ratios.
- Automated creation of watermarked public web previews and secure storage of print-ready master files in local filesystem (public/uploads) with modular storage abstraction.
- Licensing tier configuration per artwork: Commercial standard, Exclusive, Extended merchandise with author-defined pricing in THB.

### R3. Comprehensive Financial Accounting, Ledger & Reconciliation
- Immutable double-entry bookkeeping tracking Gross Merchandise Value (GMV), 15% platform commission deductions, 85% creator royalty accruals, and payout disbursements.
- Financial reconciliation engine matching platform order items to creator ledger balances with audit logs and balance-conservation checks.
- Creator Financial Dashboard (/creator/earnings): Detailed breakdown of pending vs. cleared royalties, lifetime payouts, downloadable statements, and payout request flows.

### R4. Database Schema Expansion & Audit Tracing
- Prisma schema extensions covering CreatorStorefrontSettings, ArtworkFileSpec, CommissionRule, FinancialAccount, and ReconciliationReport.
- Complete audit logging (AuditEvent) on all price adjustments, asset uploads, status changes, and payout authorizations.

## Verification Resources
- Existing SQLite database & Prisma schema (prisma/schema.prisma).
- Existing pricing engine (src/lib/pricing.ts) and royalty calculation modules (src/lib/royalties.ts).
- Existing Vitest test runner (npm test) with 268 passing baseline tests.

## Acceptance Criteria

### Creator Storefront & Onboarding
- [ ] Creator registration form validates unique slug, bio, and visual branding assets.
- [ ] Creator storefront (/creators/[slug]) renders custom bio, banner, and filtered artwork galleries.

### Graphic Upload & Validation
- [ ] Upload pipeline rejects invalid dimensions, non-transparent PNGs when required, and resolutions below 300 DPI.
- [ ] Creators can set and update custom license prices (Standard, Commercial, Extended) in THB.

### Financial Accounting & Reconciliation
- [ ] Reconciliation engine verifies sum(Credits) - sum(Debits) = Current Balance for every creator ledger.
- [ ] Platform commission (15%) and creator splits (85%) are accurately debited/credited per order transaction.
- [ ] Payout requests transition from REQUESTED to SETTLED with immutable ledger audit entries.

### Quality & System Health
- [ ] All existing 268 tests continue passing without regression.
- [ ] New unit and integration tests added for upload validation, storefront settings, and financial reconciliation.
- [ ] npx tsc --noEmit and npm run build succeed with zero errors.


## 2026-10-10T15:24:53Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Team (Implementer + Verifier)

Design, generate, and integrate a web-optimized 3D T-Shirt model using Blender MCP into the ape-parel 3D studio viewer, ensuring pixel-perfect UV mapping with the 2D canvas.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: benchmark

## Requirements

### R1. Web-Optimized 3D Model Generation
- Create or adapt a realistic, low-poly 3D T-Shirt model optimized for fast web rendering in Three.js.
- Ensure the model's UV map is strictly partitioned for the customizer: the front of the shirt must map exactly to the `[0.0, 0.5]` UV space (U-axis), and the back must map exactly to `[0.5, 1.0]`.

### R2. Project Integration
- Export the model as a `.obj` file to maintain compatibility with the existing Three.js loader.
- Replace the existing `public/models/tshirt.obj` in the project.
- Modify the React/Three.js source code only if strictly necessary to properly scale, position, or render the new model.

### R3. Verification & Alignment QA
- An independent QA/Verifier agent must systematically verify that a 2D design placed on the front canvas perfectly aligns with the 3D model without texture bleeding onto the back.

## Acceptance Criteria

### Integration & Quality
- [ ] The new `.obj` model loads successfully in the Next.js `DesignStudioClient` environment.
- [ ] Programmatic verification: The UV mappings strictly obey the 50/50 split (Front: 0-0.5, Back: 0.5-1.0) without requiring arbitrary padding.
- [ ] The project builds successfully (`npm run build`) and all 3D pipeline tests pass without regression.


## 2026-10-10T18:42:45Z

The API quota reset window has elapsed and the user has explicitly requested to resume execution: "/teamwork-preview ทำต่อ".

Please resume the project workflow from `.agents/teamwork/orchestrator_6/handoff.md` and `.agents/teamwork/handoff.md`:
1. Re-initialize progress and liveness tracking.
2. Dispatch the successor Orchestrator (Gen 7) to clear the Milestone 1 Verification Gate (`GATE_STATUS.md`).
3. Execute Milestone 2: Test Alignment & 3D Studio Integration (align legacy test suites `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` with the new genuine Blender loop-unwrapped OBJ model and 50/50 UV partition, verify `GarmentPreview3D.tsx`).
4. Execute Milestone 3: QA, Build Hardening, and Victory Audit (`npm test`, `npx tsc --noEmit`, `npm run build`).
5. Deliver the final victory report upon verified completion.


## 2026-10-10T19:30:47Z

Adapt and integrate the provided `prep_models/various size/Low_T-shirt.obj` into the ape-parel customizer by normalizing its UV map to strict 50/50 front/back partitions, replacing `public/models/tshirt.obj`, and verifying Three.js rendering and test compliance.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: benchmark

## Requirements

### R1. Model Adaptation & UV Normalization
- Ingest `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
- Process in Blender 5.1.2 via Blender MCP (`execute_blender_code`) or procedural geometric mapping to normalize and partition its UV coordinates:
  - Front garment section: strictly mapped within `u ∈ [0.0, 0.5]`
  - Back garment section: strictly mapped within `u ∈ [0.5, 1.0]`
  - Ensure zero cross-border bleeding faces across `u = 0.50` and welded side seams.

### R2. Project Replacement & 3D Studio Integration
- Export the processed model to `public/models/tshirt.obj`.
- Verify Three.js `OBJLoader` loads and centers the new geometry seamlessly in `GarmentPreview3D.tsx` (centered and normalized to 1.9 units).
- Align any legacy test assertions in `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` to match the new topology and 50/50 UV partition.

### R3. Adversarial QA & Forensic Verification
- Multi-agent verification swarm:
  - Reviewer: Audit OBJ topology, face-loop syntax, and Three.js attribute structure.
  - Challenger: Stress-test seams for UV bleeding, orientation flipping, and boundary violations.
  - Forensic Auditor: Verify asset provenance, ensuring mathematical and procedural integrity.
- Verify full test suite passes (`npm test`), TypeScript type-checks (`npx tsc --noEmit`), and production build succeeds (`npm run build`).

## Acceptance Criteria

### Integration & Quality
- [ ] `public/models/tshirt.obj` is successfully replaced with the adapted `Low_T-shirt.obj`.
- [ ] Three.js `OBJLoader` parses the geometry without errors or missing normals/UVs.
- [ ] UV coordinates strictly obey the 50/50 partition (Front: 0.0–0.5, Back: 0.5–1.0) with 0 crossing faces.
- [ ] 2D-to-3D texture placement in the Studio viewer is verified without distortion or cross-seam bleed.
- [ ] `npm test`, `npx tsc --noEmit`, and `npm run build` pass with exit code 0.


## 2026-10-10T21:53:26Z

Re-unwrap and adapt `prep_models/various size/Low_T-shirt.obj` using Blender MCP with Frontal and Rear Planar UV Projections to achieve 1:1 pixel-accurate alignment with the 2D Studio Canvas, replacing `public/models/tshirt.obj` and passing all verification tests.

Working directory: d:/Coding Projects/ape-parel tshirt
Integrity mode: benchmark

## Requirements

### R1. Frontal & Rear Planar UV Unwrapping (Blender MCP)
- Ingest `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
- Using Blender 5.1.2 MCP (`execute_blender_code`) or procedural planar projection:
  - Generate a continuous Frontal Planar UV projection for all front-facing geometry ($Z \ge 0$, including front torso, sleeves, and front collar) strictly into $U \in [0.0, 0.5], V \in [0.0, 1.0]$.
  - Generate a continuous Rear Planar UV projection for all rear-facing geometry ($Z \le 0$, including back torso, rear sleeves, and back collar) strictly into $U \in [0.5, 1.0], V \in [0.0, 1.0]$.
  - Ensure $V = 0.0$ corresponds to the bottom hem and $V = 1.0$ corresponds to the top collar/shoulders, eliminating vertical displacement between 2D canvas and 3D viewport.
  - Maintain horizontal orientation (anti-mirroring) so graphics appear unmirrored on both front and back.
  - Ensure zero crossing faces across $U = 0.50$.

### R2. Model Replacement & 3D Studio Alignment
- Export the re-mapped model to `public/models/tshirt.obj`.
- Verify in `GarmentPreview3D.tsx` that designs placed on the 2D canvas (chest, hem, sleeves) map to the exact same anatomical locations on the 3D model without distortion.
- Align test suites (`m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`) to the new planar UV coordinates.

### R3. Adversarial QA & Forensic Verification
- Multi-agent verification swarm:
  - Reviewer: Audit OBJ topology, 50/50 partition bounds, and Three.js attribute structure.
  - Challenger: Stress-test 2D-to-3D visual alignment (chest placement, hem placement, sleeve placement), ensuring 0 cross-border bleed and correct orientation.
  - Forensic Auditor: Verify mathematical projection integrity and asset authenticity.
- Run complete test suite (`npm test`), TypeScript check (`npx tsc --noEmit`), and production build (`npm run build`).

## Acceptance Criteria

### Alignment & Quality
- [ ] A design placed on the chest in the 2D canvas renders on the chest of the 3D model (not on the sleeve or collar).
- [ ] A design placed at the bottom hem in the 2D canvas renders at the bottom hem of the 3D model (not on the chest).
- [ ] UV coordinates strictly respect $U \in [0.0, 0.5]$ for Front and $U \in [0.5, 1.0]$ for Back with 0 crossing faces.
- [ ] All 323 Vitest tests pass (`npm test`).
- [ ] TypeScript check (`npx tsc --noEmit`) and Next.js production build (`npm run build`) complete with exit code 0.


## 2026-10-11T06:28:36Z

This is a single self-contained fix; keep it small and focused.
Implement a Contextual In-Studio Auth Modal in the ape-parel 3D T-shirt design studio (`/studio/new`) that intercepts "Save Design" and "Order Now" for unauthenticated users, authenticates them, and preserves 3D canvas and design state without page reload or state loss.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Contextual In-Studio Auth Modal Component
Implement an accessible, streetwear-themed authentication modal (`StudioAuthModal.tsx`) within the 3D design studio (`src/components/studio/DesignStudioClient.tsx`).
- When an unauthenticated user triggers "Save Design" or "Order Now / Checkout", intercept the action and display the modal rather than redirecting away from the studio.
- Support Google authentication via NextAuth (`signIn('google')`) and development credential/mock access if configured.
- Include a dismiss button and Escape key listener that closes the modal without altering or clearing the user's active 2D/3D design elements, garment colorway, or active surface (Front/Back).

### R2. Seamless State & Pending Action Preservation
Ensure zero design data loss:
- The active design state (frontElements, backElements, colorway, size) must be preserved in state/local storage during and across the authentication flow.
- Once authenticated, the system seamlessly resumes the pending save or order checkout action.

### R3. Automated Test Suite & Regression Verification
Author a dedicated test suite verifying the modal behavior:
- Tests confirm that unauthenticated clicks open the modal and authenticated clicks proceed directly to save/order.
- Tests confirm that closing the modal preserves existing canvas elements intact.
- Verify that all existing 334 Vitest tests in the project continue to pass with 0 regressions.

## Acceptance Criteria

### Functionality & State Preservation
- [ ] Unauthenticated click on "Save Design" or "Order Now" in `DesignStudioClient.tsx` opens `StudioAuthModal` without navigating away from `/studio/new`.
- [ ] Closing the modal via Close button or backdrop preserves all design elements, selected colorway, and 3D preview intact.
- [ ] Authenticated users bypass the modal and directly trigger the save or order flow.

### Quality & Test Verification
- [ ] Dedicated Vitest test suite covering `StudioAuthModal` passes with exit code 0.
- [ ] All 334 existing Vitest tests across the 17 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.


## 2026-10-11T09:28:48Z

This is a single self-contained fix; keep it small and focused.
Implement a dedicated Creator Journal & Payouts page at `/creator/journal` for the ape-parel streetwear marketplace, providing creators with a transparent double-entry royalty ledger, 3% Withholding Tax (WHT) calculations with digital 50 Tawi tax summaries, and real-time PromptPay/bank settlement execution.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

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

### Functionality & Tax Computation
- [ ] Navigating to `/creator/journal` loads the Creator Journal displaying running ledger balance and transaction records.
- [ ] 3% Withholding Tax is calculated accurately ($WHT = \text{Gross} \times 0.03$, $\text{Net} = \text{Gross} - WHT$).
- [ ] Submitting a payout form triggers `/api/royalties/settle`, deducts available balance, and appends a `PAYOUT_SETTLEMENT` entry to the ledger.
- [ ] 50 Tawi digital tax summary modal opens and displays payer/payee tax breakdown correctly.

### Quality & Test Verification
- [ ] Dedicated Vitest test suite `src/lib/__tests__/creator_journal.test.ts` passes with exit code 0.
- [ ] All 376 existing Vitest tests across the 19 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.

## 2026-10-11T14:14:37Z

This is a single self-contained feature; keep it small and focused.
Implement a 3D Print Placement Guide & Ruler Exporter in ape-parel that generates accurate physical measurement guidelines (centimeter rulers, collar offset, center-chest alignment, graphic width/height, hem clearance) directly from 3D studio designs for suppliers and print shops.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. 3D Snapshot & High-Resolution Orthographic Capture
Enable front and back orthographic capture of the garment in `GarmentPreview3D.tsx` / `DesignStudioClient.tsx`:
- Render the 3D t-shirt from a front-facing perspective without perspective distortion.
- Produce a clean high-resolution canvas/image snapshot containing the garment and placed artwork.

### R2. Physical Dimension Guide & Ruler Engine (cm)
Implement a dimension calculation and rendering engine (`src/lib/productionBlueprint.ts`):
- Compute exact physical centimeter measurements based on standard platen sizing (35x45 cm):
  - Distance from lowest collar center point to top of graphic (`offsetTopCollarCm`).
  - Distance from center chest line to graphic center (`offsetCenterCm`).
  - Physical print dimensions (width & height in cm).
  - Distance from bottom of graphic to hem (`offsetHemCm`).
- Render overlay markings: top and left rulers in cm, red vertical center axis line, dimension callout arrows, and artwork bounding box.

### R3. Export Actions in 3D Studio and Supplier Portal
Provide user-facing export capabilities:
- In `DesignStudioClient.tsx` (`/studio/new`): Add an "Export Print Guide & Ruler" button that generates a downloadable high-res PNG / printable tech sheet.
- In Supplier Jobs (`/supplier/jobs/[id]` or `/account/orders/[id]`): Provide a production blueprint sheet showing the 3D render alongside the ruler guide, order number, garment SKU, and DTG Kornit printing specifications.

### R4. Automated Testing & Verification
Author a dedicated test suite (`src/lib/__tests__/production_blueprint.test.ts`):
- Test physical centimeter coordinate conversions, collar offset calculations, and platen boundary clamping.
- Ensure all 412 existing Vitest tests continue to pass with 0 regressions.
- Verify TypeScript `npx tsc --noEmit` (0 errors) and Next.js `npm run build` (exit code 0).

## Acceptance Criteria

### Blueprint Generation & Measurements
- [ ] Graphic placement coordinates are converted into physical centimeters accurately relative to the collar dip and center chest.
- [ ] Exported blueprint includes visual centimeter rulers on axes, center axis line, and dimensional callout annotations.
- [ ] Both 3D Studio and Supplier Portal provide an action to export or view the print placement blueprint.

### Quality & Verification
- [ ] Dedicated Vitest test suite `src/lib/__tests__/production_blueprint.test.ts` passes with exit code 0.
- [ ] All 412 existing Vitest tests across the 20 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.


## 2026-10-11T17:38:25Z

This is a single self-contained feature; keep it small and focused.
Implement the comprehensive Supplier Portal in ape-parel covering:
1. Blank Garment & DTG Catalog Pricing (/supplier/catalog / /supplier/pricing)
2. Inventory Stock Matrix Grid (/supplier/inventory)
3. Production Queue & Status Progression (/supplier/dashboard / /supplier/orders)
4. Logistics & Shipping Fulfillment with Packing Slip (/supplier/fulfillment)
5. Supplier Revenue Ledger & Settlement Payouts (/supplier/finance)

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Directives & Terminology Rules
- CRITICAL CONSTRAINT: NEVER use mechanical jargon or phrases like "410", "410 benchmark", or synthetic fee formulas. Use transparent, natural business terms in Thai/English:
  - "ราคาเสื้อเปล่า" (Blank Garment Base Price)
  - "ค่างานพิมพ์ DTG" (DTG Printing Cost per Surface)
  - "ค่าบรรจุภัณฑ์" (Eco Packaging Fee)
  - "ค่าจัดส่ง" (Logistics & Shipping Cost)
  - "ระบบคำนวณราคาโปร่งใสตามจริง" (Transparent Production Cost Breakdown)

## Requirements

### R1. Blank Garment & Printing Catalog Pricing (/supplier/catalog)
Implement an interactive pricing configuration module for verified suppliers:
- Adjust blank garment base cost (e.g. 240 GSM Combed Cotton blank tee price).
- Configure DTG printing pricing per print surface (Front / Back / Both).
- Configure packaging and default domestic shipping rates.
- Transparent price calculator showing real-time cost breakdown for customers and margin for suppliers.

### R2. Colorway × Size Inventory Stock Matrix Grid (/supplier/inventory)
Implement a multi-dimensional inventory matrix interface:
- Visual Color (e.g., Vintage Black, Pure White, Heather Grey, Sand Beige) × Size (S, M, L, XL, XXL) grid.
- Inline quantity inputs and rapid +/- adjustments.
- Low-stock visual warning badges (e.g., < 10 units highlight in amber/red).
- Persists changes to GarmentVariant in Prisma / local state with optimistic UI feedback.

### R3. Production Queue & Status Progression (/supplier/dashboard / /supplier/orders)
Enhance the supplier order processing pipeline:
- Display active job orders assigned to the supplier with garment thumbnail, color, size, and print surface.
- Step-by-step manufacturing progression:
  CONFIRMED ➔ IN_PRODUCTION ➔ QA_PASSED ➔ READY_TO_PACK ➔ SHIPPED.
- Direct access to the 3D Print Placement Blueprint & Technical Spec sheet (/supplier/jobs/[id]).

### R4. Logistics & Shipping Fulfillment (/supplier/fulfillment)
Implement shipping dispatch tools:
- Courier selection (Thailand Post EMS, Flash Express, Kerry Express, J&T Express).
- Courier tracking number entry and verification.
- Printable A6/A4 packing slip & shipping label preview with customer delivery info, garment SKU, and QR code tracking mock.
- Status update action that transitions order to SHIPPED and dispatches tracking info.

### R5. Supplier Financial Ledger & Payouts (/supplier/finance)
Implement transparent revenue accounting for suppliers:
- Double-entry ledger reflecting supplier earnings:
  Supplier Earning = Blank Garment Cost + DTG Printing Fee + Packaging Fee.
- Running withdrawable balance display.
- Payout request module via PromptPay (Phone / Citizen ID) or Thai Bank Account with transaction history feed.

### R6. Automated Testing & Verification
Author a comprehensive Vitest test suite (src/lib/__tests__/supplier_portal.test.ts):
- Test inventory matrix quantity updates, boundary clamping, and low-stock detection.
- Test catalog pricing computations and transparent cost aggregation.
- Test order status progression rules (CONFIRMED through SHIPPED).
- Test supplier earnings calculation and payout balance deductions.
- Ensure all existing 459 Vitest tests continue to pass with 0 regressions.
- Verify npx tsc --noEmit (0 errors) and npm run build succeeds (exit code 0).

## Acceptance Criteria
- [ ] Supplier can view and edit base garment price and DTG print fees with transparent breakdown.
- [ ] Supplier can view and adjust Colorway × Size stock matrix with low-stock warnings.
- [ ] Supplier can advance order manufacturing states through to READY_TO_PACK.
- [ ] Supplier can assign courier, enter tracking number, generate packing slip, and mark as SHIPPED.
- [ ] Supplier financial ledger accurately aggregates garment + print + packaging earnings and supports PromptPay payout requests.
- [ ] Dedicated Vitest test suite src/lib/__tests__/supplier_portal.test.ts passes with exit code 0.
- [ ] All 459 existing Vitest tests across the 21 suites pass with 0 regressions.
- [ ] npx tsc --noEmit passes with 0 type errors.
- [ ] npm run build succeeds with exit code 0.


## 2026-10-11T19:39:56Z

This is a single self-contained feature; keep it small and focused.
Implement a unified authentication and onboarding system in ape-parel supporting customer registration/login, progressive onboarding for creators and suppliers, and a seamless global role switcher.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Unified Registration & Login Interface (/register & /login)
Implement accessible, streetwear-themed authentication pages:
- /register: Email, full name, password registration form with client-side validation (minimum 8 characters) and password confirmation. Includes role intent selection (Customer, Creator, Supplier) and a "Sign up with Google" alternative.
- /login: Email and password login form with error handling for invalid credentials, "Sign in with Google", and the Development Fast Login switcher.
- Redirects users contextually back to their return URL (e.g., /studio/new, /account/orders, or portal pages).

### R2. Secure Password Handling & Prisma Authentication Adapter
- Update Prisma User model to support passwordHash String? (nullable to accommodate Google OAuth accounts).
- Implement secure password hashing and verification using bcryptjs or Node.js native crypto.scrypt.
- Extend NextAuth Credentials provider in src/auth.ts to verify email and password against passwordHash, preventing unauthorized logins while maintaining existing development mock capabilities.

### R3. Progressive Onboarding Wizards for Creator & Supplier
- When a user navigates to /creator/dashboard or /creator/journal without an active CreatorProfile, display an onboarding modal/wizard to set up their creator profile (display name, unique slug, bio, and PromptPay/bank payout details).
- When a user navigates to /supplier/dashboard, /supplier/inventory, or /supplier/finance without an active SupplierProfile, display a supplier onboarding wizard to set up their company details (company name, factory location, contact phone, lead time days).
- Upon completing onboarding, atomically create the corresponding profile and link it to the user.

### R4. Global Header Role Switcher & Contextual Navigation
- Add a Role Switcher dropdown menu in the main navigation header (Navbar.tsx / UserNav):
  - 🛒 Shopping & Studio Mode (CUSTOMER): Links to Home, 3D Studio, Marketplace, Orders.
  - 🎨 Creator Studio Mode (CREATOR): Quick link to Creator Dashboard, Journal & Royalties, Artwork Upload.
  - 🏭 Supplier Portal Mode (SUPPLIER): Quick link to Supplier Dashboard, Inventory Matrix, Fulfillment, Finance.
  - Option to "Become a Creator" or "Become a Supplier" if the user has not yet completed onboarding for that role.

### R5. Automated Testing & Verification
Author a dedicated test suite (src/lib/__tests__/auth_flows.test.ts):
- Test password hashing and verification accuracy.
- Test user registration with email/password and duplicate email rejection.
- Test login credential validation and rejection of invalid passwords.
- Test progressive onboarding for CreatorProfile and SupplierProfile creation.
- Ensure all 500 existing Vitest tests continue to pass with 0 regressions.
- Verify npx tsc --noEmit (0 errors) and npm run build succeeds (exit code 0).

## Acceptance Criteria

### Functionality & Experience
- [ ] Users can register with email and password on /register and log in on /login.
- [ ] Users can also log in via Google OAuth or Development Fast Login.
- [ ] Un-onboarded users accessing Creator or Supplier portals are prompted with an onboarding wizard to create their profile.
- [ ] Header user menu includes a Role Switcher allowing users to toggle between Customer, Creator, and Supplier views.
- [ ] Passwords are secure, hashed, and never stored in plain text.

### Quality & Verification
- [ ] Dedicated Vitest test suite src/lib/__tests__/auth_flows.test.ts passes with exit code 0.
- [ ] All 500 existing Vitest tests across the 22 suites pass with 0 regressions.
- [ ] npx tsc --noEmit passes with 0 type errors.
- [ ] npm run build succeeds with exit code 0.


## 2026-10-12T09:19:08Z

This is a single self-contained feature; keep it small and focused.
Implement a realistic rotational inertia and cloth sway physics system in the ape-parel 3D design studio (GarmentPreview3D.tsx) where rotating the garment around the left-right axis induces natural inertial cloth lag and spring-damper settling without compromising 2D/3D print blueprint measurement accuracy.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Rotational Inertia & Angular Velocity Cloth Sway
Implement rotational cloth dynamics in GarmentPreview3D.tsx:
- Compute real-time angular velocity (omega = delta theta / delta t) around the Y-axis (yaw) as the garment / camera rotates.
- Anchor pinning: The collar dip, ribbing, and shoulder seams remain rigidly anchored (0% deformation).
- Cloth lag deformation: Lower torso hem and sleeve cuffs dynamically lag behind the rotational direction proportional to angular acceleration and distance from anchors, simulating heavy 240 GSM combed cotton drape.

### R2. Spring-Damper Harmonic Settle Oscillation
Implement realistic fabric damping physics:
- When rotation slows or stops, the garment exhibits a subtle damped harmonic oscillation (spring overshoot and settle wave) rather than snapping to rest abruptly.
- Tuned damping coefficients (c) and spring stiffness (k) calibrated specifically for heavyweight 240 GSM cotton (stiff drape with low fluttering frequency).

### R3. Universal Rotational Interaction Support
Integrate rotational physics across all studio interaction modalities:
- Manual user interaction: Mouse drag and mobile touch swipe via OrbitControls.
- Preset transitions: Smooth camera view transitions (Front / Back / Isometric buttons) induce rotational inertia.
- Turntable mode: Continuous turntable auto-rotate maintains a gentle, natural centrifugal sway.

### R4. Zero-Deformation Guarantee for Blueprint & Technical Exporters
Guarantee print guide precision:
- When captureOrthographicSnapshot or productionBlueprint.ts executes to generate manufacturing tech sheets and centimeter ruler guidelines, immediately zero out / freeze dynamic deformation (uInertiaLag = 0.0) during the capture frame.
- Ensure that collar offset (offsetTopCollarCm), center-chest alignment, and graphic width/height in centimeters remain 100% mathematically exact and undistorted.

### R5. Automated Testing & Verification
Author a dedicated test suite (src/lib/__tests__/garment_physics.test.ts):
- Test angular velocity and inertia lag calculations across varying rotation speeds and directions.
- Test spring-damper decay behavior and convergence to neutral rest state.
- Test anchor pinning weights (collar = 0 displacement, hem = maximum displacement).
- Verify that snapshot capture functions guarantee zero deformation during export.
- Ensure all 546 existing Vitest tests continue to pass with 0 regressions.
- Verify npx tsc --noEmit (0 errors) and npm run build succeeds (exit code 0).

## Acceptance Criteria

### Physics & Visual Dynamics
- [ ] Rotating the 3D t-shirt left or right causes the hem and sleeves to sway and lag naturally behind the rotation direction.
- [ ] Stopping rotation triggers a smooth, damped spring settle back to neutral pose without jarring snaps.
- [ ] Collar and shoulders remain securely pinned and undistorted during all movements.
- [ ] Physics activates consistently across mouse drag, view preset switches, and auto-rotate turntable.
- [ ] Blueprint export snapshots (captureOrthographicSnapshot) capture the neutral undistorted garment with 100% centimeter accuracy.

### Quality & Verification
- [ ] Dedicated Vitest test suite src/lib/__tests__/garment_physics.test.ts passes with exit code 0.
- [ ] All 546 existing Vitest tests across the 23 suites pass with 0 regressions.
- [ ] npx tsc --noEmit passes with 0 type errors.
- [ ] npm run build succeeds with exit code 0.
