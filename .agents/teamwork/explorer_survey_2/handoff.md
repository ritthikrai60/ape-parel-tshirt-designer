# Survey Report: Requirements R1 (2D/3D Design Studio) & R2 (Pricing Engine)

**Agent**: `explorer_survey_2`  
**Date**: 2026-10-09T23:32:00Z  
**Target Scope**: R1 (2D & 3D Interactive Design Studio) and R2 (Authoritative Server-Side Pricing Engine & Checkout)

---

## 1. Observation

### 1.1 Existing Codebase & Directory Structure
- **Root & Configuration Files Observed**:
  - `package.json` (`dependencies`: `three: ^0.164.1`, `lucide-react: ^0.379.0`, `@prisma/client: ^5.14.0`, `zod: ^3.23.8`, `next: ^14.2.3`, `react: ^18.3.1`; `devDependencies`: `@types/three: ^0.164.0`, `vitest: ^1.6.0`, `prisma: ^5.14.0`, `tailwindcss: ^3.4.3`, `typescript: ^5.4.5`).
  - `tsconfig.json` paths alias: `"@/*": ["./src/*"]`.
  - `vitest.config.ts`: Environment set to `'node'`, globals `true`, alias `@` resolved to `./src`.
  - `tailwind.config.ts`: Brand tokens defined for `ink` (`#131718`), `warm` (`#DABA98`), `paper` (`#F5F0E8`), `borderCol` (`#DED7CE`).
  - `prisma/schema.prisma` (246 lines) and `prisma/seed.mjs` (638 lines) fully defined. Pre-seeded SQLite database `prisma/dev.db` contains 7 users, 3 creators, 2 suppliers, 5 artworks, and 2 garments.

- **Files in `src/` Directory**:
  - `src/app/globals.css` (32 lines): Defines CSS variables and studio scrollbar styling.
  - `src/lib/prisma.ts` (14 lines): Global PrismaClient singleton.
  - `src/lib/types.ts` (61 lines): Exports `PrintSurface`, `DesignElement`, `ArtworkLicenseLine`, `PricingPayload`, `PriceCalculationResult`, `UserRole`.
  - `src/lib/pricing.ts` (139 lines): Exports `calculateLivePricing(payload: PricingPayload): Promise<PriceCalculationResult>`.
  - **No other files exist in `src/`**: Zero `.tsx` files in `src/app/` or `src/components/`. No `src/app/studio/`, no `src/components/studio/`, no `src/app/api/`.

- **Static 3D and 2D Assets**:
  - Directory `public/` does not exist.
  - Model file `public/models/tshirt.obj` does not exist on disk.
  - Three.js addons are available in `node_modules/three/examples/jsm/loaders/OBJLoader.js` and `node_modules/three/examples/jsm/controls/OrbitControls.js`.

### 1.2 Verification Commands & Tool Outputs
1. **TypeScript Type Check**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code 0, 0 errors.
2. **Vitest Test Suite**:
   - Command: `npm test` (`vitest run`)
   - Result: Exit code 1.
   - Verbatim Output:
     ```
     No test files found, exiting with code 1
     ```
   - No test file exists in `src/lib/__tests__/`.
3. **Database State**:
   - Command: Node query on `prisma.garmentProduct` and `prisma.licenseOption`:
     - Apex Heavyweight Oversized Tee: Base `฿150`, Packaging `฿15`, Shipping `฿40`.
     - Supplier 1 DTG printing service: `฿80` per surface.
     - License options seeded:
       - Artwork 1 (Dash Ape Classic): `฿40`
       - Artwork 2 (Cyber Primate 2088): `฿60`
       - Artwork 3 (Static Glitch Protocol): `฿25`
4. **Live Execution of `calculateLivePricing`**:
   - Executed via `npx tsx` on `src/lib/pricing.ts` with benchmark inputs:
     ```json
     {
       "garmentCost": 150,
       "printingCost": 80,
       "licensingCost": 125,
       "packagingCost": 15,
       "shippingCost": 40,
       "totalAmount": 410,
       "quantity": 1,
       "surfacesUsed": ["FRONT"]
     }
     ```
   - Executed with `quantity: 3`:
     ```json
     {
       "garmentCost": 450,
       "printingCost": 240,
       "licensingCost": 375,
       "packagingCost": 45,
       "shippingCost": 40,
       "totalAmount": 1150
     }
     ```
   - Executed with dual surface (FRONT + BACK):
     ```json
     {
       "garmentCost": 150,
       "printingCost": 160,
       "licensingCost": 100,
       "packagingCost": 15,
       "shippingCost": 40,
       "totalAmount": 465
     }
     ```
