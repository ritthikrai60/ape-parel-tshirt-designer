# Phase 0 Architectural Survey & Codebase Mapping Report
**Domain**: Creator Storefront & Graphic Asset Pipeline (Requirements R1 & R2)  
**Agent**: teamwork_preview_explorer #2 (`explorer_survey_gen4_2`)  
**Date**: 2026-10-10  
**Project Root**: `d:\Coding Projects\ape-parel tshirt`  

---

## 1. Observation

### 1.1 Baseline System Health & Tooling Output
- **Baseline Test Suite**:
  - Command: `npm test` (`vitest run`)
  - Execution Result: 13 test files passed, 268 tests passed, 0 failures (Duration: ~6.52s).
- **TypeScript Type Checking**:
  - Command: `npx tsc --noEmit`
  - Execution Result: Clean compilation, 0 type errors.
- **Production Build**:
  - Command: `npm run build` (`next build`)
  - Execution Result: Clean compilation, 9 static/dynamic route artifacts generated, 0 warnings/errors.
- **Image Processing Runtime Verification**:
  - Command: `node -e "const sharp = require('sharp'); console.log(sharp.versions);"`
  - Output:
    ```json
    {
      "aom": "3.9.1", "cairo": "1.18.0", "pango": "1.54.0", "png": "1.6.43",
      "rsvg": "2.58.93", "tiff": "4.6.0", "mozjpeg": "4.1.5", "vips": "8.15.3",
      "sharp": "0.33.5"
    }
    ```
  - Native Sharp density and transparency probe:
    - Command: `node -e "const sharp = require('sharp'); ..."`
    - Output: `{"format":"png","width":600,"height":600,"density":300,"hasAlpha":true}`
    - Confirmed: Native bindings (`@img/sharp-win32-x64`) for Windows x64 are fully active; librsvg is bundled for vector SVG processing; libtiff is bundled for TIFF processing; alpha transparency channel is detectable.

---

### 1.2 Design Tokens & Styling Architecture
1. **Tailwind Configuration (`tailwind.config.ts`, lines 9–37)**:
   - Ink Black:
     - `ink.DEFAULT`: `#131718`
     - `ink.light`: `#222729`
     - `ink.muted`: `#2d3335`
   - Warm Kraft:
     - `warm.DEFAULT`: `#DABA98`
     - `warm.light`: `#e8d2b8`
     - `warm.dark`: `#b8946e`
     - *Note*: Original request mentions `Warm Kraft #D4B996`.
   - Paper Beige:
     - `paper.DEFAULT`: `#F5F0E8`
     - `paper.light`: `#FAF7F2`
     - `paper.dark`: `#EBE4D8`
     - *Note*: Original request mentions `Paper Beige #EBE7DF`.
   - Neutral Accents:
     - `mutedGray`: `#777777`
     - `borderCol`: `#DED7CE`
2. **Global CSS (`src/app/globals.css`, lines 5–8)**:
   ```css
   :root {
     --background: #F5F0E8;
     --foreground: #131718;
   }
   ```
3. **Garment Fabric Tokens (`src/components/studio/DesignStudioClient.tsx`, lines 72–77)**:
   ```ts
   export const AUTHENTIC_COLORS = [
     { id: 'BLK', name: 'Ink Black', hex: '#131718', textCol: '#FFFFFF' },
     { id: 'WHT', name: 'Optic White', hex: '#FFFFFF', textCol: '#131718' },
     { id: 'BGE', name: 'Paper Beige', hex: '#F5F0E8', textCol: '#131718' },
     { id: 'WRM', name: 'Warm Kraft', hex: '#DABA98', textCol: '#131718' },
   ] as const;
   ```
   *Verified*: Existing unit tests in `src/lib/__tests__/studio_pipeline.test.ts` (lines 166–176) and `studio_challenger.test.ts` (lines 262–264) explicitly assert `AUTHENTIC_COLORS.length === 4` and test each color ID and hex value.

---

### 1.3 Existing Storefront, Marketplace & Creator Pages
1. **Creator Storefront (`src/app/creators/[slug]/page.tsx`)**:
   - Lines 40–223: Hardcoded fallback `SEEDED_CREATORS` (`dash-ape`, `cyber-monk`, `soma-botanica`) ensure page renders even when database is unseeded.
   - Lines 241–255: Database lookup `prisma.creatorProfile.findUnique({ where: { slug }, include: { artworks: ... } })`.
   - Lines 344–356: Avatar rendering with fallback initial circle; **no banner image** is currently rendered.
   - Lines 362–365: Verified badge is hardcoded:
     ```tsx
     <ShieldCheck className="w-3 h-3 text-emerald-600" />
     <span>Verified Creator</span>
     ```
   - Lines 370–385: Social link rendering only supports `creator.website`. No structured links for Instagram, Twitter/X, or portfolio.
   - Lines 400–424: Renders 3 metrics: Portfolio Works (`artworksCount`), Licensed Units (`totalDesignsCount`), and Royalty Status ("Active").
   - Lines 445–448: Renders `<CreatorPortfolioGrid artworks={creator.artworks} creatorName={creator.displayName} />`.
