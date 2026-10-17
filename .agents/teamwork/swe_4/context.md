# Context: Comprehensive Supplier Portal in ape-parel

## Task Overview
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
