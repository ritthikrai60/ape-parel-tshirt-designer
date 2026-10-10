# Handoff Report: Codebase Infrastructure & Asset Survey

- **Agent**: `explorer_survey_1`
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_1`
- **Date**: 2026-10-09T23:32:00Z
- **Task Scope**: Complete survey of build configs, database schema & seed state, source code structure, test suites, and 3D/2D static assets.

---

## 1. Observation

### A. Root Configuration & Dependencies
- `package.json` (`d:/Coding Projects/ape-parel tshirt/package.json:1-40`):
  - Next.js: `^14.2.3` (App Router)
  - React / React-DOM: `^18.3.1`
  - Prisma Client & CLI: `^5.14.0`
  - Three.js: `three@^0.164.1`, `@types/three@^0.164.0`
  - Validation & Utility: `zod@^3.23.8`, `clsx@^2.1.1`, `tailwind-merge@^2.3.0`, `lucide-react@^0.379.0`
  - Testing: `vitest@^1.6.0`
  - Scripts:
    - `"dev": "next dev"`
    - `"build": "next build"`
    - `"test": "vitest run"`
    - `"test:watch": "vitest"`
    - `"db:push": "prisma db push"`
    - `"db:seed": "node prisma/seed.mjs"`
    - `"lint": "next lint"`
- `tsconfig.json` (`d:/Coding Projects/ape-parel tshirt/tsconfig.json:20-22`):
  - Paths alias configured: `"@/*": ["./src/*"]`
  - `"moduleResolution": "bundler"`, `"strict": true`, `"noEmit": true`
  - Command `npx tsc --noEmit` exited with code `0` (zero TypeScript errors).
- `next.config.mjs` (`d:/Coding Projects/ape-parel tshirt/next.config.mjs:4-6`):
  - Remote image domains configured: `['images.unsplash.com', 'api.dicebear.com']`
  - `reactStrictMode: true`
  - Command `npm run build` executed successfully (exited with code `0`, prerendered default static routes).
- `vitest.config.ts` (`d:/Coding Projects/ape-parel tshirt/vitest.config.ts:1-15`):
  - `environment: 'node'`, `globals: true`
  - Resolve alias: `'@': path.resolve(__dirname, './src')`
  - Executed command: `npm test` (`vitest run`):
    ```
    RUN v1.6.1 D:/Coding Projects/ape-parel tshirt
    No test files found, exiting with code 1
    ```
- `tailwind.config.ts` (`d:/Coding Projects/ape-parel tshirt/tailwind.config.ts:11-35`):
  - Custom design tokens properly set:
    - `ink`: `#131718`, `ink.light`: `#222729`, `ink.muted`: `#2d3335`
    - `warm`: `#DABA98`, `warm.light`: `#e8d2b8`, `warm.dark`: `#b8946e`
    - `paper`: `#F5F0E8`, `paper.light`: `#FAF7F2`, `paper.dark`: `#EBE4D8`
    - `mutedGray`: `#777777`
    - `borderCol`: `#DED7CE`
  - Content paths include `./src/pages/**/*.{...}`, `./src/components/**/*.{...}`, `./src/app/**/*.{...}`.
- `src/app/globals.css` (`d:/Coding Projects/ape-parel tshirt/src/app/globals.css:5-8`):
  - Declares `:root { --background: #F5F0E8; --foreground: #131718; }` and custom dark scrollbars.

