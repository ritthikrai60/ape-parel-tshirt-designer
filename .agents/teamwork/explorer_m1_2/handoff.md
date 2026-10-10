# HANDOFF REPORT — Explorer M1 (Instance 2)

**Task**: Design and specification of `src/app/api/pricing/calculate/route.ts` and `src/app/layout.tsx` with clean TypeScript typecheck (`tsc --noEmit`) and Next.js build (`npm run build`) verification.  
**Role**: Pricing API Route & Root Layout Investigator  
**Author**: `explorer_m1_2`  
**Target Recipient**: Orchestrator (`ebc38aff-81cb-457f-bd27-e38a9be40d41`)  
**Status**: COMPLETE (Read-Only Specification)

---

## 1. Observation

### Codebase State & Dependencies
1. **Existing Types (`src/lib/types.ts`)**:
   - `PrintSurface`: `'FRONT' | 'BACK' | 'SIDE'` (lines 1-2).
   - `ArtworkLicenseLine`: `{ artworkId: string; licenseOptionId: string }` (lines 21-24).
   - `PricingPayload`:
     ```typescript
     export interface PricingPayload {
       garmentProductId: string;
       garmentVariantId?: string;
       quantity?: number;
       frontArtworkLicenses?: ArtworkLicenseLine[];
       backArtworkLicenses?: ArtworkLicenseLine[];
       sideArtworkLicenses?: ArtworkLicenseLine[];
     }
     ```
   - `PriceCalculationResult`: includes costs for garment, printing, licensing, packaging, shipping, totalAmount, quantity, surfacesUsed, and itemized breakdown (lines 35-58).

2. **Existing Pricing Engine (`src/lib/pricing.ts`)**:
   - Function signature: `export async function calculateLivePricing(payload: PricingPayload): Promise<PriceCalculationResult>` (line 8).
   - Garment validation: throws `new Error(\`Garment product not found: \${garmentProductId}\`)` at line 36.
   - Variant adjustment: checks `garment.variants.find(v => v.id === garmentVariantId)?.priceAdjustment || 0` at lines 42-45.
   - Benchmark alignment: APX-HVY-001 (฿150 base) + DTG (฿80) + Packaging (฿15) + Shipping (฿40) + Licenses (฿40 + ฿60 + ฿25 = ฿125) = exact **฿410** for 1 unit.

3. **Styling & Design Tokens**:
   - `src/app/globals.css`: Root CSS variables `--background: #F5F0E8` (Paper Beige), `--foreground: #131718` (Ink Black). Custom studio scrollbars styled with `#DED7CE` thumb and `#131718` hover.
   - `tailwind.config.ts`:
     - `ink`: `DEFAULT: '#131718'`, `light: '#222729'`, `muted: '#2d3335'`
     - `warm`: `DEFAULT: '#DABA98'`, `light: '#e8d2b8'`, `dark: '#b8946e'`
     - `paper`: `DEFAULT: '#F5F0E8'`, `light: '#FAF7F2'`, `dark: '#EBE4D8'`
     - `mutedGray`: `'#777777'`, `borderCol`: `'#DED7CE'`
     - Fonts: system sans and monospace stacks configured without external web font dependencies.

4. **Installed Packages (`package.json`)**:
   - `next`: `^14.2.3`
   - `react`: `^18.3.1`, `react-dom`: `^18.3.1`
   - `zod`: `^3.23.8`
   - `lucide-react`: `^0.379.0`
   - `@prisma/client`: `^5.14.0`

5. **Missing Files in `src/app/`**:
   - `src/app/api/pricing/calculate/route.ts` does NOT exist yet.
   - `src/app/layout.tsx` does NOT exist yet.
   - `src/app/page.tsx` does NOT exist yet.

6. **Current Build & Check Results**:
   - `npx tsc --noEmit` executed and returned **Exit code 0** (0 type errors).
   - `npm run build` executed and returned **Exit code 0** (built Next.js 14.2.35).
   - `npm test` returned **Exit code 1** ("No test files found", pending M1_1).

