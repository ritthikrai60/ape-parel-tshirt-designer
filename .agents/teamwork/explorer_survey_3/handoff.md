# Handoff Report: R3 (Auditable Royalty Ledger & Supplier Specs) & R4 (Portals & Marketplace)

## Executive Summary
This survey provides an exhaustive read-only inspection of Requirements R3 (Auditable Royalty Ledger & Supplier Production Specs) and R4 (Multi-Role Portals & Marketplace) for the `ape-parel` marketplace project.

- **Data Modeling & Seed Integrity (R3 Baseline)**: Fully designed in `prisma/schema.prisma` and seeded in `prisma/seed.mjs` / `prisma/dev.db`. The models (`Order`, `RoyaltyObligation`, `RoyaltyLedgerEntry`, `CreatorSettlement`, `GarmentProduct`, `GarmentVariant`, `PrintingService`, `Artwork`, `LicenseOption`, `DesignDocument`, `AuditEvent`) accurately capture the multi-party relationships and match the exact THB 410 benchmark.
- **Service & Business Logic (R3 Implementation)**: **0% implemented**. No order creation service (`src/lib/orders.ts`), no atomic Prisma transaction wrapper, no royalty ledger/settlement service (`src/lib/royalties.ts`), and no production specification generator (`src/lib/production.ts`) exist.
- **Test Coverage (R3 Testing)**: **0% implemented**. `src/lib/__tests__/orders_royalties.test.ts` is absent; `npm test` fails with code 1 ("No test files found").
- **User Interface & Portals (R4 Implementation)**: **0% implemented**. `src/app` contains only `globals.css`. There are no pages, routes, or components for the Marketplace (`/marketplace`), Creator Storefronts (`/creators/[slug]`), Creator Dashboard (`/creator/dashboard`), Supplier Dashboard (`/supplier/dashboard`), or Customer Order Portal (`/account/orders/[id]`).

---

## 1. Observations

### 1.1 Codebase & File Structure
- `src/app`: Directory inspection via `list_dir` reveals only `globals.css` (size: 606 bytes). There are no pages (`page.tsx`, `layout.tsx`), no subdirectories (`marketplace`, `creators`, `creator`, `supplier`, `orders`, `account`, `studio`, `api`).
- `src/lib`: Contains only three files:
  - `pricing.ts` (lines 1-139, implements `calculateLivePricing`)
  - `prisma.ts` (lines 1-10, singleton `PrismaClient` initialization)
  - `types.ts` (lines 1-61, basic types: `PrintSurface`, `DesignElement`, `PricingPayload`, `PriceCalculationResult`, `UserRole`)
- `src/lib/__tests__`: Directory does NOT exist.
  - Search command: `find_by_name(Pattern: "*test*")` returned only `vitest.config.ts`.
  - Tool command `npm test` output:
    ```
    > ape-parel@0.1.0 test
    > vitest run
    ...
    No test files found, exiting with code 1
    ```
- `public/`: Directory does NOT exist. There are no 3D models (`tshirt.obj`) or mockup templates yet.

### 1.2 Prisma Schema (`prisma/schema.prisma`)
The schema contains 12 models. Models directly governing R3 and R4:
1. **`User` (lines 10-22)**:
   - Roles: `role String @default("CUSTOMER")` (`CUSTOMER`, `CREATOR`, `SUPPLIER`, `ADMIN`).
   - Relations: `creatorProfile`, `supplierProfile`, `designs`, `orders`, `auditEvents`.
2. **`CreatorProfile` (lines 24-37)**:
   - Fields: `slug @unique`, `displayName`, `bio`, `avatarUrl`, `website`, `payoutDetails`.
   - Relations: `artworks Artwork[]`.
3. **`SupplierProfile` (lines 39-57)**:
   - Fields: `slug @unique`, `companyName`, `description`, `location`, `contactEmail`, `contactPhone`, `leadTimeDays` (default 5), `minOrderQuantity` (default 1), `verified` (default true).
   - Relations: `products GarmentProduct[]`, `printingServices PrintingService[]`, `orders Order[]`.
4. **`Artwork` & `LicenseOption` (lines 59-90)**:
   - `Artwork`: `creatorId`, `title`, `description`, `category` (`ILLUSTRATION`, `MASCOT`, `TYPOGRAPHY`, `PATTERN`, `LOGO`), `previewUrl`, `originalUrl`, `mimeType`, `status`, `moderationStatus`.
   - `LicenseOption`: `artworkId`, `name`, `price` (Int, THB), `commercialUse` (Boolean), `terms`, `scope` (`PER_GARMENT`, `UNLIMITED`).