2. **Marketplace (`src/app/marketplace/page.tsx` & `src/components/marketplace/`)**:
   - `MarketplacePage` (lines 163–214): Queries published and approved artworks. Renders hero banner, guarantees per-garment royalty copy, and `<MarketplaceCatalog>`.
   - `ArtworkCard.tsx` (lines 61–160): Shows preview image (`aspect-square bg-[#131718]`), category badge (Illustration, Mascot, Typography, Pattern, Logo), `ShieldCheck` "Royalty Auth" badge, creator `@slug` link, tags, base license price (`฿${artwork.baseLicensePrice} / unit`), and "Customize" CTA button linking to `/studio/new?artworkId=...`.
   - `CategoryFilter.tsx` (lines 239–350): Implements search bar, category tabs, sort dropdown, and empty states.
3. **Creator Dashboard (`src/app/creator/dashboard/page.tsx` & `src/components/portal/CreatorDashboardClient.tsx`)**:
   - Focuses strictly on royalty accounting: Gross Royalties Earned (`summary.lifetimeEarnings`), Sales Volume (`summary.salesVolume`), Eligible Balance (`summary.currentBalance`), Settled Payouts (`summary.totalSettled`).
   - Modal for `/api/royalties/settle` payout requests.
   - Ledger transaction history table.
   - **Gaps**:
     - No self-service registration or profile editing flow.
     - No artwork upload button, form, or route.
     - No licensing price configuration interface.

---

### 1.4 Asset Upload & Storage Pipeline State
1. **Existing API Routes (`src/app/api/`)**:
   - `orders/route.ts` & `orders/[id]/route.ts`: Order placement & status management.
   - `orders/[id]/production/route.ts`: Factory RIP specification export.
   - `pricing/calculate/route.ts`: Server-side price recalculation.
   - `royalties/settle/route.ts`: Payout settlement transactions.
   - **Absence**: There are **zero** endpoints for artwork upload, asset validation, or creator registration (`/api/artworks/upload`, `/api/artworks/[id]/licenses`, `/api/creators/register` do not exist).
2. **Filesystem Storage (`public/`)**:
   - Contents: `public/models/tshirt.obj` (3D Wavefront mesh) only.
   - Directory `public/uploads` **does not exist**.
   - No storage abstraction service exists in `src/lib/`.
3. **Current Artwork Database References (`prisma/schema.prisma` lines 59–76)**:
   - Current fields:
     - `previewUrl: String` (currently pointing to Dicebear SVGs or Unsplash URLs)
     - `originalUrl: String?` (optional high-res master URL)
     - `mimeType: String @default("image/png")`
   - In `src/lib/production.ts` lines 278–279:
     ```ts
     const highResAssetUrl = artMeta?.originalUrl || previewUrl;
     ```
     The production spec generator is already wired to prioritize `originalUrl` over `previewUrl`!

---

## 2. Logic Chain

### 2.1 Why Schema Extensions Are Necessary & Safe
- **Observation**: `CreatorProfile` currently contains `displayName`, `slug`, `bio`, `avatarUrl`, `website`, `payoutDetails`. It lacks `bannerUrl`, structured social media handles, curated/featured artwork selections, and explicit verification badge flags.
- **Observation**: `Artwork` contains generic metadata (`title`, `description`, `category`, `previewUrl`, `originalUrl`, `mimeType`) but lacks technical print verification data (DPI, physical dimensions, pixel dimensions, transparency check flag, vector check flag, checksum, local storage key).
- **Inference**: Creating dedicated 1-to-1 extension models `CreatorStorefrontSettings` (for `CreatorProfile`) and `ArtworkFileSpec` (for `Artwork`) fulfills R4 while maintaining 100% backward compatibility. Because these relations are optional (`CreatorStorefrontSettings?`, `ArtworkFileSpec?`), all 268 baseline tests and existing seed scripts continue to pass without a single breaking change.