5. **Observed Defect / Vulnerability in `src/lib/pricing.ts`**:
   - Lines 89-114:
     ```typescript
     for (const item of allLicenses) {
       const license = await prisma.licenseOption.findUnique({ where: { id: item.licenseOptionId }, ... });
       if (license) {
         ...
       }
     }
     ```
   - When executed with a non-existent `licenseOptionId`:
     - Returned `licensingCost: 0` and total `฿285` without throwing or warning! An invalid or malicious license ID bypasses licensing cost rather than failing validation.

---

## 2. Logic Chain

### 2.1 Analysis of Requirement R1 (2D & 3D Interactive Design Studio)
1. **Current Implementation Status**: 0% implemented in `src/`.
   - The studio UI (`/studio/new` or `/studio/[id]`) and components (`src/components/studio/`) do not yet exist.
2. **Three.js 3D Viewport Architecture**:
   - `three: ^0.164.1` and `@types/three` are installed and valid.
   - `OBJLoader` and `OrbitControls` are present in `three/examples/jsm/`.
   - **Texture Mapping Specification**:
     - Canvas texture: Offscreen 1024×1024 canvas.
     - Front UV partition: `u ∈ [0.0, 0.5]` corresponds to pixels `[0, 512]` horizontally.
     - Back UV partition: `u ∈ [0.5, 1.0]` corresponds to pixels `[512, 1024]` horizontally.
     - Because front and back mesh UVs strictly sample from their respective halves of the 1024x1024 canvas texture, graphic bleed-through and mirroring are completely prevented.
   - **3D Asset Requirement (`public/models/tshirt.obj`)**:
     - `tshirt.obj` is missing from `public/models/`.
     - The implementation must provide `public/models/tshirt.obj` with this exact UV parameterization, AND implement a procedural 3D t-shirt `BufferGeometry` fallback within `GarmentPreview3D.tsx` to ensure zero runtime failures if the static asset fails to load.
   - **Neutral 3-Point Lighting & Floor Drop Shadow**:
     - Key Light: `DirectionalLight` (intensity 1.2, position `[4, 6, 5]`).
     - Fill Light: `DirectionalLight` (intensity 0.6, position `[-4, 3, 3]`).
     - Rim/Back Light: `DirectionalLight` (intensity 0.5, position `[0, 5, -5]`).
     - Ambient Light: `AmbientLight` (intensity 0.5, `#FFFFFF`).
     - Floor Shadow: Ground plane or contact shadow mesh with soft radial gradient positioned below the t-shirt mesh (`y = -1.8`).
     - OrbitControls: Configured with `enableDamping: true`, `dampingFactor: 0.05`, `minDistance: 2.0`, `maxDistance: 6.0`, and polar angle limits to prevent flipping below the ground plane.
3. **2D Studio & Multi-Artwork Placement**:
   - **Transparent Backdrop**: Transparent background grid or clean neutral background without intrusive container boxes.
   - **No Obstructive Print Boundary Boxes**: Per the explicit acceptance criterion ("renders shirts large and centered on transparent canvas with no bounding boxes obscuring the garment"), the garment silhouette must be rendered full-bleed and centered without permanent dashed rectangular "print area" outlines obscuring the artwork.
   - **Authentic Garment Colors**:
     - Ink Black: `#131718`
     - Optic White: `#FFFFFF`
     - Paper Beige: `#F5F0E8`
     - Warm Kraft: `#DABA98`
   - **Multi-Artwork Placement & Layer Management**:
     - Schema adheres to `DesignElement` (`x`, `y`, `width`, `height`, `rotation`, `zIndex`, `surface`).
     - Interactive controls must support: repositioning, scaling, rotating, reordering layers (Bring to Front, Send to Back), and deleting layers.

### 2.2 Analysis of Requirement R2 (Authoritative Server-Side Pricing Engine & Checkout)
1. **Core Pricing Formula Verified**:
   $$\text{Total} = \text{Garment Base} + \text{Printing Cost} + \text{Packaging} + \text{Shipping} + \sum \text{Artwork Licenses}$$
   - Benchmark: $150 + 80 + 15 + 40 + (40 + 60 + 25) = \mathbf{410\text{ THB}}$.
   - Live execution verified this exact mathematical output.