5. **`GarmentProduct` & `GarmentVariant` (lines 92-124)**:
   - `GarmentProduct`: `supplierId`, `sku @unique`, `name`, `fabric`, `weightGsm`, `fit`, `neckline`, `basePrice` (default 150), `packagingPrice` (default 15), `shippingPrice` (default 40).
   - `GarmentVariant`: `productId`, `sku @unique`, `colorName`, `colorHex`, `size` (`S`, `M`, `L`, `XL`, `XXL`), `stock`, `priceAdjustment`.
6. **`PrintingService` (lines 126-140)**:
   - `supplierId`, `name`, `code` (`DTG`), `pricePerSurface` (default 80), `maxPrintWidthCm` (35.0), `maxPrintHeightCm` (45.0), `supportedSurfaces` (`BOTH`, `FRONT`, `BACK`).
7. **`DesignDocument` (lines 142-162)**:
   - `userId`, `title`, `garmentProductId`, `garmentVariantId`, `garmentColorHex`, `garmentSize`, `garmentFit`, `frontElements` (JSON string), `backElements` (JSON string), `sideElements` (JSON string), `previewFrontUrl`, `previewBackUrl`, `status`.
8. **`Order` (lines 164-192)**:
   - Fields: `orderNumber @unique`, `customerId`, `designId`, `supplierId`, `quantity`, `status` (`PAYMENT_CONFIRMED`), `paymentMode` (`DEV_MOCK`), `paymentStatus` (`PAID`).
   - Financial breakdown: `totalAmount`, `garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`.
   - Shipping details: `shippingName`, `shippingAddress`, `shippingCity`, `shippingPostal`, `shippingPhone`.
   - Snapshot: `snapshotData` (JSON string of complete design & pricing at checkout).
   - Relations: `obligations RoyaltyObligation[]`.
9. **`RoyaltyObligation` (lines 194-210)**:
   - Fields: `orderId`, `creatorId`, `artworkId`, `licenseOptionId`, `unitRoyalty`, `quantity`, `totalAmount`, `status` (`PENDING`, `ELIGIBLE`, `SETTLED`, `CANCELLED`).
   - Relations: `ledgerEntries RoyaltyLedgerEntry[]`.
10. **`RoyaltyLedgerEntry` (lines 212-223)**:
    - Fields: `creatorId`, `obligationId?`, `entryType` (`EARNING`, `PAYOUT_SETTLEMENT`, `ADJUSTMENT`), `amount` (signed Int THB), `balanceAfter` (Int THB), `reference`, `notes`, `createdAt`.
11. **`CreatorSettlement` (lines 225-234)**:
    - Fields: `creatorId`, `settlementNumber @unique`, `totalAmount`, `status` (`COMPLETED`), `payoutReference`.
12. **`AuditEvent` (lines 236-245)**:
    - Fields: `userId`, `action`, `entityType`, `entityId`, `payload`, `createdAt`.

### 1.3 Pre-Seeded Database State (`prisma/dev.db`)
Direct programmatic query on `prisma/dev.db` verified:
- **Order Count**: 1 (`APX-ORD-9021`)
- **Total Amount**: THB 410 (garmentCost: 150, printingCost: 80, licensingCost: 125, packagingCost: 15, shippingCost: 40)
- **RoyaltyObligations Count**: 3
  1. `creatorId`: Dash Ape Studio (`cmv1l9gp000048lk7wp6q51n8`), `artwork`: Dash Ape Classic Head Mark, `unitRoyalty`: 40, `totalAmount`: 40, `status`: `ELIGIBLE`.
  2. `creatorId`: Dash Ape Studio (`cmv1l9gp000048lk7wp6q51n8`), `artwork`: Cyber Primate Tokyo 2088, `unitRoyalty`: 60, `totalAmount`: 60, `status`: `ELIGIBLE`.
  3. `creatorId`: Cyber Monk (`cmv1l9gpa00078lk7kiisri99`), `artwork`: Static Glitch Protocol, `unitRoyalty`: 25, `totalAmount`: 25, `status`: `ELIGIBLE`.
- **RoyaltyLedgerEntries Count**: 3
  1. Entry 1: Creator Dash Ape, `obligationId`: ob1, `entryType`: `EARNING`, `amount`: 40, `balanceAfter`: 40, `reference`: `APX-ORD-9021`.
  2. Entry 2: Creator Dash Ape, `obligationId`: ob2, `entryType`: `EARNING`, `amount`: 60, `balanceAfter`: 100, `reference`: `APX-ORD-9021`.
  3. Entry 3: Creator Cyber Monk, `obligationId`: ob3, `entryType`: `EARNING`, `amount`: 25, `balanceAfter`: 25, `reference`: `APX-ORD-9021`.