### 2.2 Why Sharp Is the Ideal Validation & Watermarking Engine
- **Observation**: Sharp 0.33.5 with Windows x64 binaries, `librsvg`, and `libtiff` is already present in `node_modules` and verified to run natively in Node.js.
- **Logic**:
  1. `metadata.format`: Detects `png`, `svg`, `tiff`, `jpeg`.
  2. `metadata.density`: Returns DPI. If `format !== 'svg'` and `(metadata.density || 72) < 300`, reject immediately with 400 Bad Request.
  3. `metadata.hasAlpha`: For `png`, if transparent background is required for apparel DTG printing and `!metadata.hasAlpha`, reject immediately.
  4. Vectors (`image/svg+xml`): SVG has infinite scalable resolution, automatically satisfying the 300 DPI threshold.
  5. Automated Watermark:
     - Master file written to `public/uploads/masters/{id}.{ext}`.
     - Sharp reads master buffer, resizes to max 1024x1024, composites an SVG watermark overlay (`APE-PAREL • ROYALTY PROTECTED`), and outputs optimized preview to `public/uploads/previews/{id}.png`.
     - The public can only access the watermarked web preview (`/uploads/previews/...`), safeguarding the creator's master file for factory production (`/uploads/masters/...`).

### 2.3 Licensing Tiers Mapping (R2)
- **Observation**: `LicenseOption` currently has `price: Int`, `name: String`, `scope: String @default("PER_GARMENT")`.
- **Logic**:
  - Each uploaded artwork will initialize three standard tiers:
    1. **Standard Apparel License**: Author-defined base price (e.g. ฿40–฿80 THB). Single garment unit print authorization.
    2. **Commercial License**: Small-batch commercial production up to 50 units (e.g. ฿120–฿250 THB).
    3. **Extended Merchandise License**: Unlimited commercial garment runs & brand campaigns (e.g. ฿350–฿800 THB).
  - Authors can update these prices at any time via a dedicated API endpoint (`PATCH /api/artworks/[id]/licenses`).

---

## 3. Caveats & Architectural Boundaries

1. **Storage Environment**:
   - Phase 0/1 operates in a local development environment. Storage must be local filesystem (`public/uploads`), but wrapped in an abstraction layer (`StorageService`) so production can seamlessly swap in S3/GCS without refactoring business logic.
   - `.gitignore` should exclude `public/uploads/*` (except a `.gitkeep`) to avoid committing uploaded test binaries.
2. **Pre-seeded Fallback Resilience**:
   - `src/app/creators/[slug]/page.tsx` and `src/app/marketplace/page.tsx` have hardcoded fallback constants (`SEEDED_CREATORS`, `FALLBACK_ARTWORKS`). New features (banners, social links, file specs) must gracefully handle cases where database records do not yet have `CreatorStorefrontSettings` or `ArtworkFileSpec` attached.
3. **DPI Metadata Variations in Real-World Uploads**:
   - Some image exporters (e.g. Photoshop vs Canva vs Procreate) record density in pixels-per-inch (DPI) while others record pixels-per-centimeter (DPCM) or omit the EXIF/JFIF density header entirely. Sharp normalizes DPCM to DPI automatically, but for files missing density headers, strict validation must require 300 DPI metadata or reject with instructions on how to export with print resolution headers.

---

## 4. Conclusion & Phase 1 Implementation Blueprint

### 4.1 Requirement R1: Creator Onboarding & Storefront Management

#### Deliverable 1.1: Self-Service Creator Onboarding
- **Target Page**: `src/app/creator/onboarding/page.tsx` (and `src/components/portal/CreatorOnboardingForm.tsx`)
- **API Endpoint**: `POST /api/creators/register`
- **Validation**:
  - `displayName`: 2–50 characters.
  - `slug`: Unique lowercase alphanumeric with hyphens (`/^[a-z0-9-]+$/`), 3–30 characters.
  - `bio`: Max 500 characters.
  - `avatarUrl`: URL string or image upload.
  - `bannerUrl`: URL string or image upload.
  - `socialLinks`: Twitter/X, Instagram, Website.
  - `payoutDetails`: PromptPay ID or Bank Account info.
- **Audit Logging**: Emits `AuditEvent` with `action: 'CREATOR_REGISTERED'`.

#### Deliverable 1.2: Enhanced Public Storefront (`/creators/[slug]`)
- **Target Page**: `src/app/creators/[slug]/page.tsx`
- **Enhancements**:
  - Render full-bleed banner header (`settings.bannerUrl` or dynamic kraft/ink banner).
  - Dynamic verification badge tied to `settings.verifiedBadge`.
  - Social media icon row (Twitter, Instagram, Portfolio) using Lucide icons.
  - Curated/Featured Artworks section highlighted above the general catalog.
  - Commercial licensing tier cards on each artwork item.

---

### 4.2 Requirement R2: Graphic Asset Upload & Validation Engine

#### Deliverable 2.1: Modular Storage Abstraction
- **File**: `src/lib/storage.ts`
- **Interface**:
  ```ts
  export interface StorageService {
    saveMaster(buffer: Buffer, filename: string, mimeType: string): Promise<{ storageKey: string; relativeUrl: string; absolutePath: string }>;
    savePreview(buffer: Buffer, filename: string, mimeType: string): Promise<{ storageKey: string; relativeUrl: string; absolutePath: string }>;
    getMasterBuffer(storageKey: string): Promise<Buffer>;
    deleteFile(storageKey: string): Promise<void>;
  }
  ```