2. **Missing Components in R2**:
   - **API Route**: `src/app/api/pricing/calculate/route.ts` is missing. The frontend cannot currently fetch live calculations.
   - **Vitest Unit Test**: `src/lib/__tests__/pricing.test.ts` is missing, causing `npm test` to fail with exit code 1.
   - **Anti-Tampering Checkout Route**: `src/app/api/orders/route.ts` is missing. Checkout logic must independently recalculate the total on the server and reject any client-submitted totals or manipulated license fees.
   - **Defensive Error Handling**: In `src/lib/pricing.ts`, line 101 must throw an error when a requested `licenseOptionId` does not exist in the database, preventing fee evasion.

---

## 3. Detailed Interface Recommendations

### 3.1 Architecture Overview

```
src/
├── app/
│   ├── api/
│   │   ├── pricing/
│   │   │   └── calculate/
│   │   │       └── route.ts          <-- [NEW] Authoritative price calculation endpoint
│   │   └── orders/
│   │       └── route.ts              <-- [NEW] Checkout & anti-tampering order creation
│   └── studio/
│       └── new/
│           └── page.tsx              <-- [NEW] 3-Panel Studio Page
├── components/
│   └── studio/
│       ├── DesignStudioClient.tsx    <-- [NEW] Studio coordinator & state
│       ├── Garment2DCanvas.tsx       <-- [NEW] High-res centered transparent 2D view
│       ├── GarmentPreview3D.tsx      <-- [NEW] Three.js WebGL 3D Viewport with OrbitControls
│       ├── ArtworkCatalogDrawer.tsx  <-- [NEW] Creator artwork selector
│       ├── LayerManager.tsx          <-- [NEW] Multi-artwork layer list & reordering
│       ├── GarmentConfigurator.tsx   <-- [NEW] Color swatches, size & blank selection
│       └── LivePricingCard.tsx       <-- [NEW] Live itemized quote breakdown
├── lib/
│   ├── __tests__/
│   │   └── pricing.test.ts           <-- [NEW] Vitest suite with THB 410 benchmark
│   ├── pricing.ts                    <-- [PATCH] Add validation for missing licenses
│   ├── types.ts                      <-- [EXISTING] Type definitions
│   └── prisma.ts                     <-- [EXISTING] Prisma singleton
public/
└── models/
    └── tshirt.obj                    <-- [NEW] 3D T-shirt mesh with [0,0.5]/[0.5,1.0] UVs
```

### 3.2 Pricing Engine Interface & Fix (`src/lib/pricing.ts`)

#### Proposed Modification in `src/lib/pricing.ts`:
```typescript
// Replace lines 101-114 to prevent silent license fee evasion:
if (!license) {
  throw new Error(`Invalid or missing license option ID: ${item.licenseOptionId}`);
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
```

### 3.3 Pricing Calculation API (`src/app/api/pricing/calculate/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateLivePricing } from '@/lib/pricing';