### 1.4 Production Build & TypeScript State
- `npx tsc --noEmit` exits with **code 0** (clean, zero compiler errors).
- `npm run build` exits with **code 0** (generates static `/404` page only because no App Router routes exist).

---

## 2. Logic Chain

1. **Premise 1**: The database schema and seeded SQLite database already reflect the complete business domain entities for R3 (Order, RoyaltyObligation, RoyaltyLedgerEntry, Supplier, Creator, Garment, Artwork, Licensing).
2. **Premise 2**: In `prisma/seed.mjs`, records were created by sequential scripting rather than through an application-level order placement service or interactive `$transaction`.
3. **Premise 3**: To fulfill Acceptance Criterion *"Order creation atomically writes royalty obligations and ledger entries for all artists"*, there must be a production service function (e.g. `createOrderWithRoyalties` in `src/lib/orders.ts` or `src/lib/royalties.ts`) executing inside `prisma.$transaction(async (tx) => { ... })`.
4. **Premise 4**: Currently, no file in `src/` provides order placement, royalty ledger querying, settlement processing, or production specification generation.
5. **Premise 5**: Integration test `src/lib/__tests__/orders_royalties.test.ts` specified in `ORIGINAL_REQUEST.md` does not exist, causing `npm test` to fail immediately.
6. **Premise 6**: For R4, the UI is completely blank (`src/app/` has only `globals.css`), meaning all four portal domains (Marketplace, Creator Storefront & Dashboard, Supplier Dashboard, Customer Order Tracking) must be built from the ground up using the established brand tokens and database entities.

---

## 3. Gap Analysis & Detailed Requirements

### 3.1 Requirement R3: Auditable Royalty Ledger & Supplier Specs

| Area | Component / File | Current Status | Required Behavior / Solution |
| :--- | :--- | :--- | :--- |
| **Atomic Order Placement** | `src/lib/orders.ts` | **MISSING** | Accept order payload, recalculate server-authoritative pricing via `calculateLivePricing()`, generate unique `orderNumber` (e.g. `APX-ORD-XXXX`), write `Order`, `RoyaltyObligation` per license line, and `RoyaltyLedgerEntry` per creator atomically inside `prisma.$transaction`. |
| **Royalty Ledger Service** | `src/lib/royalties.ts` | **MISSING** | Calculate creator accrued balance, query immutable ledger history, and execute batch payout settlements (`entryType: 'PAYOUT_SETTLEMENT'`, negative amount, update obligation status to `SETTLED`). |
| **Supplier Production Package** | `src/lib/production.ts` | **MISSING** | Export structured JSON specification containing garment SKU, color, size, quantity, print technique, surface dimensions, and exact artwork coordinates (`x`, `y`, `width`, `height`, `rotation`, `zIndex`) with high-res asset references. |
| **API Endpoints** | `src/app/api/orders/route.ts`<br>`src/app/api/orders/[id]/route.ts`<br>`src/app/api/orders/[id]/production/route.ts`<br>`src/app/api/royalties/settle/route.ts` | **MISSING** | REST endpoints for submitting orders, viewing order status, downloading production packages, and settling creator royalties. |
| **Integration Test Suite** | `src/lib/__tests__/orders_royalties.test.ts` | **MISSING** | Test suite verifying atomic order creation, benchmark THB 410 allocation, ledger balance progression (40 ➔ 100), payout settlement deduction, and rollback on simulated errors. |

### 3.2 Requirement R4: Multi-Role Portals & Marketplace

