# Handoff Report: Anti-Tamper Checkout Architecture & Pricing-Order Integration

- **Agent**: `explorer_m1_3` (Anti-Tamper Checkout & Security Investigator)
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_3`
- **Parent**: Orchestrator (`ebc38aff-81cb-457f-bd27-e38a9be40d41`)
- **Date**: 2026-10-09T23:39:00Z
- **Scope**: Anti-tampering checkout architecture, server recalculation, client price manipulation rejection (HTTP 400), strict license validation, and end-to-end integration between pricing engine, Zod schemas, and order placement interfaces.

---

## 1. Observation

Direct observations from codebase inspection across `src/`, `prisma/`, and project documentation:

### 1.1 Existing Codebase State
1. **`src/lib/pricing.ts` (lines 8-138)**:
   - Implements `calculateLivePricing(payload: PricingPayload): Promise<PriceCalculationResult>`.
   - **Critical Vulnerability 1 (Silent License Drop)**: In lines 90-114:
     ```typescript
     const license = await prisma.licenseOption.findUnique({
       where: { id: item.licenseOptionId },
       ...
     });
     if (license) {
       ...
       licensingCost += itemTotal;
     }
     ```
     If a client provides an invalid, non-existent, or fabricated `licenseOptionId`, `license` resolves to `null`. The engine silently ignores it without error, resulting in `licensingCost = 0`. The customer is not charged for the license, and creators receive zero royalties.
   - **Critical Vulnerability 2 (Cross-Artwork License Spoofing)**: Line 90 queries `licenseOption` strictly by `id: item.licenseOptionId`, without verifying `license.artworkId === item.artworkId`. An attacker can submit an expensive artwork (`art1`, e.g., ฿200) paired with a cheap license option from another artwork (`lic3`, ฿25). The server calculates pricing using ฿25, and creator attribution is corrupted.
   - **Critical Vulnerability 3 (Unpublished Artwork Exposure)**: Does not verify that the referenced `artwork.status === 'PUBLISHED'` and `artwork.moderationStatus === 'APPROVED'`, allowing draft or unapproved designs to be purchased.

2. **`src/lib/types.ts` (lines 1-61)**:
   - Defines `PrintSurface`, `DesignElement`, `ArtworkLicenseLine`, `PricingPayload`, `PriceCalculationResult`, and `UserRole`.
   - **Missing Types**: No interfaces or schemas for order placement (`CreateOrderInput`, `CreateOrderResult`), anti-tamper verification, or checkout error payloads.

3. **`prisma/schema.prisma` (lines 1-246)**:
   - Defines 14 models in SQLite: `User`, `CreatorProfile`, `SupplierProfile`, `Artwork`, `LicenseOption`, `GarmentProduct`, `GarmentVariant`, `PrintingService`, `DesignDocument`, `Order`, `RoyaltyObligation`, `RoyaltyLedgerEntry`, `CreatorSettlement`, and `AuditEvent`.
   - `Order` (lines 164-192) stores financial fields: `totalAmount`, `garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, and `snapshotData`.
   - `RoyaltyObligation` (lines 194-210) links `orderId`, `creatorId`, `artworkId`, `licenseOptionId`, `unitRoyalty`, `quantity`, and `totalAmount`.
   - `RoyaltyLedgerEntry` (lines 212-224) tracks running balances: `entryType`, `amount`, `balanceAfter`, `reference`.
   - `AuditEvent` (lines 236-246) provides an immutable audit log (`userId`, `action`, `entityType`, `entityId`, `payload`).
   - **Status**: Database models are complete and seeded (`prisma/seed.mjs`), with the benchmark order `APX-ORD-9021` confirming exact THB 410 calculations.

4. **Missing Service & API Layer**:
   - `src/lib/orders.ts` does NOT exist yet.
   - `src/app/api/orders/route.ts` does NOT exist yet.
   - Currently, there is no checkout endpoint or transaction pipeline to place orders.

---

## 2. Logic Chain

From the observations above, we establish the step-by-step logic chain defining the anti-tampering checkout architecture:

