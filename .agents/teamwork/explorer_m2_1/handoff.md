# Handoff Report: Atomic Order Placement, Anti-Tampering & Auditable Royalty Ledger (M2)

**Author:** `explorer_m2_1` (Atomic Order Placement & Transaction Explorer)  
**Date:** 2026-10-10  
**Target Milestone:** M2 (Royalty Ledger & Supplier Specs)  
**Working Directory:** `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1`

---

## 1. Observation

Direct observations from examining the codebase, database schema, seeder, pricing engine, and test suites:

1. **Database Schema (`prisma/schema.prisma`)**:
   - `DesignDocument` (lines 142-162): Holds design metadata with `frontElements`, `backElements`, `sideElements` stored as JSON strings. Status defaults to `"READY_FOR_QUOTE"`. Relations: `orders Order[]`, `garmentProduct GarmentProduct`.
   - `Order` (lines 164-192): Contains unique `orderNumber`, foreign keys `designId`, `supplierId`, `customerId` (optional). Contains cost breakdowns: `garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, and `totalAmount`. Shipping address fields: `shippingName`, `shippingAddress`, `shippingCity`, `shippingPostal`, `shippingPhone`. Contains `snapshotData` (JSON string) and `obligations RoyaltyObligation[]`.
   - `RoyaltyObligation` (lines 194-210): Foreign keys `orderId` (onDelete: Cascade), `creatorId`, `artworkId`, `licenseOptionId`. Pricing fields: `unitRoyalty`, `quantity`, `totalAmount`. Status defaults to `"PENDING"`, can be `"ELIGIBLE"`, `"SETTLED"`, `"CANCELLED"`.
   - `RoyaltyLedgerEntry` (lines 212-223): Foreign keys `creatorId`, `obligationId` (optional, onDelete: SetNull). Fields: `entryType` (`"EARNING"`, `"PAYOUT_SETTLEMENT"`, `"ADJUSTMENT"`), `amount` (integer THB), `balanceAfter` (integer THB cumulative balance), `reference` (e.g. orderNumber), `notes`.
   - `GarmentProduct` (lines 92-110): Links to `supplierId SupplierProfile`. Base pricing: `basePrice` (150 THB), `packagingPrice` (15 THB), `shippingPrice` (40 THB).
   - `PrintingService` (lines 126-140): DTG service provides `pricePerSurface` (80 THB).

2. **Seeded Reference Execution (`prisma/seed.mjs`)**:
   - Lines 504-541: Canonical benchmark order `APX-ORD-9021` with `totalAmount: 410`, itemized as `garmentCost: 150`, `printingCost: 80`, `licensingCost: 125`, `packagingCost: 15`, `shippingCost: 40`.
   - Lines 544-620: Creates 3 individual `RoyaltyObligation` records and 3 corresponding `RoyaltyLedgerEntry` records:
     - Creator 1 (Artwork 1, 40 THB): Obligation `totalAmount: 40`, Ledger entry `amount: 40`, `balanceAfter: 40`.
     - Creator 1 (Artwork 2, 60 THB): Obligation `totalAmount: 60`, Ledger entry `amount: 60`, `balanceAfter: 100` (40 + 60).
     - Creator 2 (Artwork 3, 25 THB): Obligation `totalAmount: 25`, Ledger entry `amount: 25`, `balanceAfter: 25`.
   - Both Creator 1 and Creator 2 obligations have `status: 'ELIGIBLE'` upon paid order placement.

3. **Authoritative Pricing Engine (`src/lib/pricing.ts`)**:
   - `calculateLivePricing(payload: PricingPayload): Promise<PriceCalculationResult>` calculates costs independently from the client using database records.
   - Rejects missing or mismatched `licenseOptionId` (lines 107-115).
   - Normalizes quantity to integer `>= 1` (line 20).
   - Counts distinct surfaces: `['FRONT', 'BACK', 'SIDE']` with fallback minimum of 1.

4. **Existing API Patterns (`src/app/api/pricing/calculate/route.ts`)**:
   - Uses `NextRequest`, `NextResponse`, Zod schema validation (`.safeParse`), and explicit error status mapping (400 for validation / bad request, 404 for missing garment, 500 for unexpected errors).

5. **Existing Test Suite Baseline**:
   - Executing `npm test` runs Vitest v1.6.1 across 3 test files (`pricing.test.ts`, `pricing_adversarial.test.ts`, `pricing_challenger.test.ts`).
   - All 86 existing tests currently pass in 763ms.

6. **Peer Scope Boundaries**:
   - `explorer_m2_2` (`.agents/teamwork/explorer_m2_2/DISPATCH.md`): Dispatched to design `src/lib/royalties.ts` (`getCreatorLedgerSummary`, `executeCreatorPayoutSettlement`) and `src/app/api/royalties/settle/route.ts`.
   - `explorer_m2_3` (`.agents/teamwork/explorer_m2_3/DISPATCH.md`): Dispatched to design `src/lib/production.ts` (`generateProductionPackage`) and `src/app/api/orders/[id]/production/route.ts`.

---

## 2. Logic Chain

From the observations above, we establish the step-by-step logic chain for designing `src/lib/orders.ts`, `src/app/api/orders/route.ts`, and `src/lib/__tests__/orders_royalties.test.ts`:

1. **Step 1: Guaranteeing Price Integrity via Server Recalculation (Anti-Tampering)**
   - *Observation Reference*: Observation 3 (`calculateLivePricing`) and Observation 4 (API patterns).
   - *Reasoning*: Because client applications can be modified or manipulated, checkout totals sent from the browser can never be trusted.
   - *Design Decision*: `createOrderAtomic` must invoke `calculateLivePricing` using the verified garment, variant, quantity, and license lines. If the client submits `clientClaimedTotal`, `createOrderAtomic` strictly verifies `clientClaimedTotal === serverCalculation.totalAmount`. If there is any discrepancy, it immediately throws an error before opening any database transaction or writing any records.

2. **Step 2: Atomic Database Multi-Entity Creation via `prisma.$transaction`**
   - *Observation Reference*: Observation 1 (`schema.prisma` models `DesignDocument`, `Order`, `RoyaltyObligation`, `RoyaltyLedgerEntry`).
   - *Reasoning*: Placing an apparel order is an all-or-nothing business transaction. If an order record is written but obligation or ledger writes fail, artists will be deprived of royalties. Conversely, if ledger entries are written but order creation fails, financial discrepancies occur.
   - *Design Decision*: Wrap the entire creation sequence inside `prisma.$transaction(async (tx) => { ... })`. Inside `tx`:
     - Step 2a: Persist `DesignDocument` (with status `"ORDERED"`).
     - Step 2b: Resolve supplier ID from `GarmentProduct` to prevent supplier spoofing.
     - Step 2c: Generate unique `orderNumber` (e.g. `APX-ORD-<timestamp><random>`).
     - Step 2d: Persist `Order` with itemized costs, shipping address, and frozen `snapshotData`.
     - Step 2e: For each licensed artwork in the design, create a `RoyaltyObligation` with `unitRoyalty = license.price`, `quantity = order.quantity`, `totalAmount = license.price * quantity`, and `status = 'ELIGIBLE'`.
     - Step 2f: For each obligation, create a `RoyaltyLedgerEntry` with `entryType = 'EARNING'`.

3. **Step 3: Calculating Accurate Cumulative Running Ledger Balances (`balanceAfter`)**
   - *Observation Reference*: Observation 1 (`RoyaltyLedgerEntry.balanceAfter`) and Observation 2 (`seed.mjs` lines 558-620 where balance accumulates sequentially: 40 -> 100).
   - *Reasoning*: In SQLite, multiple ledger entries can be inserted in the same transaction for the same creator (e.g. Creator 1 has 2 artworks on one shirt). Querying `tx.royaltyLedgerEntry.findFirst` once at the beginning of the transaction would not see the in-flight uncommitted entries if not tracked, or could cause balance collisions.
   - *Design Decision*: Maintain an in-memory accumulator map `creatorBalances = new Map<string, number>()` inside the transaction.
     - For each creator encountered:
       - If not yet in map, query the creator's latest ledger entry from `tx`: `latest = await tx.royaltyLedgerEntry.findFirst({ where: { creatorId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })`. Initial balance is `latest?.balanceAfter ?? 0`.
       - For each obligation belonging to that creator, compute `newBalance = currentBalance + obligation.totalAmount`.
       - Update the map with `newBalance`.
       - Write `RoyaltyLedgerEntry` with `balanceAfter: newBalance`.
     - This guarantees 100% mathematical precision across single and multiple artworks per creator without race conditions.

4. **Step 4: Rollback Testing Harness via Explicit Test Hooks**
   - *Observation Reference*: R3 from `ORIGINAL_REQUEST.md` and requirement from `DISPATCH.md` to verify transaction rollback on failure.
   - *Reasoning*: Testing rollback in unit/integration tests without modifying production tables requires inducing a controlled failure mid-transaction.
   - *Design Decision*: Add an optional diagnostic parameter to `CreateOrderInput`: `_simulateFailureAtStep?: 'design' | 'order' | 'obligation' | 'ledger'`. When set during tests, it throws a simulated exception at that exact transaction step. The test verifies that `prisma.$transaction` aborts and that zero entities persist.

5. **Step 5: API Route Specification (`src/app/api/orders/route.ts`)**
   - *Observation Reference*: Observation 4 (`pricing/calculate/route.ts`).
   - *Reasoning*: The orders API endpoint must validate JSON input via Zod, enforce required shipping fields, gracefully handle business errors, and provide a query endpoint for customer orders.
   - *Design Decision*: Implement `POST /api/orders` (creating order, returning 201 on success, 400 on price tampering or validation error, 404 on missing garment) and `GET /api/orders` (querying orders with pagination and filtering by `customerId` or `supplierId`).

6. **Step 6: Integration Test Suite (`src/lib/__tests__/orders_royalties.test.ts`)**
   - *Observation Reference*: Observation 5 (existing test runner) and Observation 2 (seed benchmark).
   - *Reasoning*: The integration test must validate the THB 410 benchmark, multi-order ledger accumulation, anti-tampering rejection, transaction atomicity rollback, and clean up test records in `afterAll`.

---

## 3. Caveats

1. **SQLite Database Locking**: SQLite supports one write transaction at a time. The interactive transaction `prisma.$transaction` holds a write lock on the database. Because all calculations and anti-tamper verifications happen *before* the transaction opens, the write lock duration inside `tx` is minimized to < 30ms.
2. **Order Number Uniqueness**: `orderNumber` uses timestamp and random digit suffixes. In production with millions of orders, a collision-retry loop or sequence counter is recommended. For current MVP and tests, `APX-ORD-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}` ensures distinctness.
3. **Guest Checkouts**: If `customerId` is null (guest checkout), `Order.customerId` and `DesignDocument.customerId` are set to null, which is valid under `prisma.schema` where `customerId` is optional (`String?`).
4. **Scope Separation**: Production package generation belongs to `explorer_m2_3` (`production.ts`) and creator payout settlements belong to `explorer_m2_2` (`royalties.ts`). `orders.ts` focuses purely on order creation, obligations, ledger writes, and anti-tamper validation.

---

## 4. Conclusion & Concrete Specifications

### 4.1. Domain Types (`src/lib/types.ts` Additions)

The following interfaces should be appended or added to `src/lib/types.ts`:

```typescript
export interface CreateOrderInput {
  garmentProductId: string;
  garmentVariantId?: string;
  garmentColorHex?: string;
  garmentSize?: string;
  garmentFit?: string;
  quantity?: number;
  designTitle?: string;
  frontElements?: DesignElement[];
  backElements?: DesignElement[];
  sideElements?: DesignElement[];
  frontArtworkLicenses?: ArtworkLicenseLine[];
  backArtworkLicenses?: ArtworkLicenseLine[];
  sideArtworkLicenses?: ArtworkLicenseLine[];
  previewFrontUrl?: string;
  previewBackUrl?: string;
  customerId?: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostal: string;
  shippingPhone?: string;
  clientClaimedTotal?: number;
  paymentMode?: string;
  paymentStatus?: string;
  _simulateFailureAtStep?: 'design' | 'order' | 'obligation' | 'ledger';
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  designId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  costs: {
    garmentCost: number;
    printingCost: number;
    licensingCost: number;
    packagingCost: number;
    shippingCost: number;
  };
  obligationsCount: number;
  ledgerEntriesCount: number;
  obligations: Array<{
    id: string;
    artworkId: string;
    creatorId: string;
    unitRoyalty: number;
    totalAmount: number;
    status: string;
  }>;
  order: {
    id: string;
    orderNumber: string;
    customerId: string | null;
    designId: string;
    supplierId: string;
    quantity: number;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    totalAmount: number;
    garmentCost: number;
    printingCost: number;
    licensingCost: number;
    packagingCost: number;
    shippingCost: number;
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostal: string;
    shippingPhone: string | null;
    createdAt: Date;
  };
}
```

---

### 4.2. Complete Specification for `src/lib/orders.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import {
  CreateOrderInput,
  CreateOrderResult,
  ArtworkLicenseLine,
} from '@/lib/types';