| Portal / View | Route | Current Status | Required Features |
| :--- | :--- | :--- | :--- |
| **Root Layout & Navigation** | `src/app/layout.tsx`<br>`src/app/page.tsx` | **MISSING** | Global header with navigation (Marketplace, Studio, Creator, Supplier, Orders) styled with brand tokens (`#131718` Ink, `#DABA98` Warm Beige, `#F5F0E8` Paper). Landing page with hero banner and entry points. |
| **Marketplace & Storefronts** | `src/app/marketplace/page.tsx`<br>`src/app/creators/[slug]/page.tsx` | **MISSING** | - Artwork catalog grid with category filters (Illustration, Mascot, Typography, Pattern, Logo) and keyword search.<br>- Artwork card showing preview, title, creator avatar, and license price.<br>- "Customize on Garment" button linking to `/studio/new?artworkId=...`.<br>- Creator storefront displaying bio, avatar, and catalog. |
| **Creator Dashboard** | `src/app/creator/dashboard/page.tsx`<br>`src/app/creator/earnings/page.tsx` | **MISSING** | - Metrics cards: Total Sales Volume, Total Fees Earned, Accrued Eligible Royalty Balance, Settled Payouts.<br>- Auditable Royalty Ledger table with date, reference order number, artwork name, amount, balance after, and status.<br>- Active artwork portfolio view with license options. |
| **Supplier Dashboard** | `src/app/supplier/dashboard/page.tsx` | **MISSING** | - Pending production job queue with status badges (`PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `SHIPPED`).<br>- One-click "View / Download Production Spec" (linking to `/api/orders/[id]/production`).<br>- Status update controls to advance order fulfillment.<br>- Blank garment inventory summary. |
| **Customer Order Tracking** | `src/app/account/orders/page.tsx`<br>`src/app/account/orders/[id]/page.tsx` | **MISSING** | - Customer order history list.<br>- Detail view with order status stepper (`Payment Confirmed` ➔ `In Production` ➔ `Shipped` ➔ `Delivered`).<br>- Design preview showing Front/Back mockups.<br>- Full itemized pricing breakdown matching server values (Garment, DTG print, packaging, shipping, individual artwork licenses). |

---

## 4. Exact Interface Recommendations

To ensure consistency across Milestone 2 (R3) and Milestone 4 (R4), the following TypeScript interfaces and contract signatures are recommended:

### 4.1 Order Placement & Ledger Contracts (`src/lib/types.ts`)

```typescript
export interface CreateOrderInput {
  designId?: string;
  designConfig?: {
    garmentProductId: string;
    garmentVariantId?: string;
    garmentColorHex: string;
    garmentSize: string;
    garmentFit: string;
    frontElements: DesignElement[];
    backElements: DesignElement[];
    sideElements: DesignElement[];
    previewFrontUrl?: string;
    previewBackUrl?: string;
  };
  customerId?: string;
  quantity: number;
  shipping: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone?: string;
  };
  paymentMode?: string; // Default: 'DEV_MOCK'
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  garmentCost: number;
  printingCost: number;
  licensingCost: number;
  packagingCost: number;
  shippingCost: number;
  status: string;
  obligations: Array<{
    id: string;
    creatorId: string;
    artworkId: string;
    unitRoyalty: number;
    totalAmount: number;
    status: string;
  }>;
  ledgerEntries: Array<{
    id: string;
    creatorId: string;
    amount: number;
    balanceAfter: number;
  }>;
}

export interface CreatorLedgerSummary {
  creatorId: string;
  displayName: string;
  currentBalance: number;
  lifetimeEarnings: number;
  totalSettled: number;
  obligations: Array<{
    id: string;
    orderNumber: string;
    artworkTitle: string;
    unitRoyalty: number;
    quantity: number;
    totalAmount: number;
    status: 'PENDING' | 'ELIGIBLE' | 'SETTLED' | 'CANCELLED';
    createdAt: Date;
  }>;
  ledgerEntries: Array<{
    id: string;
    entryType: 'EARNING' | 'PAYOUT_SETTLEMENT' | 'ADJUSTMENT';
    amount: number;
    balanceAfter: number;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
  }>;
}
```

### 4.2 Production Specification Package Contract

```typescript
export interface ProductionJobPackage {
  jobId: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  supplier: {
    id: string;
    companyName: string;
    contactEmail: string;
    location: string;
  };
  garment: {
    productId: string;
    productSku: string;
    productName: string;
    fabric: string;
    weightGsm: number;
    fit: string;
    neckline: string;
    variantSku: string;
    colorName: string;
    colorHex: string;
    size: string;
    quantity: number;
  };
  printingTechnique: {
    code: string;
    name: string;
    maxPrintWidthCm: number;
    maxPrintHeightCm: number;
  };
  surfaces: Array<{
    surface: PrintSurface;
    printableAreaCm: { width: number; height: number };
    artworks: Array<{
      elementId: string;
      artworkId: string;
      title: string;
      creatorName: string;
      assetUrl: string;
      mimeType: string;
      placement: {
        xPercent: number;
        yPercent: number;
        widthPercent: number;
        heightPercent: number;
        rotationDeg: number;
        zIndex: number;
        calculatedWidthCm: number;
        calculatedHeightCm: number;
      };
    }>;
  }>;
  shipping: {
    recipientName: string;
    city: string;
    postalCode: string;
  };
}
```

### 4.3 Proposed API Route Contracts

1. **`POST /api/orders`**:
   - Request Body: `CreateOrderInput`
   - Response: `CreateOrderResult` (201 Created)
   - Errors: `400 Bad Request` (Zod validation failure), `404 Not Found` (garment/artwork not found), `500 Internal Server Error` (transaction failure).
2. **`GET /api/orders/[id]`**:
   - Response: Order details with design snapshot and itemized price breakdown.
3. **`GET /api/orders/[id]/production`**:
   - Response: `ProductionJobPackage` (application/json) with `Content-Disposition: attachment; filename="JOB-{orderNumber}.json"`.
4. **`POST /api/royalties/settle`**:
   - Request Body: `{ creatorId: string, payoutReference?: string }`
   - Response: `{ settlementId: string, settlementNumber: string, totalAmount: number, status: string }`

---

## 5. Caveats & Assumptions

1. **Database Mode**: The active development database is SQLite (`prisma/dev.db`). While Prisma supports interactive transactions (`$transaction(async (tx) => { ... })`) in SQLite, SQLite uses file-level locking during writes. Concurrency tests should ensure transactions remain short and deterministic.
2. **Mock Payment**: Payment processing is strictly simulated (`paymentMode: 'DEV_MOCK'`, `paymentStatus: 'PAID'`) as prescribed in `docs/PROJECT_INTAKE.md`.
3. **Vector/Asset Hosting**: In the current seed, artwork preview URLs point to DiceBear SVG seed URLs (`https://api.dicebear.com/...`). The production specification generator should handle SVGs and external URLs gracefully without requiring local filesystem asset downloads for the MVP.
4. **No Caveats Beyond Above**: All conclusions are drawn directly from codebase inspection and terminal command outputs.