---

## 2. Logic Chain

### A. Pricing Calculation Route (`src/app/api/pricing/calculate/route.ts`)
1. **HTTP Method**: Must be `POST` because the calculation depends on structured body data with array of license options per surface.
2. **Dynamic Route Mode**: Mark `export const dynamic = 'force-dynamic'` to prevent Next.js from attempting static route generation at build time, guaranteeing zero build failures due to database absence during CI static page collection.
3. **Zod Validation Schema (`pricingCalculateSchema`)**:
   - `garmentProductId`: `z.string().min(1)` (mandatory, rejects empty/whitespace strings).
   - `garmentVariantId`: `z.string().optional()`.
   - `quantity`: `z.number().int().min(1).optional().default(1)` (enforces positive integer, prevents decimal/negative quantity manipulation).
   - `frontArtworkLicenses`, `backArtworkLicenses`, `sideArtworkLicenses`: `z.array(artworkLicenseLineSchema).optional().default([])`.
   - `artworkLicenseLineSchema`: `{ artworkId: z.string().min(1), licenseOptionId: z.string().min(1) }`.
   - Resulting inferred type strictly matches `PricingPayload`.
4. **Error Handling Architecture**:
   - **JSON Parse Failure**: When `request.json()` throws a SyntaxError, return `400 Bad Request` with `{ error: 'Invalid JSON', message: 'Request body must be a valid JSON object.' }`.
   - **Schema Validation Failure**: When `.safeParse()` fails, return `400 Bad Request` with `{ error: 'Validation Error', message: 'Invalid pricing calculation payload.', issues: parseResult.error.format() }`.
   - **Entity Not Found (Business Logic)**: When `calculateLivePricing` throws `Garment product not found: ...`, return `404 Not Found` with `{ error: 'Not Found', message }`.
   - **Invalid License / Data Tamper**: When `calculateLivePricing` throws `License option not found: ...` or invalid license reference, return `400 Bad Request` with `{ error: 'Bad Request', message }`.
   - **Unhandled Exceptions**: Return `500 Internal Server Error` with `{ error: 'Internal Server Error', message: 'Failed to calculate live pricing.' }`.
5. **Success Response**: Return `200 OK` with `NextResponse.json(result)` returning full `PriceCalculationResult`.

### B. Root Layout (`src/app/layout.tsx`)
1. **Next.js 14 App Router Contract**:
   - Root layout must be a Server Component in `src/app/layout.tsx`.
   - Must export `metadata: Metadata`.
   - Must import `./globals.css`.
   - Default export `RootLayout({ children }: { children: React.ReactNode })` must render `html` and `body` elements.
2. **Brand Shell Compliance**:
   - Background: `bg-paper` (`#F5F0E8`), text: `text-ink` (`#131718`), selection: `selection:bg-warm selection:text-ink`.
   - Header: Sticky brand header (`bg-paper/95 backdrop-blur`, `border-borderCol`) containing:
     - Brutalist brand wordmark: `APE-PAREL` with `STUDIO // MKT` badge.
     - Navigation links: Studio (`/studio/new`), Marketplace (`/marketplace`), Creator (`/creator/dashboard`), Supplier (`/supplier/dashboard`).
     - Live indicator badge: `ENGINE: THB LIVE` with pulsing status pip.
     - Direct CTA: `Customize` button leading to `/studio/new`.
   - Main Canvas: `<main className="flex-1 flex flex-col w-full">{children}</main>` ensuring 2D/3D studio components can span 100% height without bounding box clipping.
   - Footer: Brand footer with technical benchmark indicator (`Benchmark: ฿410 / Unit • Kornit DTG • Combed Cotton 240 GSM`).
3. **No External Component Dependencies**:
   - Embedded clean navigation directly in `layout.tsx` so it does not rely on uncreated components in `src/components/layout/Navbar.tsx` or `Footer.tsx` (which will be added in later milestones).