### B. Prisma Schema, Database & Seed Status
- `prisma/schema.prisma` (`d:/Coding Projects/ape-parel tshirt/prisma/schema.prisma:1-246`):
  - Provider: `sqlite`, URL: `env("DATABASE_URL")` (`file:./dev.db` in `.env`).
  - Models declared:
    1. `User` (roles: `CUSTOMER`, `CREATOR`, `SUPPLIER`, `ADMIN`)
    2. `CreatorProfile` (fields: `userId`, `slug`, `displayName`, `bio`, `avatarUrl`, `website`, `payoutDetails`)
    3. `SupplierProfile` (fields: `userId`, `slug`, `companyName`, `description`, `location`, `contactEmail`, `contactPhone`, `leadTimeDays`, `minOrderQuantity`, `verified`)
    4. `Artwork` (fields: `creatorId`, `title`, `description`, `category`, `previewUrl`, `originalUrl`, `mimeType`, `tags`, `status`, `moderationStatus`)
    5. `LicenseOption` (fields: `artworkId`, `name`, `price`, `commercialUse`, `terms`, `scope`)
    6. `GarmentProduct` (fields: `supplierId`, `sku`, `name`, `description`, `fabric`, `weightGsm`, `fit`, `neckline`, `basePrice`, `packagingPrice`, `shippingPrice`)
    7. `GarmentVariant` (fields: `productId`, `sku`, `colorName`, `colorHex`, `size`, `stock`, `priceAdjustment`)
    8. `PrintingService` (fields: `supplierId`, `name`, `code`, `description`, `pricePerSurface`, `maxPrintWidthCm`, `maxPrintHeightCm`, `supportedSurfaces`, `minOrderQty`)
    9. `DesignDocument` (fields: `userId`, `title`, `garmentProductId`, `garmentVariantId`, `garmentColorHex`, `garmentSize`, `garmentFit`, `frontElements`, `backElements`, `sideElements`, `previewFrontUrl`, `previewBackUrl`, `status`)
    10. `Order` (fields: `orderNumber`, `customerId`, `designId`, `supplierId`, `quantity`, `status`, `paymentMode`, `paymentStatus`, `totalAmount`, `garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, `shippingName`, `shippingAddress`, `shippingCity`, `shippingPostal`, `shippingPhone`, `snapshotData`)
    11. `RoyaltyObligation` (fields: `orderId`, `creatorId`, `artworkId`, `licenseOptionId`, `unitRoyalty`, `quantity`, `totalAmount`, `status`)
    12. `RoyaltyLedgerEntry` (fields: `creatorId`, `obligationId`, `entryType`, `amount`, `balanceAfter`, `reference`, `notes`)
    13. `CreatorSettlement` (fields: `creatorId`, `settlementNumber`, `totalAmount`, `status`, `payoutReference`)
    14. `AuditEvent` (fields: `userId`, `action`, `entityType`, `entityId`, `payload`)
- SQLite database status (`prisma/dev.db`):
  - Verified by live database inspection command:
    - `User`: 7 records (1 Admin, 1 Customer, 3 Creators, 2 Suppliers)
    - `Artwork`: 5 records with active license options
    - `GarmentProduct`: 2 records (`APX-HVY-001` and `RTR-BOX-002`)
    - `GarmentVariant`: 7 records (Ink Black, Optic White, Paper Beige, Warm Kraft in L and XL)
    - `PrintingService`: 2 records (Bangkok DTG at ฿80/surface; Siam DTG at ฿85/surface)
    - `Order`: 1 pre-seeded benchmark order (`APX-ORD-9021`)
    - `RoyaltyObligation`: 3 records
    - `RoyaltyLedgerEntry`: 3 records
- Key seeded IDs and entities:
  - Admin: `admin@ape-parel.com` (`id: cmv1l9go500008lk7f4ikbtse`)
  - Customer: `customer@ape-parel.com` (`id: cmv1l9goj00018lk708shtmy7`)
  - Creator 1: Dash Ape Studio (`dashape@ape-parel.com`, slug `dash-ape`, creatorId `cmv1l9gp000048lk7wp6q51n8`)
  - Creator 2: Cyber Monk (`cybermonk@ape-parel.com`, slug `cyber-monk`, creatorId `cmv1l9gpa00078lk7kiisri99`)
  - Creator 3: Soma Botanica (`soma@ape-parel.com`, slug `soma-botanica`, creatorId `cmv1l9gpf00098lk7ncfv3r4g`)
  - Supplier 1: Bangkok Garment Craft (`production@bangkokgarment.co.th`, slug `bangkok-garment-craft`, supplierId `cmv1l9gr5000t8lk7u1jzdog2`)
  - Supplier 2: Siam Textile Mill (`contact@siamtextile.th`, slug `siam-textile-mill`, supplierId `cmv1l9gsd00158lk797qpfiy5`)
  - Garment 1: Apex Heavyweight Oversized Tee (`sku: APX-HVY-001`, `id: cmv1l9grk000x8lk7pf77s3p9`, basePrice: 150, packagingPrice: 15, shippingPrice: 40)
  - Artwork 1: Dash Ape Classic Head Mark (License: THB 40, `id: cmv1l9gpv000c8lk7u3zd23nv`, licId: `cmv1l9gpv000d8lk7eszee44t`)
  - Artwork 2: Cyber Primate Tokyo 2088 (License: THB 60, `id: cmv1l9gq6000g8lk7ekjngaa8`, licId: `cmv1l9gq6000h8lk7xikvsrcq`)
  - Artwork 3: Static Glitch Protocol (License: THB 25, `id: cmv1l9gqf000j8lk7xrrimf97`, licId: `cmv1l9gqf000k8lk7uxzhu31v`)
  - Benchmark Order `APX-ORD-9021`:
    - Garment: ฿150
    - DTG Print (1 surface): ฿80
    - Licenses (40 + 60 + 25): ฿125
    - Packaging: ฿15
    - Shipping: ฿40
    - Total: **THB 410**
    - Obligations: 3 records (40, 60, 25 THB)
    - Ledger entries: 3 records (running balances: 40, 100, 25 THB)

### C. Existing Files under `src/`
- `src/lib/prisma.ts`: Exports global singleton `prisma` client.
- `src/lib/types.ts`: Exports types `PrintSurface`, `DesignElement`, `ArtworkLicenseLine`, `PricingPayload`, `PriceCalculationResult`, `UserRole`.
- `src/lib/pricing.ts`: Contains `calculateLivePricing(payload: PricingPayload)`.
  - Calculates:
    - Garment cost: `(garment.basePrice + variantAdjustment) * validQty`
    - Surfaces count: `Math.max(1, surfacesUsed.length)`
    - Printing cost: `printPricePerSurface * surfacesCount * validQty`
    - Packaging cost: `garment.packagingPrice * validQty`
    - Shipping cost: `garment.shippingPrice`
    - Licensing cost: `sum(license.price * validQty)`
    - Total amount: `garmentCost + printingCost + licensingCost + packagingCost + shippingCost`
- Directories that DO NOT EXIST under `src/`:
  - `src/components/` (no UI components)
  - `src/app/` has only `globals.css` (no `layout.tsx`, `page.tsx`, `api/`, `marketplace/`, `studio/`, `creator/`, `supplier/`, `account/`, `admin/`)
  - `src/lib/__tests__/` (no test files)

### D. Static 3D & 2D Assets
- `public/` directory does NOT exist.
- `public/models/tshirt.obj` does NOT exist in workspace or Git history.
- Requirement R1 explicitly specifies:
  - Three.js 3D Viewport with OrbitControls, neutral 3-point lighting, floor shadow.
  - Independent Front (`u ∈ [0, 0.5]`) and Back (`u ∈ [0.5, 1.0]`) texture mapping onto `tshirt.obj`.
  - 2D Canvas centered on transparent background with authentic garment colors without print boundary boxes.

---

## 2. Logic Chain

1. **Build & Type Health (Obs A)**:
   - TypeScript compiles cleanly (`npx tsc --noEmit` -> code 0).
   - Next.js build runs cleanly (`npm run build` -> code 0).
   - Tailwind config correctly exposes the exact required tokens (`ink`, `warm`, `paper`, `mutedGray`, `borderCol`).
   - Hence, the build pipeline is fully operational.

2. **Database & Data Layer Readiness (Obs B)**:
   - The Prisma schema contains all required relations and models for the 7 core domains.
   - The SQLite database `prisma/dev.db` has been seeded with high-fidelity test records that match the exact benchmark values required by `ORIGINAL_REQUEST.md` (150 + 80 + 15 + 40 + 125 = 410 THB).
   - Hence, backend database migrations or new models are NOT immediately required; the existing schema is comprehensive and ready for consumption.

3. **Pricing Engine Alignment (Obs B & C)**:
   - `src/lib/pricing.ts` already implements the authoritative calculation logic matching the THB 410 benchmark.
   - However, no test file currently executes or asserts this logic (`npm test` reports "No test files found").
   - Furthermore, there is no HTTP route handler (`src/app/api/pricing/calculate/route.ts`) wrapping `calculateLivePricing`.

4. **Order & Royalty Logic Gaps (Obs B & C)**:
   - The seed script `prisma/seed.mjs` demonstrates how orders, royalty obligations, and ledger entries should be written atomically.
   - However, there is no shared service function in `src/lib/` (e.g., `src/lib/orders.ts` or `src/lib/royalties.ts`) for creating orders, writing obligations, and settling balances at runtime.
   - There are no API routes (`src/app/api/orders/route.ts`, `src/app/api/royalties/settle/route.ts`, `src/app/api/orders/[id]/production/route.ts`).

5. **Front-End & 3D Asset Gaps (Obs C & D)**:
   - `src/app/` currently lacks `layout.tsx` and all user-facing pages (`/`, `/marketplace`, `/studio/new`, `/account/orders`, `/creator/earnings`, `/supplier/dashboard`, `/admin/orders`).
   - `public/models/tshirt.obj` does not exist on disk. A Three.js-compatible OBJ mesh with UV mapping partitioned into Front (`u ∈ [0, 0.5]`) and Back (`u ∈ [0.5, 1.0]`) must be authored or supplied, or procedurally loaded.

---

## 3. Caveats

1. **No Test Suites Present**: While `calculateLivePricing` exists, it has not been validated by automated Vitest runs yet because `src/lib/__tests__/pricing.test.ts` has not been authored.
2. **Missing 3D Mesh**: `public/models/tshirt.obj` must be created. The mesh must obey the UV coordinate range specified in R1: Front mapped to `u in [0, 0.5]` and Back mapped to `u in [0.5, 1.0]`. If an external OBJ is not downloaded, a clean procedural/geometric OBJ must be written to `public/models/tshirt.obj` conforming to standard Wavefront OBJ format.
3. **App Router Structure**: Because Next.js 14 requires `src/app/layout.tsx` to render any App Router pages, creating `src/app/layout.tsx` is the prerequisite for all frontend routing.

---

## 4. Conclusion

The ape-parel repository is in a clean, pre-implementation state:
1. **Infrastructure**: Fully configured and operational (Next.js 14, TypeScript, Tailwind CSS, Vitest, Prisma).
2. **Database**: 100% prepared and pre-seeded in `prisma/dev.db`, containing all necessary entities, the APX-ORD-9021 benchmark order, and 3-way royalty obligations.
3. **Core Pricing Logic**: `src/lib/pricing.ts` already contains the math for the THB 410 calculation.
4. **Primary Gaps Identified**:
   - **Tests**: Create `src/lib/__tests__/pricing.test.ts` (TASK-004) and `src/lib/__tests__/orders_royalties.test.ts` (TASK-006) to satisfy `npm test`.
   - **3D Asset & Studio**: Create `public/models/tshirt.obj` with split UVs (`[0, 0.5]` front, `[0.5, 1.0]` back), transparent 2D canvas, and Three.js viewer (TASK-003).
   - **Order & Royalty APIs**: Implement `src/lib/orders.ts`, `src/app/api/pricing/calculate/route.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/production/route.ts`, and royalty settlement (TASK-005, TASK-006).
   - **User Portals & UI**: Implement `src/app/layout.tsx`, navigation, marketplace, creator dashboard, supplier dashboard, and customer order tracking (TASK-002, TASK-007).

---

## 5. Verification Method

To independently verify all findings in this report, run the following commands:

1. **Verify TypeScript compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected output*: Exits with code `0`, 0 errors.

2. **Verify test suite absence**:
   ```powershell
   npm test
   ```
   *Expected output*: Exits with code `1`, `No test files found`.

3. **Verify SQLite database records**:
   ```powershell
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.user.count(), p.artwork.count(), p.garmentProduct.count(), p.order.count(), p.royaltyObligation.count(), p.royaltyLedgerEntry.count()]).then(([u, a, g, o, ro, rl]) => { console.log({ users: u, artworks: a, garments: g, orders: o, royaltyObligations: ro, royaltyLedgerEntries: rl }); p['\`$disconnect'](); });"
   ```
   *Expected output*: `{ users: 7, artworks: 5, garments: 2, orders: 1, royaltyObligations: 3, royaltyLedgerEntries: 3 }`.

4. **Verify missing 3D asset**:
   ```powershell
   Test-Path "public\models\tshirt.obj"
   ```
   *Expected output*: `False`.