const PricingPayloadSchema = z.object({
  garmentProductId: z.string().min(1),
  garmentVariantId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  frontArtworkLicenses: z.array(z.object({
    artworkId: z.string(),
    licenseOptionId: z.string(),
  })).default([]),
  backArtworkLicenses: z.array(z.object({
    artworkId: z.string(),
    licenseOptionId: z.string(),
  })).default([]),
  sideArtworkLicenses: z.array(z.object({
    artworkId: z.string(),
    licenseOptionId: z.string(),
  })).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PricingPayloadSchema.parse(json);
    const result = await calculateLivePricing(parsed);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Pricing calculation failed' }, { status: 400 });
  }
}
```

### 3.4 Vitest Benchmark Test Suite (`src/lib/__tests__/pricing.test.ts`)
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { calculateLivePricing } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';

describe('Authoritative Pricing Engine (Requirement R2)', () => {
  let garmentId: string;
  let lic40: { artworkId: string; licenseOptionId: string };
  let lic60: { artworkId: string; licenseOptionId: string };
  let lic25: { artworkId: string; licenseOptionId: string };

  beforeAll(async () => {
    const garment = await prisma.garmentProduct.findFirstOrThrow({
      where: { sku: 'APX-HVY-001' },
    });
    garmentId = garment.id;

    const opt40 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 40 } });
    const opt60 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 60 } });
    const opt25 = await prisma.licenseOption.findFirstOrThrow({ where: { price: 25 } });

    lic40 = { artworkId: opt40.artworkId, licenseOptionId: opt40.id };
    lic60 = { artworkId: opt60.artworkId, licenseOptionId: opt60.id };
    lic25 = { artworkId: opt25.artworkId, licenseOptionId: opt25.id };
  });

  it('calculates the exact THB 410 benchmark for 1 unit with 3 licenses', async () => {
    const result = await calculateLivePricing({
      garmentProductId: garmentId,
      quantity: 1,
      frontArtworkLicenses: [lic40, lic60, lic25],
    });

    // Breakdown assertions
    expect(result.garmentCost).toBe(150);
    expect(result.printingCost).toBe(80);
    expect(result.packagingCost).toBe(15);
    expect(result.shippingCost).toBe(40);
    expect(result.licensingCost).toBe(125);
    expect(result.totalAmount).toBe(410);
    expect(result.quantity).toBe(1);
    expect(result.surfacesUsed).toEqual(['FRONT']);
  });

  it('scales accurately by quantity (3 units = THB 1,150)', async () => {
    const result = await calculateLivePricing({
      garmentProductId: garmentId,
      quantity: 3,
      frontArtworkLicenses: [lic40, lic60, lic25],
    });

    expect(result.garmentCost).toBe(450);    // 150 * 3
    expect(result.printingCost).toBe(240);   // 80 * 3
    expect(result.licensingCost).toBe(375);  // 125 * 3
    expect(result.packagingCost).toBe(45);   // 15 * 3
    expect(result.shippingCost).toBe(40);    // flat shipping
    expect(result.totalAmount).toBe(1150);
  });

  it('accurately computes dual-surface printing (FRONT + BACK)', async () => {
    const result = await calculateLivePricing({
      garmentProductId: garmentId,
      quantity: 1,
      frontArtworkLicenses: [lic40],
      backArtworkLicenses: [lic60],
    });

    expect(result.printingCost).toBe(160); // 80 * 2 surfaces
    expect(result.licensingCost).toBe(100); // 40 + 60
    expect(result.totalAmount).toBe(465);  // 150 + 160 + 100 + 15 + 40
  });

  it('throws an error when garment product is not found', async () => {
    await expect(
      calculateLivePricing({
        garmentProductId: 'non-existent-garment-id',
        quantity: 1,
      })
    ).rejects.toThrow(/Garment product not found/);
  });
});
```

### 3.5 Checkout Anti-Tampering Engine (`src/app/api/orders/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';