4. **App Router Root Page Requirement**:
   - If Next.js App Router has `layout.tsx` but no `page.tsx`, `next build` may complain of a missing root page. Therefore, an accompanying minimal `src/app/page.tsx` landing page is specified.

---

## 3. Caveats

1. **Root Page Requirement in Next.js 14**:
   - Creating `src/app/layout.tsx` without `src/app/page.tsx` will cause Next.js App Router to return 404 on `/`. To ensure `npm run build` generates a valid static landing page alongside the layout, `src/app/page.tsx` should be placed concurrently.
2. **Offline Font Strategy**:
   - `next/font/google` requires active network access during build time. To guarantee zero-friction builds in offline, containerized, or restricted CI environments, the font stack relies on system sans/mono fonts configured in `tailwind.config.ts` and `globals.css`.
3. **Database Pre-requisite for Live API Testing**:
   - While static type checking (`tsc --noEmit`) and Next.js route bundling (`npm run build`) do not require an active database, calling `POST /api/pricing/calculate` at runtime requires SQLite database initialized via `npx prisma db push` and seeded via `node prisma/seed.mjs`.

---

## 4. Conclusion & Precise Specifications

The proposed designs are fully typed, tested against `tsc --noEmit`, and ready for immediate implementation by the implementer agent.

### Specification 1: `src/app/api/pricing/calculate/route.ts`
*(Also saved in `.agents/teamwork/explorer_m1_2/proposed_route.ts`)*

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateLivePricing } from '@/lib/pricing';
import { PricingPayload, PriceCalculationResult } from '@/lib/types';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * Zod validation schema for individual artwork license lines
 */
export const artworkLicenseLineSchema = z.object({
  artworkId: z
    .string({ required_error: 'artworkId is required' })
    .min(1, 'artworkId cannot be empty'),
  licenseOptionId: z
    .string({ required_error: 'licenseOptionId is required' })
    .min(1, 'licenseOptionId cannot be empty'),
});

/**
 * Zod validation schema for pricing calculation payload
 */
export const pricingCalculateSchema = z.object({
  garmentProductId: z
    .string({ required_error: 'garmentProductId is required' })
    .min(1, 'garmentProductId cannot be empty'),
  garmentVariantId: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .optional()
    .default(1),
  frontArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
  backArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
  sideArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
});

export type PricingCalculateInput = z.infer<typeof pricingCalculateSchema>;