/**
 * Generates a unique human-readable order number.
 * Format: APX-ORD-XXXX-YYYY (e.g. APX-ORD-9021-4821)
 */
function generateOrderNumber(): string {
  const timePart = Date.now().toString().slice(-4);
  const randPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `APX-ORD-${timePart}-${randPart}`;
}

/**
 * Authoritative Atomic Order Placement Service
 *
 * 1. Recalculates exact pricing server-side.
 * 2. Rejects client-side price tampering.
 * 3. Atomically commits DesignDocument, Order, RoyaltyObligation[],
 *    and RoyaltyLedgerEntry[] in a single Prisma transaction.
 */
export async function createOrderAtomic(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));

  // Extract artwork license lines from explicit licenses or design elements
  const frontLicenses: ArtworkLicenseLine[] =
    input.frontArtworkLicenses ??
    input.frontElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  const backLicenses: ArtworkLicenseLine[] =
    input.backArtworkLicenses ??
    input.backElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  const sideLicenses: ArtworkLicenseLine[] =
    input.sideArtworkLicenses ??
    input.sideElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  // 1. Authoritative Server-Side Pricing Recalculation
  const pricing = await calculateLivePricing({
    garmentProductId: input.garmentProductId,
    garmentVariantId: input.garmentVariantId,
    quantity,
    frontArtworkLicenses: frontLicenses,
    backArtworkLicenses: backLicenses,
    sideArtworkLicenses: sideLicenses,
  });

  // 2. Anti-Tampering Price Validation
  if (
    input.clientClaimedTotal !== undefined &&
    input.clientClaimedTotal !== null &&
    input.clientClaimedTotal !== pricing.totalAmount
  ) {
    throw new Error(
      `Price tampering detected: client claimed total ${input.clientClaimedTotal} THB does not match server authoritative total ${pricing.totalAmount} THB`
    );
  }

  // 3. Atomic Database Execution via Prisma Transaction
  return await prisma.$transaction(async (tx) => {
    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'design') {
      throw new Error('Simulated failure before DesignDocument creation');
    }

    // Look up garment and verified supplier profile
    const garment = await tx.garmentProduct.findUniqueOrThrow({
      where: { id: input.garmentProductId },
      select: { id: true, sku: true, name: true, supplierId: true },
    });

    // 3a. Create DesignDocument
    const design = await tx.designDocument.create({
      data: {
        userId: input.customerId ?? null,
        title: input.designTitle ?? 'Custom Tee',
        garmentProductId: input.garmentProductId,
        garmentVariantId: input.garmentVariantId ?? null,
        garmentColorHex: input.garmentColorHex ?? '#131718',
        garmentSize: input.garmentSize ?? 'L',
        garmentFit: input.garmentFit ?? 'oversized',
        frontElements: JSON.stringify(input.frontElements ?? []),
        backElements: JSON.stringify(input.backElements ?? []),
        sideElements: JSON.stringify(input.sideElements ?? []),
        previewFrontUrl: input.previewFrontUrl ?? null,
        previewBackUrl: input.previewBackUrl ?? null,
        status: 'ORDERED',
      },
    });

    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'order') {
      throw new Error('Simulated failure before Order creation');
    }

    // 3b. Create Order
    const orderNumber = generateOrderNumber();
    const paymentStatus = input.paymentStatus ?? 'PAID';
    const orderStatus =
      paymentStatus === 'PAID' ? 'PAYMENT_CONFIRMED' : 'AWAITING_PAYMENT';

    const snapshotData = JSON.stringify({
      garmentSku: garment.sku,
      garmentName: garment.name,
      colorHex: input.garmentColorHex ?? '#131718',
      size: input.garmentSize ?? 'L',
      fit: input.garmentFit ?? 'oversized',
      quantity,
      pricing: {
        garmentCost: pricing.garmentCost,
        printingCost: pricing.printingCost,
        licensingCost: pricing.licensingCost,
        packagingCost: pricing.packagingCost,
        shippingCost: pricing.shippingCost,
        totalAmount: pricing.totalAmount,
      },
      surfaces: pricing.surfacesUsed,
      artworkLicenses: pricing.breakdown.artworkLicenses,
      createdAt: new Date().toISOString(),
    });

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        designId: design.id,
        supplierId: garment.supplierId,
        quantity,
        status: orderStatus,
        paymentMode: input.paymentMode ?? 'DEV_MOCK',
        paymentStatus,
        totalAmount: pricing.totalAmount,
        garmentCost: pricing.garmentCost,
        printingCost: pricing.printingCost,
        licensingCost: pricing.licensingCost,
        packagingCost: pricing.packagingCost,
        shippingCost: pricing.shippingCost,
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingPostal: input.shippingPostal,
        shippingPhone: input.shippingPhone ?? null,
        snapshotData,
      },
    });

    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'obligation') {
      throw new Error('Simulated failure before RoyaltyObligation creation');
    }

    // 3c. Create RoyaltyObligations & RoyaltyLedgerEntries
    const allLicenseLines = [
      ...frontLicenses,
      ...backLicenses,
      ...sideLicenses,
    ];

    const createdObligations: Array<{
      id: string;
      artworkId: string;
      creatorId: string;
      unitRoyalty: number;
      totalAmount: number;
      status: string;
    }> = [];

    // Map to maintain running cumulative balance per creator during this transaction
    const creatorRunningBalances = new Map<string, number>();

    for (const line of allLicenseLines) {
      const license = await tx.licenseOption.findUniqueOrThrow({
        where: { id: line.licenseOptionId },
        include: {
          artwork: {
            include: {
              creator: true,
            },
          },
        },
      });

      const obligationTotal = license.price * quantity;

      // Create obligation record
      const obligation = await tx.royaltyObligation.create({
        data: {
          orderId: order.id,
          creatorId: license.artwork.creatorId,
          artworkId: license.artwork.id,
          licenseOptionId: license.id,
          unitRoyalty: license.price,
          quantity,
          totalAmount: obligationTotal,
          status: 'ELIGIBLE', // Paid orders yield immediately eligible royalties
        },
      });

      createdObligations.push({
        id: obligation.id,
        artworkId: obligation.artworkId,
        creatorId: obligation.creatorId,
        unitRoyalty: obligation.unitRoyalty,
        totalAmount: obligation.totalAmount,
        status: obligation.status,
      });

      // Diagnostic hook for testing transaction rollback
      if (input._simulateFailureAtStep === 'ledger') {
        throw new Error('Simulated failure during RoyaltyLedgerEntry creation');
      }

      // Query or update running balance for this creator
      const creatorId = license.artwork.creatorId;
      let currentBalance = creatorRunningBalances.get(creatorId);

      if (currentBalance === undefined) {
        const latestLedgerEntry = await tx.royaltyLedgerEntry.findFirst({
          where: { creatorId },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        });
        currentBalance = latestLedgerEntry ? latestLedgerEntry.balanceAfter : 0;
      }

      const newBalance = currentBalance + obligationTotal;
      creatorRunningBalances.set(creatorId, newBalance);

      // Create immutable audit ledger entry
      await tx.royaltyLedgerEntry.create({
        data: {
          creatorId,
          obligationId: obligation.id,
          entryType: 'EARNING',
          amount: obligationTotal,
          balanceAfter: newBalance,
          reference: order.orderNumber,
          notes: `Order ${order.orderNumber}: License for ${license.artwork.title}`,
        },
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      designId: design.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      costs: {
        garmentCost: order.garmentCost,
        printingCost: order.printingCost,
        licensingCost: order.licensingCost,
        packagingCost: order.packagingCost,
        shippingCost: order.shippingCost,
      },
      obligationsCount: createdObligations.length,
      ledgerEntriesCount: createdObligations.length,
      obligations: createdObligations,
      order,
    };
  });
}
```

---

### 4.3. Complete Specification for `src/app/api/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic } from '@/lib/orders';
import { CreateOrderInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

const designElementSchema = z.object({
  id: z.string(),
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
  title: z.string(),
  previewUrl: z.string(),
  creatorName: z.string(),
  creatorId: z.string(),
  surface: z.enum(['FRONT', 'BACK', 'SIDE']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  zIndex: z.number(),
  price: z.number(),
});

const artworkLicenseLineSchema = z.object({
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
});

const createOrderSchema = z.object({
  garmentProductId: z
    .string({ required_error: 'garmentProductId is required' })
    .min(1, 'garmentProductId cannot be empty'),
  garmentVariantId: z.string().optional(),
  garmentColorHex: z.string().optional().default('#131718'),
  garmentSize: z.string().optional().default('L'),
  garmentFit: z.string().optional().default('oversized'),
  designTitle: z.string().optional().default('Custom Tee'),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .optional()
    .default(1),
  frontElements: z.array(designElementSchema).optional().default([]),
  backElements: z.array(designElementSchema).optional().default([]),
  sideElements: z.array(designElementSchema).optional().default([]),
  frontArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  backArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  sideArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  previewFrontUrl: z.string().optional(),
  previewBackUrl: z.string().optional(),
  customerId: z.string().optional(),
  shippingName: z
    .string({ required_error: 'shippingName is required' })
    .min(1, 'shippingName cannot be empty'),
  shippingAddress: z
    .string({ required_error: 'shippingAddress is required' })
    .min(1, 'shippingAddress cannot be empty'),
  shippingCity: z
    .string({ required_error: 'shippingCity is required' })
    .min(1, 'shippingCity cannot be empty'),
  shippingPostal: z
    .string({ required_error: 'shippingPostal is required' })
    .min(1, 'shippingPostal cannot be empty'),
  shippingPhone: z.string().optional(),
  clientClaimedTotal: z.number().optional(),
  paymentMode: z.string().optional().default('DEV_MOCK'),
  paymentStatus: z.string().optional().default('PAID'),
});

/**
 * POST /api/orders
 * Atomic Order Placement endpoint with server pricing and anti-tamper check.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body must be a valid JSON object.',
      },
      { status: 400 }
    );
  }

  const parseResult = createOrderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid order placement payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const input: CreateOrderInput = parseResult.data;

  try {
    const result = await createOrderAtomic(input);
    return NextResponse.json(
      {
        success: true,
        order: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown order creation error';

    // Anti-tamper violation
    if (message.includes('Price tampering detected')) {
      return NextResponse.json(
        {
          error: 'Price Tampering Detected',
          message,
        },
        { status: 400 }
      );
    }

    // Missing garment product
    if (message.includes('Garment product not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Invalid license option or variant
    if (
      message.includes('License option not found') ||
      message.includes('does not belong to artwork') ||
      message.includes('Garment variant not found') ||
      message.includes('Missing licenseOptionId')
    ) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/orders] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process order transaction.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Query orders with optional filtering by customerId or supplierId.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId') ?? undefined;
  const supplierId = searchParams.get('supplierId') ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10))
  );
  const skip = (page - 1) * limit;

  try {
    const whereClause: { customerId?: string; supplierId?: string } = {};
    if (customerId) whereClause.customerId = customerId;
    if (supplierId) whereClause.supplierId = supplierId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          design: true,
          obligations: {
            include: {
              artwork: true,
              licenseOption: true,
            },
          },
        },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/orders] Error fetching orders:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve orders.',
      },
      { status: 500 }
    );
  }
}
```

---

### 4.4. Complete Specification for `src/lib/__tests__/orders_royalties.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic } from '@/lib/orders';
import { POST, GET } from '@/app/api/orders/route';
import { CreateOrderInput } from '@/lib/types';

describe('Integration Test Suite: Atomic Orders, Obligations & Auditable Ledger (M2)', () => {
  let garmentApex: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;

  // Track created IDs for strict teardown cleanup
  const createdOrderIds: string[] = [];
  const createdDesignIds: string[] = [];

  beforeAll(async () => {
    garmentApex = await prisma.garmentProduct.findUnique({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: true,
      },
    });

    if (!garmentApex) {
      throw new Error('Seed data missing: Garment APX-HVY-001 not found.');
    }

    const art1 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Dash Ape Classic' } },
      include: { licenseOptions: true },
    });
    const art2 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Cyber Primate' } },
      include: { licenseOptions: true },
    });
    const art3 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Static Glitch' } },
      include: { licenseOptions: true },
    });

    if (!art1 || !art2 || !art3) {
      throw new Error('Seed data missing: Benchmark artworks not found.');
    }

    artDashApe = art1;
    artCyberPrimate = art2;
    artStaticGlitch = art3;

    licDashApe40 = art1.licenseOptions.find((l) => l.price === 40);
    licCyberPrimate60 = art2.licenseOptions.find((l) => l.price === 60);
    licStaticGlitch25 = art3.licenseOptions.find((l) => l.price === 25);

    if (!licDashApe40 || !licCyberPrimate60 || !licStaticGlitch25) {
      throw new Error('Seed data missing: Licenses 40, 60, 25 not found.');
    }
  });

  afterAll(async () => {
    // Clean up all created test orders and cascade entities
    if (createdOrderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { id: { in: createdOrderIds } },
        select: { orderNumber: true },
      });
      const orderNumbers = orders.map((o) => o.orderNumber);

      // 1. Delete associated ledger entries
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: orderNumbers } },
      });

      // 2. Delete obligations (order cascade deletes obligations, but explicit is safest)
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });

      // 3. Delete orders
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    // 4. Delete designs
    if (createdDesignIds.length > 0) {
      await prisma.designDocument.deleteMany({
        where: { id: { in: createdDesignIds } },
      });
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. CANONICAL BENCHMARK ATOMIC ORDER PLACEMENT (EXACT THB 410)
  // =========================================================================
  describe('Suite 1: Canonical Benchmark Order Placement (Exact THB 410)', () => {
    it('atomically creates Order, DesignDocument, 3 Obligations, and 3 Ledger entries matching THB 410 benchmark', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
        shippingName: 'Test Collector',
        shippingAddress: '123 Sukhumvit Road',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        shippingPhone: '+66 81 234 5678',
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);

      // Cost verification: Garment (150) + DTG (80) + Pack (15) + Ship (40) + Lic (125) = 410 THB
      expect(result.totalAmount).toBe(410);
      expect(result.costs.garmentCost).toBe(150);
      expect(result.costs.printingCost).toBe(80);
      expect(result.costs.licensingCost).toBe(125);
      expect(result.costs.packagingCost).toBe(15);
      expect(result.costs.shippingCost).toBe(40);

      // Verify DesignDocument persisted in DB
      const dbDesign = await prisma.designDocument.findUnique({
        where: { id: result.designId },
      });
      expect(dbDesign).not.toBeNull();
      expect(dbDesign?.status).toBe('ORDERED');

      // Verify Order persisted in DB
      const dbOrder = await prisma.order.findUnique({
        where: { id: result.orderId },
        include: { obligations: true },
      });
      expect(dbOrder).not.toBeNull();
      expect(dbOrder?.orderNumber).toBe(result.orderNumber);
      expect(dbOrder?.status).toBe('PAYMENT_CONFIRMED');
      expect(dbOrder?.totalAmount).toBe(410);
      expect(dbOrder?.obligations).toHaveLength(3);

      // Verify Obligations details
      expect(result.obligations).toHaveLength(3);
      const ob1 = result.obligations.find((o) => o.artworkId === artDashApe.id);
      const ob2 = result.obligations.find((o) => o.artworkId === artCyberPrimate.id);
      const ob3 = result.obligations.find((o) => o.artworkId === artStaticGlitch.id);

      expect(ob1?.unitRoyalty).toBe(40);
      expect(ob1?.totalAmount).toBe(40);
      expect(ob1?.status).toBe('ELIGIBLE');

      expect(ob2?.unitRoyalty).toBe(60);
      expect(ob2?.totalAmount).toBe(60);
      expect(ob2?.status).toBe('ELIGIBLE');

      expect(ob3?.unitRoyalty).toBe(25);
      expect(ob3?.totalAmount).toBe(25);
      expect(ob3?.status).toBe('ELIGIBLE');

      // Verify Ledger entries written for each obligation
      const ledgerEntries = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: result.orderNumber },
        orderBy: { createdAt: 'asc' },
      });
      expect(ledgerEntries).toHaveLength(3);
      expect(ledgerEntries.map((e) => e.amount)).toEqual(
        expect.arrayContaining([40, 60, 25])
      );
    });
  });

  // =========================================================================
  // 2. CUMULATIVE RUNNING LEDGER BALANCE TRACKING ACROSS MULTIPLE ORDERS
  // =========================================================================
  describe('Suite 2: Cumulative Running Ledger Balance Tracking', () => {
    it('accurately maintains sequential balanceAfter across multiple consecutive orders', async () => {
      const creator1Id = artDashApe.creatorId;

      // Query baseline balance for Creator 1
      const baselineEntry = await prisma.royaltyLedgerEntry.findFirst({
        where: { creatorId: creator1Id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const baselineBalance = baselineEntry ? baselineEntry.balanceAfter : 0;

      // Order 1: 1 unit of Dash Ape (40 THB)
      const order1 = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Sequential Test 1',
        shippingAddress: 'Address 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order1.orderId);
      createdDesignIds.push(order1.designId);

      // Verify balance increased by 40
      const entryAfterOrder1 = await prisma.royaltyLedgerEntry.findFirst({
        where: { reference: order1.orderNumber },
      });
      expect(entryAfterOrder1?.balanceAfter).toBe(baselineBalance + 40);

      // Order 2: 1 unit of Dash Ape (40 THB) + 1 unit of Cyber Primate (60 THB)
      const order2 = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        shippingName: 'Sequential Test 2',
        shippingAddress: 'Address 2',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order2.orderId);
      createdDesignIds.push(order2.designId);

      // Verify entries for Order 2 strictly stepped through +40 then +60
      const entriesForOrder2 = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: order2.orderNumber },
        orderBy: { createdAt: 'asc' },
      });
      expect(entriesForOrder2).toHaveLength(2);

      const balances = entriesForOrder2.map((e) => e.balanceAfter);
      expect(balances).toEqual([
        baselineBalance + 40 + 40,        // baseline + 80
        baselineBalance + 40 + 40 + 60,   // baseline + 140
      ]);
    });
  });

  // =========================================================================
  // 3. SERVER ANTI-TAMPERING DEFENSES
  // =========================================================================
  describe('Suite 3: Server Anti-Tampering Defenses', () => {
    it('rejects order when client claimed total is lower than server calculated total', async () => {
      const ordersCountBefore = await prisma.order.count();
      const designsCountBefore = await prisma.designDocument.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Attacker Attempt',
        shippingAddress: 'Dark Alley 404',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 200, // True total is 150 + 80 + 15 + 40 + 40 = 325
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );

      // Verify zero records written
      expect(await prisma.order.count()).toBe(ordersCountBefore);
      expect(await prisma.designDocument.count()).toBe(designsCountBefore);
    });

    it('rejects order when client claimed total is higher or mismatched', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Attacker Mismatch',
        shippingAddress: 'Dark Alley 404',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 999,
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );
    });

    it('accepts order when client claimed total matches server authoritative total', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Honest Buyer',
        shippingAddress: 'Valid St 12',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 325, // 150 + 80 + 15 + 40 + 40 = 325
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);

      expect(result.totalAmount).toBe(325);
    });
  });

  // =========================================================================
  // 4. TRANSACTION ATOMICITY & ROLLBACK MECHANICS
  // =========================================================================
  describe('Suite 4: Transaction Atomicity & Rollback Mechanics', () => {
    it('rolls back completely if a failure occurs at the order creation step', async () => {
      const ordersBefore = await prisma.order.count();
      const designsBefore = await prisma.designDocument.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Rollback Order Test',
        shippingAddress: 'Test Lane',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'order',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure before order creation/i
      );

      // Verify complete rollback: no orphan design, no order
      expect(await prisma.order.count()).toBe(ordersBefore);
      expect(await prisma.designDocument.count()).toBe(designsBefore);
    });

    it('rolls back completely if a failure occurs during royalty ledger creation', async () => {
      const ordersBefore = await prisma.order.count();
      const designsBefore = await prisma.designDocument.count();
      const obligationsBefore = await prisma.royaltyObligation.count();
      const ledgersBefore = await prisma.royaltyLedgerEntry.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Rollback Ledger Test',
        shippingAddress: 'Test Lane',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'ledger',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure during royaltyledgerentry creation/i
      );

      // Verify all entities rolled back
      expect(await prisma.order.count()).toBe(ordersBefore);
      expect(await prisma.designDocument.count()).toBe(designsBefore);
      expect(await prisma.royaltyObligation.count()).toBe(obligationsBefore);
      expect(await prisma.royaltyLedgerEntry.count()).toBe(ledgersBefore);
    });
  });

  // =========================================================================
  // 5. QUANTITY SCALING & BLANK SHIRT ORDERS
  // =========================================================================
  describe('Suite 5: Quantity Scaling & Blank Orders', () => {
    it('scales linearly for quantity = 3 to exactly THB 1150 with accurate multiplied royalties', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 3,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
        shippingName: 'Triple Quantity Buyer',
        shippingAddress: 'Triple Road 3',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);

      // Math: 150*3 (450) + 80*3 (240) + 15*3 (45) + flat ship (40) + 125*3 (375) = 1150 THB
      expect(result.totalAmount).toBe(1150);
      expect(result.obligations).toHaveLength(3);
      expect(result.obligations[0].totalAmount).toBe(120); // 40 * 3
      expect(result.obligations[1].totalAmount).toBe(180); // 60 * 3
      expect(result.obligations[2].totalAmount).toBe(75);  // 25 * 3
    });

    it('places blank garment order (0 licenses) with 0 obligations and 0 ledger entries', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        shippingName: 'Blank Buyer',
        shippingAddress: 'Plain St 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);

      // Blank: 150 (garment) + 80 (print) + 15 (pack) + 40 (ship) + 0 (lic) = 285 THB
      expect(result.totalAmount).toBe(285);
      expect(result.obligationsCount).toBe(0);
      expect(result.ledgerEntriesCount).toBe(0);
      expect(result.obligations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. API ROUTE INTEGRATION TESTS (POST & GET /api/orders)
  // =========================================================================
  describe('Suite 6: API Route Integration Tests (POST & GET /api/orders)', () => {
    it('POST /api/orders successfully creates order and returns HTTP 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          ],
          shippingName: 'API Customer',
          shippingAddress: 'API Gateway St 5',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderId).toBeDefined();

      createdOrderIds.push(json.order.orderId);
      createdDesignIds.push(json.order.designId);
    });

    it('POST /api/orders rejects price tampering with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 10, // Tampered
          shippingName: 'Tamperer',
          shippingAddress: 'Dark Web St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Price Tampering Detected');
    });

    it('POST /api/orders returns HTTP 400 on missing required shipping fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          // Missing shipping fields
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Validation Error');
    });

    it('GET /api/orders returns HTTP 200 with order list and pagination', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders?limit=5&page=1', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.orders)).toBe(true);
      expect(json.pagination).toBeDefined();
    });
  });
});
```

---

## 5. Verification Method

To verify these specifications independently:

1. **Prerequisites Check**:
   - Verify SQLite database is properly seeded:
     ```powershell
     npm run db:push
     npm run db:seed
     ```
2. **Implementation Verification**:
   - Implement `src/lib/orders.ts` as specified in Section 4.2.
   - Implement `src/app/api/orders/route.ts` as specified in Section 4.3.
   - Implement `src/lib/__tests__/orders_royalties.test.ts` as specified in Section 4.4.
3. **Execution Commands**:
   - Run Vitest integration test suite:
     ```powershell
     npx vitest run src/lib/__tests__/orders_royalties.test.ts
     ```
   - Run complete test suite:
     ```powershell
     npm test
     ```
   - Verify zero TypeScript compiler errors:
     ```powershell
     npx tsc --noEmit
     ```
4. **Invalidation Conditions**:
   - The test fails if `calculateLivePricing` or `createOrderAtomic` does not yield exactly 410 THB for 1 unit of APX-HVY-001 with 3 licenses.
   - The test fails if any transaction error leaves orphaned `DesignDocument` or `Order` records in the database.
   - The test fails if client-claimed totals differing from server totals do not throw an error or return HTTP 400.
   - The test fails if cumulative `balanceAfter` drifts or fails to increment strictly across multiple orders.