const CreateOrderSchema = z.object({
  customerId: z.string().optional(),
  garmentProductId: z.string().min(1),
  garmentVariantId: z.string().optional(),
  garmentColorHex: z.string().default('#131718'),
  garmentSize: z.string().default('L'),
  quantity: z.number().int().min(1).default(1),
  frontElements: z.array(z.any()).default([]),
  backElements: z.array(z.any()).default([]),
  sideElements: z.array(z.any()).default([]),
  shippingName: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingPostal: z.string().min(1),
  shippingPhone: z.string().optional(),
  clientClaimedTotal: z.number().optional(), // For tamper detection
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateOrderSchema.parse(body);

    // Extract license lines
    const frontLicenses = data.frontElements.map((e: any) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    }));
    const backLicenses = data.backElements.map((e: any) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    }));
    const sideLicenses = data.sideElements.map((e: any) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    }));

    // AUTHORITATIVE SERVER RECALCULATION
    const calculated = await calculateLivePricing({
      garmentProductId: data.garmentProductId,
      garmentVariantId: data.garmentVariantId,
      quantity: data.quantity,
      frontArtworkLicenses: frontLicenses,
      backArtworkLicenses: backLicenses,
      sideArtworkLicenses: sideLicenses,
    });

    // Anti-tamper verification
    if (data.clientClaimedTotal !== undefined) {
      if (Math.abs(data.clientClaimedTotal - calculated.totalAmount) > 0.01) {
        return NextResponse.json(
          { error: 'Price tampering detected: client price does not match server calculation.' },
          { status: 400 }
        );
      }
    }

    const garment = await prisma.garmentProduct.findUniqueOrThrow({
      where: { id: data.garmentProductId },
    });

    const orderNumber = `APX-ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Atomic Database Transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create DesignDocument
      const design = await tx.designDocument.create({
        data: {
          userId: data.customerId || null,
          title: `Custom ${garment.name}`,
          garmentProductId: data.garmentProductId,
          garmentVariantId: data.garmentVariantId,
          garmentColorHex: data.garmentColorHex,
          garmentSize: data.garmentSize,
          frontElements: JSON.stringify(data.frontElements),
          backElements: JSON.stringify(data.backElements),
          sideElements: JSON.stringify(data.sideElements),
          status: 'ORDERED',
        },
      });

      // 2. Create Order with authoritative figures
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId || null,
          designId: design.id,
          supplierId: garment.supplierId,
          quantity: data.quantity,
          status: 'PAYMENT_CONFIRMED',
          paymentMode: 'DEV_MOCK',
          paymentStatus: 'PAID',
          garmentCost: calculated.garmentCost,
          printingCost: calculated.printingCost,
          licensingCost: calculated.licensingCost,
          packagingCost: calculated.packagingCost,
          shippingCost: calculated.shippingCost,
          totalAmount: calculated.totalAmount,
          shippingName: data.shippingName,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingPostal: data.shippingPostal,
          shippingPhone: data.shippingPhone,
        },
      });

      // 3. Atomically create Royalty Obligations & Ledger Entries
      const allElements = [...data.frontElements, ...data.backElements, ...data.sideElements];
      for (const elem of allElements) {
        const obligation = await tx.royaltyObligation.create({
          data: {
            orderId: newOrder.id,
            creatorId: elem.creatorId,
            artworkId: elem.artworkId,
            licenseOptionId: elem.licenseOptionId,
            unitRoyalty: elem.price,
            quantity: data.quantity,
            totalAmount: elem.price * data.quantity,
            status: 'ELIGIBLE',
          },
        });

        // Get prior balance
        const lastEntry = await tx.royaltyLedgerEntry.findFirst({
          where: { creatorId: elem.creatorId },
          orderBy: { createdAt: 'desc' },
        });
        const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
        const newBalance = currentBalance + (elem.price * data.quantity);

        await tx.royaltyLedgerEntry.create({
          data: {
            creatorId: elem.creatorId,
            obligationId: obligation.id,
            entryType: 'EARNING',
            amount: elem.price * data.quantity,
            balanceAfter: newBalance,
            reference: orderNumber,
            notes: `Order ${orderNumber}: License for ${elem.title}`,
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 400 });
  }
}
```

### 3.6 Three.js 3D Viewport Implementation Spec (`GarmentPreview3D.tsx`)
1. **Dynamic CanvasTexture Generation**:
   ```typescript
   // Offscreen canvas: 1024 x 1024
   const canvas = document.createElement('canvas');
   canvas.width = 1024;
   canvas.height = 1024;
   const ctx = canvas.getContext('2d')!;

   // 1. Fill base garment color
   ctx.fillStyle = garmentColorHex;
   ctx.fillRect(0, 0, 1024, 1024);

   // 2. Draw FRONT elements in left half (x ∈ [0, 512], y ∈ [0, 1024])
   frontElements.forEach(elem => {
     const drawX = (elem.x / 100) * 512;
     const drawY = (elem.y / 100) * 1024;
     const drawW = (elem.width / 100) * 512;
     const drawH = (elem.height / 100) * 1024;
     ctx.save();
     ctx.translate(drawX, drawY);
     ctx.rotate((elem.rotation * Math.PI) / 180);
     ctx.drawImage(elem.imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
     ctx.restore();
   });

   // 3. Draw BACK elements in right half (x ∈ [512, 1024], y ∈ [0, 1024])
   backElements.forEach(elem => {
     const drawX = 512 + (elem.x / 100) * 512;
     const drawY = (elem.y / 100) * 1024;
     const drawW = (elem.width / 100) * 512;
     const drawH = (elem.height / 100) * 1024;
     ctx.save();
     ctx.translate(drawX, drawY);
     ctx.rotate((elem.rotation * Math.PI) / 180);
     ctx.drawImage(elem.imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
     ctx.restore();
   });

   texture.needsUpdate = true;
   ```