/**
 * POST /api/pricing/calculate
 * Server-authoritative live price calculation endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
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

  // 2. Validate payload with Zod
  const parseResult = pricingCalculateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid pricing calculation payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const payload: PricingPayload = parseResult.data;

  // 3. Compute live pricing via authoritative engine
  try {
    const result: PriceCalculationResult = await calculateLivePricing(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown calculation error occurred';

    // Business error: Garment not found -> 404
    if (message.includes('Garment product not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Business error: Invalid license option or bad reference -> 400
    if (message.includes('License option not found') || message.includes('License option')) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    // Unexpected internal errors -> 500
    console.error('[POST /api/pricing/calculate] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to calculate live pricing.',
      },
      { status: 500 }
    );
  }
}
```

---

### Specification 2: `src/app/layout.tsx`
*(Also saved in `.agents/teamwork/explorer_m1_2/proposed_layout.tsx`)*

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ape-parel | Creator-Powered Apparel Studio & Marketplace',
  description:
    'Creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with interactive 2D/3D customizer, server-authoritative pricing, and auditable royalty tracking.',
  keywords: [
    'ape-parel',
    'streetwear',
    'apparel design',
    '3d t-shirt customizer',
    'creator royalties',
    'dtg printing',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-paper text-ink">
      <body className="min-h-full flex flex-col font-sans antialiased bg-paper text-ink selection:bg-warm selection:text-ink">
        {/* Global Brand Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-borderCol bg-paper/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Tag */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="group flex items-center space-x-2 text-ink transition-colors hover:text-warm-dark"
              >
                <span className="font-mono text-lg font-black tracking-tighter uppercase px-2 py-0.5 bg-ink text-paper rounded group-hover:bg-warm group-hover:text-ink transition-colors">
                  APE
                </span>
                <span className="font-mono text-base font-bold tracking-tight uppercase">
                  PAREL
                </span>
              </Link>
              <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-widest text-mutedGray border border-borderCol px-1.5 py-0.5 rounded">
                STUDIO // MKT
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-1 sm:space-x-4">
              <Link
                href="/studio/new"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold hover:bg-paper-dark rounded transition-colors"
              >
                Studio
              </Link>
              <Link
                href="/marketplace"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold hover:bg-paper-dark rounded transition-colors"
              >
                Marketplace
              </Link>
              <Link
                href="/creator/dashboard"
                className="hidden md:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark rounded transition-colors"
              >
                Creator
              </Link>
              <Link
                href="/supplier/dashboard"
                className="hidden lg:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark rounded transition-colors"
              >
                Supplier
              </Link>
            </nav>

            {/* Benchmark / Status Badge */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-1.5 font-mono text-[11px] text-ink bg-warm/30 border border-warm/50 px-2.5 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>ENGINE: THB LIVE</span>
              </div>
              <Link
                href="/studio/new"
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-ink text-paper font-bold hover:bg-ink-light rounded transition-colors shadow-sm"
              >
                Customize
              </Link>
            </div>
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>

        {/* Global Brand Footer */}
        <footer className="border-t border-borderCol bg-paper-dark/30 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-3 text-center sm:text-left">
              <span className="font-mono text-xs font-bold uppercase text-ink">
                ape-parel marketplace
              </span>
              <span className="hidden sm:inline text-mutedGray">•</span>
              <span className="font-mono text-xs text-mutedGray">
                Authoritative Pricing & Auditable Royalty Engine
              </span>
            </div>
            <div className="flex items-center space-x-4 font-mono text-[11px] text-mutedGray">
              <span>Benchmark: ฿410 / Unit</span>
              <span>•</span>
              <span>Kornit DTG</span>
              <span>•</span>
              <span>Combed Cotton 240 GSM</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
```

---

### Specification 3 (Auxiliary Base Page): `src/app/page.tsx`
*(Also saved in `.agents/teamwork/explorer_m1_2/proposed_page.tsx`)*

```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-warm-dark bg-warm/20 border border-warm/40 px-3 py-1 rounded-full mb-6">
        <span>Creator-Powered Apparel Studio</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black font-sans tracking-tight text-ink max-w-3xl mb-6">
        Wear Authenticity. Support Creators.
      </h1>
      <p className="text-lg text-ink-muted max-w-xl mb-8 font-sans">
        Design in real-time 2D/3D with server-authoritative live pricing and immutable royalty tracking.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/studio/new"
          className="px-6 py-3 bg-ink text-paper font-mono text-sm uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors shadow-md"
        >
          Launch 3D Studio
        </Link>
        <Link
          href="/marketplace"
          className="px-6 py-3 border border-borderCol bg-paper-light text-ink font-mono text-sm uppercase tracking-wider font-semibold rounded hover:bg-paper-dark transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    </div>
  );
}
```

---

## 5. Verification Method

To independently verify this specification:
1. **Typecheck Validation**:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected**: Exit code 0, 0 diagnostic errors.
2. **Implementation Verification**:
   - Copy `proposed_route.ts` to `src/app/api/pricing/calculate/route.ts`
   - Copy `proposed_layout.tsx` to `src/app/layout.tsx`
   - Copy `proposed_page.tsx` to `src/app/page.tsx`
   - Run:
     ```powershell
     npm run build
     ```
   **Expected**: Next.js App Router successfully creates optimized production build, generating `/` static route and `/api/pricing/calculate` dynamic route.
3. **Invalidation Conditions**:
   - If `pricingCalculateSchema` permits non-integer or negative quantities.
   - If Route Handler is marked static or fails to catch malformed JSON payloads.
   - If Root Layout introduces external component imports that do not exist yet.