---

## 6. Conclusion & Roadmap Recommendation

- **Prisma Schema is Production-Ready**: No schema changes are required for R3. The existing models in `prisma/schema.prisma` are well-structured, relational, and fully support atomic ordering, royalties, and supplier specs.
- **Immediate Next Steps for Milestone 2 (R3)**:
  1. Create `src/lib/orders.ts` with atomic transaction logic linking orders, royalty obligations, and ledger entries.
  2. Create `src/lib/royalties.ts` with balance summary and payout settlement routines.
  3. Create `src/lib/production.ts` with `generateProductionPackage()`.
  4. Create `src/lib/__tests__/orders_royalties.test.ts` validating atomic creation, benchmark THB 410, and ledger tracking.
  5. Implement `POST /api/orders` and `GET /api/orders/[id]/production`.
- **Immediate Next Steps for Milestone 4 (R4)**:
  1. Build root layout (`src/app/layout.tsx`) and navigation bar styled with brand tokens.
  2. Implement Marketplace catalog (`src/app/marketplace/page.tsx`) and Creator profile (`src/app/creators/[slug]/page.tsx`).
  3. Implement Creator Dashboard (`src/app/creator/dashboard/page.tsx`) displaying the royalty ledger table.
  4. Implement Supplier Dashboard (`src/app/supplier/dashboard/page.tsx`) displaying jobs and production spec downloads.
  5. Implement Customer Order Portal (`src/app/account/orders/[id]/page.tsx`) displaying itemized pricing breakdown and status stepper.

---

## 7. Verification Method

To independently verify all claims made in this report:
1. **Verify Missing Files & Tests**:
   - Run `npm test` in the project root: verify it exits with code 1 due to "No test files found".
   - Run `dir src\app` in PowerShell: verify only `globals.css` is present.
2. **Verify Database Records**:
   - Execute:
     ```powershell
     node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.order.count(), p.royaltyObligation.count(), p.royaltyLedgerEntry.count()]).then(([o, ro, le]) => { console.log({ orders: o, obligations: ro, ledgerEntries: le }); p['`$disconnect'](); });"
     ```
   - Verify output matches: `{ orders: 1, obligations: 3, ledgerEntries: 3 }`.
3. **Verify Benchmark Pricing Order**:
   - Execute:
     ```powershell
     node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.order.findFirst().then(o => { console.log({ orderNumber: o.orderNumber, total: o.totalAmount, costs: { garment: o.garmentCost, print: o.printingCost, license: o.licensingCost, pack: o.packagingCost, ship: o.shippingCost } }); p['`$disconnect'](); });"
     ```
   - Verify output: `total: 410`, `garment: 150`, `print: 80`, `license: 125`, `pack: 15`, `ship: 40`.
4. **Verify TypeScript Status**:
   - Run `npx tsc --noEmit`: verify zero errors (exit code 0).