2. **3D Scene Setup with 3-Point Lighting**:
   ```typescript
   const scene = new THREE.Scene();
   const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
   camera.position.set(0, 0.2, 3.2);

   const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
   renderer.setSize(width, height);
   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

   // 3-point lighting rig
   const ambient = new THREE.AmbientLight(0xffffff, 0.6);
   scene.add(ambient);

   const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
   keyLight.position.set(4, 6, 5);
   scene.add(keyLight);

   const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
   fillLight.position.set(-4, 3, 3);
   scene.add(fillLight);

   const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
   rimLight.position.set(0, 5, -5);
   scene.add(rimLight);

   // OrbitControls
   const controls = new OrbitControls(camera, renderer.domElement);
   controls.enableDamping = true;
   controls.dampingFactor = 0.05;
   controls.minDistance = 2.0;
   controls.maxDistance = 5.5;
   controls.maxPolarAngle = Math.PI / 2 + 0.1;
   ```

3. **Fallback Procedural T-Shirt Geometry**:
   - In case `fetch('/models/tshirt.obj')` fails or asset loading is delayed, generate a dual-surface t-shirt mesh where front vertices explicitly have `uv.x ∈ [0.0, 0.5]` and back vertices have `uv.x ∈ [0.5, 1.0]`.

---

## 4. Caveats
1. **Database Runtime Dependency**: `calculateLivePricing` requires the database to be migrated and seeded (`dev.db`). The test suite must run against the pre-seeded SQLite database or a test database.
2. **Side Surface Printing**: The Prisma schema and seed data support `SIDE` (sleeves), but `tshirt.obj` UV mapping is specified primarily for FRONT (`[0, 0.5]`) and BACK (`[0.5, 1.0]`). For SIDE prints in 3D, sleeves can be mapped to neutral UV segments or previewed in 2D.
3. **SVG vs Raster Images in CanvasTexture**: DiceBear SVG images used in seed data must be loaded as `HTMLImageElement` objects before drawing onto the offscreen canvas for 3D texture projection.

---

## 5. Conclusion
- **R1 (Design Studio)**: Currently 0% implemented in `src/`. All required dependencies (`three`, `@types/three`, `lucide-react`, `tailwindcss`) are in place. The implementer must create `src/app/studio/new/page.tsx`, `Garment2DCanvas.tsx` (centered on transparent backdrop without print boxes), `GarmentPreview3D.tsx` (Three.js with 1024x1024 CanvasTexture mapping `[0, 0.5]` to Front and `[0.5, 1.0]` to Back, 3-point lighting, OrbitControls), and place/generate `public/models/tshirt.obj`.
- **R2 (Pricing Engine)**: `src/lib/pricing.ts` is 80% complete and successfully verified against the **THB 410** benchmark and quantity scaling. However, three critical deliverables are missing:
  1. `src/lib/__tests__/pricing.test.ts` (vitest test suite verifying the THB 410 benchmark, resolving the current `npm test` failure).
  2. `src/app/api/pricing/calculate/route.ts` (API endpoint for live quotes).
  3. `src/app/api/orders/route.ts` (authoritative server recalculation and anti-tampering validation).
  4. Fix in `src/lib/pricing.ts` to reject invalid `licenseOptionId` inputs.

---

## 6. Verification Method

To independently verify the observations and conclusions in this report:

1. **Verify TypeScript compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0 with 0 errors.

2. **Verify current Vitest failure due to missing test files**:
   ```powershell
   npm test
   ```
   *Expected result*: Exit code 1 with message `No test files found, exiting with code 1`.

3. **Verify live pricing calculation and exact THB 410 benchmark via tsx**:
   ```powershell
   npx tsx -e "import { calculateLivePricing } from './src/lib/pricing'; import { prisma } from './src/lib/prisma'; async function run() { const g = await prisma.garmentProduct.findFirstOrThrow({ where: { sku: 'APX-HVY-001' } }); const lics = await prisma.licenseOption.findMany({ where: { price: { in: [40, 60, 25] } } }); const res = await calculateLivePricing({ garmentProductId: g.id, quantity: 1, frontArtworkLicenses: lics.map(l => ({ artworkId: l.artworkId, licenseOptionId: l.id })) }); console.log('TOTAL:', res.totalAmount); process.exit(res.totalAmount === 410 ? 0 : 1); } run();"
   ```
   *Expected result*: Outputs `TOTAL: 410` and exits with code 0.

4. **Verify missing studio files and 3D models**:
   ```powershell
   Test-Path "src\app\studio\new\page.tsx"
   Test-Path "public\models\tshirt.obj"
   ```
   *Expected result*: Both return `False`.