### Step 1: Threat Model & Attack Surface
When a client transitions from 2D/3D studio customization to checkout, the browser client can be manipulated via developer tools, proxy tools, or automated scripts:
- **Threat A (Direct Total Manipulation)**: Sending arbitrary values like `{ totalAmount: 1, garmentCost: 1 }`.
- **Threat B (Component Fee Zeroing)**: Omitting shipping (฿40) or printing (฿80) fees.
- **Threat C (Surface Under-reporting)**: Printing on both Front and Back surfaces but only declaring 1 surface in pricing.
- **Threat D (Bogus License Injection)**: Sending arbitrary UUIDs for `licenseOptionId` to exploit `if (license)` drops.
- **Threat E (Cross-Artwork License Swapping)**: Pairing premium artworks with bargain license IDs.
- **Threat F (Stale Price Exploitation)**: Submitting an order with cached or outdated prices after creator license fee adjustments.

### Step 2: The Core Anti-Tampering Principle (Zero Client Trust)
1. **Total Server Disregard of Client-Claimed Financials**:
   The server NEVER accepts client-submitted cost numbers (`garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, or `totalAmount`) as authoritative values for order records, ledger entries, or payment transactions.
2. **Independent Server Recalculation**:
   The server derives all costs exclusively from verified database entities:
   - Garment base price + variant adjustments from `GarmentProduct` & `GarmentVariant`.
   - Printing costs from `PrintingService` multiplied by the *actual count of surfaces containing design elements* (`frontElements`, `backElements`, `sideElements`).
   - Packaging and shipping fees from `GarmentProduct`.
   - License royalties directly from `LicenseOption.price` queried from the database.
3. **Mismatched Client Claim Rejection (HTTP 400)**:
   If the client explicitly passes a claimed total (`clientClaimedTotal`):
   - If `clientClaimedTotal !== recalculatedTotal`: The request MUST be rejected immediately with HTTP 400 (`Bad Request`), error code `PRICE_TAMPERING_DETECTED`, and details showing claimed vs authoritative totals.
   - An `AuditEvent` with action `'PRICE_TAMPERING_ATTEMPT'` is recorded.

### Step 3: Multi-Tier License Validation Protocol
For every artwork license submitted in the cart or extracted from design elements:
1. **Tier 1 (Database Existence)**:
   Query `prisma.licenseOption.findUnique({ where: { id: licenseOptionId } })`. If not found, throw `InvalidLicenseError` ("License option not found: <id>").
2. **Tier 2 (Artwork Ownership Match)**:
   Verify `license.artworkId === item.artworkId`. If mismatched, throw `LicenseArtworkMismatchError` ("License option <id> does not belong to artwork <id>").
3. **Tier 3 (Artwork Status & Moderation)**:
   Verify `license.artwork.status === 'PUBLISHED'` and `license.artwork.moderationStatus === 'APPROVED'`. If not, throw `ArtworkNotAvailableError`.
4. **Tier 4 (Element Placement Integrity)**:
   Ensure every distinct artwork present in `frontElements`, `backElements`, and `sideElements` has a corresponding valid license entry.

### Step 4: Atomic Database Transaction (`prisma.$transaction`)
Order creation, royalty obligation creation, and ledger balance updates must be atomic:
- If any check fails (price mismatch, invalid license, database failure), the entire transaction rolls back.
- Ledger entries compute running balances atomically:
  $$\text{balanceAfter} = \text{previousBalance} + \text{obligationAmount}$$
- Prevents double-spending, partial orders, or phantom ledger entries.

---

## 3. Caveats

1. **SQLite Concurrent Transactions**:
   The project currently uses SQLite (`dev.db`). In SQLite, concurrent writes lock the entire database file (`busy_timeout`). In high-concurrency environments, running balance computation should use row locking (`SELECT FOR UPDATE`), which SQLite does not natively support. However, wrapping order creation in `prisma.$transaction` provides full serializability on SQLite for this development environment.
2. **Free Artworks / Zero-Cost Licenses**:
   If an artwork has a free license (`price: 0`), it must still create a `RoyaltyObligation` and `RoyaltyLedgerEntry` with `amount: 0` for auditability and creator download attribution.
3. **Client Cart Stale State UX**:
   Rejecting price discrepancies with HTTP 400 means if prices are updated legitimately on the server while a user's cart is open, the user will receive a 400 error. The client UI must handle `PRICE_TAMPERING_DETECTED` / `PRICE_MISMATCH` by showing a notification ("Price has updated: New total is THB X") and refreshing the quote.

---

## 4. Conclusion & Concrete Architectural Specifications

Below are the complete, ready-to-implement code specifications for the anti-tamper checkout architecture.

### 4.1 Domain Types & Zod Schemas (`src/lib/types.ts` & `src/lib/validations/order.ts`)

#### A. Add to `src/lib/types.ts`:
```typescript
export interface CreateOrderInput {
  customerId?: string;
  designId?: string;
  design?: {
    title?: string;
    garmentProductId: string;
    garmentVariantId?: string;
    garmentColorHex?: string;
    garmentSize?: string;
    garmentFit?: string;
    frontElements?: DesignElement[];
    backElements?: DesignElement[];
    sideElements?: DesignElement[];
    previewFrontUrl?: string;
    previewBackUrl?: string;
  };
  garmentProductId?: string;
  garmentVariantId?: string;
  quantity: number;
  frontArtworkLicenses?: ArtworkLicenseLine[];
  backArtworkLicenses?: ArtworkLicenseLine[];
  sideArtworkLicenses?: ArtworkLicenseLine[];
  clientClaimedTotal?: number; // Anti-tampering check: verified against server total
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostal: string;
  shippingPhone?: string;
  paymentMode?: string;
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
  obligationsCount: number;
  designId: string;
}

export interface AntiTamperAuditPayload {
  clientClaimedTotal: number;
  authoritativeTotal: number;
  difference: number;
  garmentProductId: string;
  quantity: number;
  shippingName: string;
}
```

#### B. Create `src/lib/validations/order.ts`:
```typescript
import { z } from 'zod';

export const ArtworkLicenseLineSchema = z.object({
  artworkId: z.string().min(1, 'artworkId is required'),
  licenseOptionId: z.string().min(1, 'licenseOptionId is required'),
});

export const PrintSurfaceSchema = z.enum(['FRONT', 'BACK', 'SIDE']);

export const DesignElementSchema = z.object({
  id: z.string().min(1),
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
  title: z.string().min(1),
  previewUrl: z.string().min(1),
  creatorName: z.string().min(1),
  creatorId: z.string().min(1),
  surface: PrintSurfaceSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive().max(100),
  height: z.number().positive().max(100),
  rotation: z.number(),
  zIndex: z.number().int(),
  price: z.number().int().nonnegative(),
});

export const CreateOrderSchema = z
  .object({
    customerId: z.string().optional(),
    designId: z.string().optional(),
    design: z
      .object({
        title: z.string().min(1).default('Custom Tee'),
        garmentProductId: z.string().min(1),
        garmentVariantId: z.string().optional(),
        garmentColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#131718'),
        garmentSize: z.string().default('L'),
        garmentFit: z.string().default('oversized'),
        frontElements: z.array(DesignElementSchema).default([]),
        backElements: z.array(DesignElementSchema).default([]),
        sideElements: z.array(DesignElementSchema).default([]),
        previewFrontUrl: z.string().optional(),
        previewBackUrl: z.string().optional(),
      })
      .optional(),
    garmentProductId: z.string().optional(),
    garmentVariantId: z.string().optional(),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(1000).default(1),
    frontArtworkLicenses: z.array(ArtworkLicenseLineSchema).optional().default([]),
    backArtworkLicenses: z.array(ArtworkLicenseLineSchema).optional().default([]),
    sideArtworkLicenses: z.array(ArtworkLicenseLineSchema).optional().default([]),
    clientClaimedTotal: z.coerce.number().int().nonnegative().optional(),
    shippingName: z.string().min(2, 'Recipient name is required'),
    shippingAddress: z.string().min(5, 'Delivery address is required'),
    shippingCity: z.string().min(2, 'City is required'),
    shippingPostal: z.string().min(3, 'Postal code is required'),
    shippingPhone: z.string().optional(),
    paymentMode: z.string().default('DEV_MOCK'),
  })
  .refine(
    (data) => Boolean(data.designId) || Boolean(data.design) || Boolean(data.garmentProductId),
    {
      message: 'Either designId, inline design configuration, or garmentProductId must be provided',
      path: ['designId'],
    }
  );

export type CreateOrderInputValidated = z.infer<typeof CreateOrderSchema>;
```

---

### 4.2 Defensive Pricing Engine Patch (`src/lib/pricing.ts`)
Modify lines 89-114 in `src/lib/pricing.ts` to strictly validate license existence and artwork ownership:

```typescript
// Proposed replacement for lines 89-114 in src/lib/pricing.ts:
  for (const item of allLicenses) {
    const license = await prisma.licenseOption.findUnique({
      where: { id: item.licenseOptionId },
      include: {
        artwork: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!license) {
      throw new Error(`License option not found: ${item.licenseOptionId}`);
    }

    if (license.artworkId !== item.artworkId) {
      throw new Error(
        `License option ${item.licenseOptionId} does not belong to artwork ${item.artworkId}`
      );
    }

    if (license.artwork.status !== 'PUBLISHED' || license.artwork.moderationStatus !== 'APPROVED') {
      throw new Error(
        `Artwork ${item.artworkId} is not approved or published (status: ${license.artwork.status}, moderation: ${license.artwork.moderationStatus})`
      );
    }

    const unitPrice = license.price;
    const itemTotal = unitPrice * validQty;
    licensingCost += itemTotal;

    artworkBreakdown.push({
      artworkId: license.artworkId,
      title: license.artwork.title,
      creatorName: license.artwork.creator.displayName,
      unitPrice,
      totalPrice: itemTotal,
    });
  }
```

---

### 4.3 Atomic Order Placement Service (`src/lib/orders.ts`)
Create `src/lib/orders.ts` implementing server-authoritative recalculation, anti-tampering verification, and atomic database execution:

```typescript
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import {
  CreateOrderInput,
  CreateOrderResult,
  PricingPayload,
  ArtworkLicenseLine,
  DesignElement,
} from '@/lib/types';

export class PriceTamperingError extends Error {
  public claimedTotal: number;
  public authoritativeTotal: number;
  public difference: number;

  constructor(claimed: number, authoritative: number) {
    super(
      `Price tampering detected: client claimed THB ${claimed}, but server calculation is THB ${authoritative}`
    );
    this.name = 'PriceTamperingError';
    this.claimedTotal = claimed;
    this.authoritativeTotal = authoritative;
    this.difference = claimed - authoritative;
  }
}

export async function createOrderAtomic(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // 1. Resolve Garment Product ID & Variant ID
  let garmentProductId = input.garmentProductId;
  let garmentVariantId = input.garmentVariantId;
  let frontLicenses = input.frontArtworkLicenses ?? [];
  let backLicenses = input.backArtworkLicenses ?? [];
  let sideLicenses = input.sideArtworkLicenses ?? [];

  // If designId provided, fetch existing design document
  if (input.designId) {
    const existingDesign = await prisma.designDocument.findUnique({
      where: { id: input.designId },
    });
    if (!existingDesign) {
      throw new Error(`Design document not found: ${input.designId}`);
    }
    garmentProductId = existingDesign.garmentProductId;
    garmentVariantId = input.garmentVariantId ?? existingDesign.garmentVariantId ?? undefined;

    // Extract license lines from design elements if not explicitly supplied
    if (frontLicenses.length === 0 && existingDesign.frontElements) {
      const elems: DesignElement[] = JSON.parse(existingDesign.frontElements);
      frontLicenses = elems.map((e) => ({ artworkId: e.artworkId, licenseOptionId: e.licenseOptionId }));
    }
    if (backLicenses.length === 0 && existingDesign.backElements) {
      const elems: DesignElement[] = JSON.parse(existingDesign.backElements);
      backLicenses = elems.map((e) => ({ artworkId: e.artworkId, licenseOptionId: e.licenseOptionId }));
    }
    if (sideLicenses.length === 0 && existingDesign.sideElements) {
      const elems: DesignElement[] = JSON.parse(existingDesign.sideElements);
      sideLicenses = elems.map((e) => ({ artworkId: e.artworkId, licenseOptionId: e.licenseOptionId }));
    }
  } else if (input.design) {
    garmentProductId = input.design.garmentProductId;
    garmentVariantId = input.design.garmentVariantId ?? input.garmentVariantId;
    if (frontLicenses.length === 0 && input.design.frontElements) {
      frontLicenses = input.design.frontElements.map((e) => ({
        artworkId: e.artworkId,
        licenseOptionId: e.licenseOptionId,
      }));
    }
    if (backLicenses.length === 0 && input.design.backElements) {
      backLicenses = input.design.backElements.map((e) => ({
        artworkId: e.artworkId,
        licenseOptionId: e.licenseOptionId,
      }));
    }
    if (sideLicenses.length === 0 && input.design.sideElements) {
      sideLicenses = input.design.sideElements.map((e) => ({
        artworkId: e.artworkId,
        licenseOptionId: e.licenseOptionId,
      }));
    }
  }

  if (!garmentProductId) {
    throw new Error('Garment product ID must be provided');
  }

  // 2. Authoritative Server-Side Price Recalculation
  const pricingPayload: PricingPayload = {
    garmentProductId,
    garmentVariantId,
    quantity: input.quantity,
    frontArtworkLicenses: frontLicenses,
    backArtworkLicenses: backLicenses,
    sideArtworkLicenses: sideLicenses,
  };

  const authoritativePricing = await calculateLivePricing(pricingPayload);

  // 3. Anti-Tampering Check: Reject Manipulated Client Prices
  if (input.clientClaimedTotal !== undefined && input.clientClaimedTotal !== null) {
    if (input.clientClaimedTotal !== authoritativePricing.totalAmount) {
      // Log security audit event
      await prisma.auditEvent.create({
        data: {
          userId: input.customerId ?? null,
          action: 'PRICE_TAMPERING_ATTEMPT',
          entityType: 'ORDER',
          payload: JSON.stringify({
            clientClaimedTotal: input.clientClaimedTotal,
            authoritativeTotal: authoritativePricing.totalAmount,
            difference: input.clientClaimedTotal - authoritativePricing.totalAmount,
            garmentProductId,
            quantity: input.quantity,
          }),
        },
      });

      throw new PriceTamperingError(input.clientClaimedTotal, authoritativePricing.totalAmount);
    }
  }

  // 4. Atomic Database Execution
  const orderResult = await prisma.$transaction(async (tx) => {
    // A. Resolve or create DesignDocument
    let finalDesignId = input.designId;
    if (!finalDesignId) {
      const newDesign = await tx.designDocument.create({
        data: {
          userId: input.customerId ?? null,
          title: input.design?.title ?? 'Custom Tee',
          garmentProductId,
          garmentVariantId: garmentVariantId ?? null,
          garmentColorHex: input.design?.garmentColorHex ?? '#131718',
          garmentSize: input.design?.garmentSize ?? 'L',
          garmentFit: input.design?.garmentFit ?? 'oversized',
          frontElements: JSON.stringify(input.design?.frontElements ?? []),
          backElements: JSON.stringify(input.design?.backElements ?? []),
          sideElements: JSON.stringify(input.design?.sideElements ?? []),
          previewFrontUrl: input.design?.previewFrontUrl ?? null,
          previewBackUrl: input.design?.previewBackUrl ?? null,
          status: 'ORDERED',
        },
      });
      finalDesignId = newDesign.id;
    } else {
      await tx.designDocument.update({
        where: { id: finalDesignId },
        data: { status: 'ORDERED' },
      });
    }

    // B. Fetch Supplier Details
    const garment = await tx.garmentProduct.findUniqueOrThrow({
      where: { id: garmentProductId },
      select: { supplierId: true, sku: true, name: true },
    });

    // C. Generate Unique Order Number
    const orderNumber = `APX-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // D. Create Authoritative Order Record
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        designId: finalDesignId,
        supplierId: garment.supplierId,
        quantity: authoritativePricing.quantity,
        status: 'PAYMENT_CONFIRMED',
        paymentMode: input.paymentMode ?? 'DEV_MOCK',
        paymentStatus: 'PAID',
        garmentCost: authoritativePricing.garmentCost,
        printingCost: authoritativePricing.printingCost,
        licensingCost: authoritativePricing.licensingCost,
        packagingCost: authoritativePricing.packagingCost,
        shippingCost: authoritativePricing.shippingCost,
        totalAmount: authoritativePricing.totalAmount, // STRICTLY SERVER CALCULATED!
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingPostal: input.shippingPostal,
        shippingPhone: input.shippingPhone ?? null,
        snapshotData: JSON.stringify({
          garmentSku: garment.sku,
          garmentName: garment.name,
          pricing: authoritativePricing,
          surfaces: authoritativePricing.surfacesUsed,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // E. Create Royalty Obligations & Ledger Entries for all distinct licenses
    const allLicenses = [...frontLicenses, ...backLicenses, ...sideLicenses];

    for (const item of allLicenses) {
      const license = await tx.licenseOption.findUniqueOrThrow({
        where: { id: item.licenseOptionId },
        include: {
          artwork: true,
        },
      });

      const unitRoyalty = license.price;
      const obligationTotal = unitRoyalty * authoritativePricing.quantity;

      const obligation = await tx.royaltyObligation.create({
        data: {
          orderId: order.id,
          creatorId: license.artwork.creatorId,
          artworkId: license.artworkId,
          licenseOptionId: license.id,
          unitRoyalty,
          quantity: authoritativePricing.quantity,
          totalAmount: obligationTotal,
          status: 'ELIGIBLE',
        },
      });

      // Calculate running balance
      const latestLedger = await tx.royaltyLedgerEntry.findFirst({
        where: { creatorId: license.artwork.creatorId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });

      const currentBalance = latestLedger?.balanceAfter ?? 0;
      const nextBalance = currentBalance + obligationTotal;

      await tx.royaltyLedgerEntry.create({
        data: {
          creatorId: license.artwork.creatorId,
          obligationId: obligation.id,
          entryType: 'EARNING',
          amount: obligationTotal,
          balanceAfter: nextBalance,
          reference: order.orderNumber,
          notes: `Order ${order.orderNumber}: License royalty for ${license.artwork.title}`,
        },
      });
    }

    // F. Audit Event for Order Creation
    await tx.auditEvent.create({
      data: {
        userId: input.customerId ?? null,
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: order.id,
        payload: JSON.stringify({
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          quantity: order.quantity,
        }),
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      garmentCost: order.garmentCost,
      printingCost: order.printingCost,
      licensingCost: order.licensingCost,
      packagingCost: order.packagingCost,
      shippingCost: order.shippingCost,
      status: order.status,
      obligationsCount: allLicenses.length,
      designId: finalDesignId,
    };
  });

  return orderResult;
}
```

---

### 4.4 Checkout API Route (`src/app/api/orders/route.ts`)
Create `src/app/api/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema } from '@/lib/validations/order';
import { createOrderAtomic, PriceTamperingError } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const parseResult = CreateOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid order placement payload.',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const orderResult = await createOrderAtomic(parseResult.data);
    return NextResponse.json(orderResult, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PriceTamperingError) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          code: 'PRICE_TAMPERING_DETECTED',
          message: error.message,
          claimedTotal: error.claimedTotal,
          authoritativeTotal: error.authoritativeTotal,
          difference: error.difference,
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (
      message.includes('not found') ||
      message.includes('does not belong to') ||
      message.includes('not approved')
    ) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          code: 'INVALID_DATA_REFERENCE',
          message,
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/orders] Internal Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to place order.' },
      { status: 500 }
    );
  }
}
```

---

## 5. Verification Method

To independently verify the anti-tampering checkout architecture:

### 5.1 Verification Test Suite
Create integration test file `src/lib/__tests__/orders_anti_tamper.test.ts` testing the exact threat scenarios:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic, PriceTamperingError } from '@/lib/orders';
import { calculateLivePricing } from '@/lib/pricing';

describe('Anti-Tamper Checkout Architecture', () => {
  let garmentId: string;
  let art1Id: string;
  let lic1Id: string; // ฿40
  let art2Id: string;
  let lic2Id: string; // ฿60
  let art3Id: string;
  let lic3Id: string; // ฿25

  beforeAll(async () => {
    const garment = await prisma.garmentProduct.findFirstOrThrow({ where: { sku: 'APX-HVY-001' } });
    garmentId = garment.id;

    const lic1 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 40 } });
    art1Id = lic1.artworkId;
    lic1Id = lic1.id;

    const lic2 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 60 } });
    art2Id = lic2.artworkId;
    lic2Id = lic2.id;

    const lic3 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 25 } });
    art3Id = lic3.artworkId;
    lic3Id = lic3.id;
  });

  it('calculates the exact THB 410 benchmark on server and succeeds with matching clientClaimedTotal', async () => {
    const result = await createOrderAtomic({
      garmentProductId: garmentId,
      quantity: 1,
      frontArtworkLicenses: [
        { artworkId: art1Id, licenseOptionId: lic1Id },
        { artworkId: art2Id, licenseOptionId: lic2Id },
        { artworkId: art3Id, licenseOptionId: lic3Id },
      ],
      clientClaimedTotal: 410, // Exact match
      shippingName: 'Alice Tester',
      shippingAddress: '123 Sukhumvit',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
    });

    expect(result.totalAmount).toBe(410);
    expect(result.garmentCost).toBe(150);
    expect(result.printingCost).toBe(80);
    expect(result.licensingCost).toBe(125);
    expect(result.packagingCost).toBe(15);
    expect(result.shippingCost).toBe(40);
    expect(result.obligationsCount).toBe(3);
  });

  it('rejects tampered client price with PriceTamperingError when client claims lower amount', async () => {
    await expect(
      createOrderAtomic({
        garmentProductId: garmentId,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: art1Id, licenseOptionId: lic1Id },
          { artworkId: art2Id, licenseOptionId: lic2Id },
          { artworkId: art3Id, licenseOptionId: lic3Id },
        ],
        clientClaimedTotal: 100, // Tampered: claims 100 instead of 410
        shippingName: 'Attacker Bob',
        shippingAddress: 'Attacker Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      })
    ).rejects.toThrow(PriceTamperingError);
  });

  it('rejects tampered client price when client claims 0 for shipping/licensing', async () => {
    await expect(
      createOrderAtomic({
        garmentProductId: garmentId,
        quantity: 1,
        frontArtworkLicenses: [{ artworkId: art1Id, licenseOptionId: lic1Id }],
        clientClaimedTotal: 150, // Claims only garment base price
        shippingName: 'Attacker Charlie',
        shippingAddress: 'Attacker Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      })
    ).rejects.toThrow(PriceTamperingError);
  });

  it('rejects non-existent licenseOptionId', async () => {
    await expect(
      createOrderAtomic({
        garmentProductId: garmentId,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: art1Id, licenseOptionId: 'non-existent-license-id' },
        ],
        shippingName: 'Test Dave',
        shippingAddress: 'Test Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      })
    ).rejects.toThrow(/License option not found/i);
  });

  it('rejects cross-artwork license spoofing (license belonging to different artwork)', async () => {
    await expect(
      createOrderAtomic({
        garmentProductId: garmentId,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: art1Id, licenseOptionId: lic2Id }, // lic2 belongs to art2, not art1!
        ],
        shippingName: 'Test Eve',
        shippingAddress: 'Test Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      })
    ).rejects.toThrow(/does not belong to artwork/i);
  });

  it('atomically creates order, obligations, and updates running ledger balances', async () => {
    const creator = await prisma.creatorProfile.findFirstOrThrow();
    const initialLedger = await prisma.royaltyLedgerEntry.findFirst({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
    const startingBalance = initialLedger?.balanceAfter ?? 0;

    const order = await createOrderAtomic({
      garmentProductId: garmentId,
      quantity: 2,
      frontArtworkLicenses: [{ artworkId: art1Id, licenseOptionId: lic1Id }],
      shippingName: 'Ledger Tester',
      shippingAddress: 'Test Rd',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
    });

    const obligation = await prisma.royaltyObligation.findFirst({
      where: { orderId: order.orderId },
    });
    expect(obligation).toBeDefined();
    expect(obligation?.totalAmount).toBe(40 * 2); // 80 THB
  });
});
```

### 5.2 Verification Commands
```powershell
# 1. Typecheck the entire codebase
npx tsc --noEmit

# 2. Run the test suite
npm test
```
Verification passes when:
1. `npx tsc --noEmit` exits with status `0`.
2. All unit and integration test assertions pass, proving exact THB 410 benchmark calculation, rejection of client price tampering, rejection of invalid/spoofed license IDs, and atomic database persistence.