- **Implementation**: `LocalStorageService` targeting `public/uploads/masters` and `public/uploads/previews`.

#### Deliverable 2.2: Graphic Asset Validation & Watermarking Engine
- **File**: `src/lib/assetValidation.ts`
- **Validation Rules**:
  1. **Format Check**: PNG, SVG, TIFF, JPEG allowed.
  2. **Transparency Check**: If PNG, `hasAlpha === true`. Non-transparent PNGs rejected with descriptive error.
  3. **Resolution / DPI Check**: For raster, `density >= 300`. For SVG, `isVector === true` (passes resolution check automatically).
  4. **Aspect Ratio & Dimensions**: Minimum 1000px on smallest dimension for raster; aspect ratio within `[0.2, 5.0]`.
  5. **File Size**: Max 50MB for raster, 10MB for SVG.
- **Watermarking Pipeline**:
  - Generates SVG overlay watermark: `"APE-PAREL • ROYALTY PROTECTED"` rotated diagonally with semi-transparent alpha.
  - Resizes preview to max 1024x1024 without altering master image.

#### Deliverable 2.3: Upload API & Licensing Management
- **Endpoints**:
  - `POST /api/artworks/upload` (multipart/form-data): Uploads file, validates, stores master & preview, creates `Artwork`, `ArtworkFileSpec`, and default `LicenseOption` tiers (Standard, Commercial, Extended). Emits `AuditEvent` (`ARTWORK_UPLOADED`).
  - `PATCH /api/artworks/[id]/licenses`: Allows creator to update THB prices for Standard, Commercial, and Extended tiers. Emits `AuditEvent` (`ARTWORK_PRICES_ADJUSTED`).
- **Creator Upload UI**:
  - `src/app/creator/artworks/new/page.tsx` with drag-and-drop file uploader, real-time client-side pre-flight format validation, and THB license price inputs.

---

### 4.3 Database Schema Blueprint (R4)
Add to `prisma/schema.prisma`:
```prisma
model CreatorStorefrontSettings {
  id                 String         @id @default(cuid())
  creatorId          String         @unique
  creator            CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  bannerUrl          String?
  themeColor         String?        @default("#131718")
  headline           String?
  socialTwitter      String?
  socialInstagram    String?
  socialPortfolio    String?
  featuredArtworkIds String?        // JSON array of featured artwork IDs
  verifiedBadge      Boolean        @default(true)
  badgeType          String         @default("VERIFIED_CREATOR")
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
}

model ArtworkFileSpec {
  id               String   @id @default(cuid())
  artworkId        String   @unique
  artwork          Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  storageKey       String
  originalFileName String
  fileSizeBytes    Int
  mimeType         String
  format           String
  widthPx          Int
  heightPx         Int
  dpi              Int      @default(300)
  isVector         Boolean  @default(false)
  hasTransparency  Boolean  @default(true)
  aspectRatio      Float
  colorSpace       String?  @default("sRGB")
  watermarkUrl     String
  storagePath      String
  checksumSha256   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

---

## 5. Verification Method

### 5.1 Independent Verification Commands
1. **Regression Safety Check**:
   ```powershell
   npm test
   ```
   *Expectation*: All 268 baseline tests pass across all 13 test suites.
2. **TypeScript Compilation Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expectation*: Exit code 0, zero diagnostic errors.
3. **Production Build Verification**:
   ```powershell
   npm run build
   ```
   *Expectation*: All routes compile and generate successfully.
4. **New Test Suite Additions for Phase 1**:
   - `src/lib/__tests__/asset_upload_validation.test.ts`:
     - Test 300 DPI transparent PNG -> PASS.
     - Test 72 DPI PNG -> REJECT (DPI too low).
     - Test non-transparent PNG -> REJECT (Missing alpha channel).
     - Test SVG vector -> PASS (Vector exempt from DPI raster check).
     - Test 300 DPI TIFF & JPEG -> PASS.
     - Test watermarked preview generation and master asset separation.
   - `src/lib/__tests__/creator_storefront_onboarding.test.ts`:
     - Test creator registration with unique slug -> PASS.
     - Test duplicate slug rejection -> REJECT with 400.
     - Test custom license price update (Standard, Commercial, Extended) -> PASS.
     - Test audit event generation -> PASS.

### 5.2 Invalidation Conditions
This architecture proposal is invalidated if:
1. Sharp native binaries fail to load or compile on the runtime host.
2. Any schema changes cause breaking regressions in existing order or pricing benchmark tests.
3. Master files are publicly accessible without authentication or watermark protection.
