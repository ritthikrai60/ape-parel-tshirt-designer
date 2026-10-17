# Architectural Survey & Schema Handoff Report: R4 Database Expansion & Financial Accounting Engine

- **Agent**: `explorer_survey_gen4_1`
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_gen4_1`
- **Milestone**: Phase 0: Survey & Codebase Mapping - Database & Schema Architecture
- **Date**: 2026-10-10T05:24:00Z
- **Reference**: `ORIGINAL_REQUEST.md` (Latest Section `## 2026-10-10T05:13:06Z`)

---

## 1. Observation

### A. Current Project State & Verification Baseline
1. **Test Runner & Baseline Tests**:
   - Tool execution: `npm test` (`vitest run`).
   - Verbatim result:
     ```
     Test Files  13 passed (13)
          Tests  268 passed (268)
       Duration  6.49s
     ```
   - All 268 baseline tests across 13 test suites pass cleanly.
2. **TypeScript Compilation**:
   - Tool execution: `npx tsc --noEmit`.
   - Verbatim result: Exited with code `0`, zero compiler errors or type warnings.
3. **Database Configuration & Validation**:
   - `package.json:11-12`:
     ```json
     "db:push": "prisma db push",
     "db:seed": "node prisma/seed.mjs",
     ```
   - `.env:1`: `DATABASE_URL="file:./dev.db"`.
   - Tool execution: `npx prisma validate`.
     ```
     The schema at prisma\schema.prisma is valid
     ```

### B. Existing Prisma Schema Models (`prisma/schema.prisma:1-246`)
The existing schema defines 14 models:
1. `User` (lines 10-22): Core actor table with roles `CUSTOMER`, `CREATOR`, `SUPPLIER`, `ADMIN`. Has relations to `CreatorProfile?`, `SupplierProfile?`, `DesignDocument[]`, `Order[]`, and `AuditEvent[]`.
2. `CreatorProfile` (lines 24-37):
   ```prisma
   model CreatorProfile {
     id            String    @id @default(cuid())
     userId        String    @unique
     user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
     slug          String    @unique
     displayName   String
     bio           String?
     avatarUrl     String?
     website       String?
     payoutDetails String?   // Private: strictly guarded in public DTOs
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     artworks      Artwork[]
   }
   ```
3. `SupplierProfile` (lines 39-57): Verified manufacturing blanks and printing services.
4. `Artwork` (lines 59-76):
   ```prisma
   model Artwork {
     id               String              @id @default(cuid())
     creatorId        String
     creator          CreatorProfile      @relation(fields: [creatorId], references: [id], onDelete: Cascade)
     title            String
     description      String?
     category         String              @default("ILLUSTRATION")
     previewUrl       String
     originalUrl      String?
     mimeType         String              @default("image/png")
     tags             String?
     status           String              @default("PUBLISHED")
     moderationStatus String              @default("APPROVED")
     createdAt        DateTime            @default(now())
     updatedAt        DateTime            @updatedAt
     licenseOptions   LicenseOption[]
     obligations      RoyaltyObligation[]
   }
   ```
5. `LicenseOption` (lines 78-90): Per-artwork commercial and garment print license pricing in THB (`price: Int`).
6. `GarmentProduct` & `GarmentVariant` (lines 92-124): Blanks catalog (`basePrice: 150`, `packagingPrice: 15`, `shippingPrice: 40`).
7. `PrintingService` (lines 126-140): DTG printing pricing (`pricePerSurface: 80`).
8. `DesignDocument` (lines 142-162): Design canvas elements and placements.
9. `Order` (lines 164-192): Authoritative order record with cost breakdown (`garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, `totalAmount`).
10. `RoyaltyObligation` (lines 194-210): Per-order license fee liability created atomically on checkout (`unitRoyalty: Int`, `quantity: Int`, `totalAmount: Int`, `status: PENDING | ELIGIBLE | SETTLED | CANCELLED`).
11. `RoyaltyLedgerEntry` (lines 212-223): Immutable running-balance ledger for creators:
    ```prisma
    model RoyaltyLedgerEntry {
      id           String             @id @default(cuid())
      creatorId    String
      obligationId String?
      obligation   RoyaltyObligation? @relation(fields: [obligationId], references: [id], onDelete: SetNull)
      entryType    String // EARNING, PAYOUT_SETTLEMENT, ADJUSTMENT
      amount       Int // in THB (positive or negative)
      balanceAfter Int // in THB
      reference    String?
      notes        String?
      createdAt    DateTime           @default(now())
    }
    ```
12. `CreatorSettlement` (lines 225-234): Aggregated payout settlement record (`settlementNumber: String @unique`, `totalAmount: Int`, `status: String`, `payoutReference: String?`).
13. `AuditEvent` (lines 236-245):
    ```prisma
    model AuditEvent {
      id         String   @id @default(cuid())
      userId     String?
      user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
      action     String
      entityType String
      entityId   String?
      payload    String? // JSON string
      createdAt  DateTime @default(now())
    }
    ```

### C. Seed Data Sequence (`prisma/seed.mjs:8-23`)
The seed script wipes and repopulates the SQLite database in strict reverse dependency order:
```javascript
// Clean existing records in sequence
await prisma.auditEvent.deleteMany();
await prisma.creatorSettlement.deleteMany();
await prisma.royaltyLedgerEntry.deleteMany();
await prisma.royaltyObligation.deleteMany();
await prisma.order.deleteMany();
await prisma.designDocument.deleteMany();
await prisma.printingService.deleteMany();
await prisma.garmentVariant.deleteMany();
await prisma.garmentProduct.deleteMany();
await prisma.licenseOption.deleteMany();
await prisma.artwork.deleteMany();
await prisma.supplierProfile.deleteMany();
await prisma.creatorProfile.deleteMany();
await prisma.user.deleteMany();
```
The seed populates:
- 1 Admin User, 1 Customer User.
- 3 Creators: `dash-ape` (Dash Ape Studio), `cyber-monk` (Cyber Monk), `soma-botanica` (Soma Botanica).
- 2 Suppliers: `bangkok-garment-craft` (Bangkok Garment Craft Co.), `siam-textile-mill` (Siam Textile Mill).
- 5 Benchmark Artworks (with licenses ฿40, ฿60, ฿25, ฿50, ฿45).
- 1 Pre-seeded benchmark Order (`APX-ORD-9021`, total ฿410) with 3 obligations and 3 initial ledger entries.

### D. Existing AuditEvent & Ledger Usage in Codebase
1. In `src/lib/royalties.ts:312-328`:
   ```typescript
   await tx.auditEvent.create({
     data: {
       action: 'ROYALTY_PAYOUT_SETTLED',
       entityType: 'CreatorSettlement',
       entityId: settlement.id,
       payload: JSON.stringify({
         settlementNumber,
         creatorId: canonicalCreatorId,
         totalAmount: totalPayoutAmount,
         settledObligationIds: obligationIdsToSettle,
         balanceBefore,
         balanceAfter,
         payoutReference: options.payoutRef ?? null,
         ledgerEntryId: ledgerEntry.id,
       }),
     },
   });
   ```
2. In `src/lib/__tests__/orders_royalties.test.ts:519-524`:
   ```typescript
   const dbAuditEvent = await prisma.auditEvent.findFirst({
     where: { entityType: 'CreatorSettlement', entityId: result.settlementId },
   });
   expect(dbAuditEvent).not.toBeNull();
   expect(dbAuditEvent?.action).toBe('ROYALTY_PAYOUT_SETTLED');
   ```
3. In `src/lib/__tests__/portals_marketplace_challenger.test.ts:160-165`:
   Verifies order status transitions generate immutable `AuditEvent` records with `entityType: 'Order'`, `entityId`, `action: 'ORDER_STATUS_UPDATED'`, and `payload`.

---

## 2. Logic Chain

### Step 1: Backward Compatibility is the Paramount Constraint
- Observation: 268 baseline tests run and pass without error. Multiple tests (`orders_royalties.test.ts`, `challenger_m5_pricing_ledger.test.ts`, `orders_royalties_challenger.test.ts`) assert exact properties of `RoyaltyLedgerEntry` (`entryType: 'EARNING'`, `amount`, `balanceAfter`), `RoyaltyObligation`, and `AuditEvent` (`action`, `entityType`, `entityId`, `payload`).
- Deduction: Schema modifications must be **strictly additive**. Existing columns and relation names must not be removed, altered to incompatible types, or made non-nullable without defaults.

### Step 2: Architecture of CreatorStorefrontSettings
- Requirements: Custom store slug, bio, banner, avatar, social links, theme/branding preferences, featured artworks.
- Deduction:
  - Add `CreatorStorefrontSettings` model with 1-to-1 relation to `CreatorProfile` via `@unique creatorId`.
  - In `CreatorProfile`, declare `storefrontSettings CreatorStorefrontSettings?`.
  - Because it is optional, existing queries like `prisma.creatorProfile.findUnique({ where: { slug } })` remain completely unaffected unless explicitly included.
  - Social links, theme preferences, and featured artworks can be flexibly stored as JSON strings with structured TypeScript helper schemas.

### Step 3: Architecture of ArtworkFileSpec
- Requirements: Storage path, mime type, dimensions (width, height, DPI), color space, hasTransparency, isVector, previewWatermarkedPath, fileSize.
- Deduction:
  - Add `ArtworkFileSpec` model with 1-to-1 relation to `Artwork` via `@unique artworkId`.
  - In `Artwork`, declare `fileSpec ArtworkFileSpec?`.
  - Existing artwork tests (which call `prisma.artwork.create` without `fileSpec`) continue to succeed without failure because the foreign key is on `ArtworkFileSpec` and the relation is optional on `Artwork`.

### Step 4: Architecture of CommissionRule
- Requirements: Rule name, platform rate (e.g. 15%), creator rate (e.g. 85%), active status, effective dates.
- Deduction:
  - Add `CommissionRule` model with unique `name: String`, `platformRate: Float @default(0.15)`, `creatorRate: Float @default(0.85)`, `isActive: Boolean @default(true)`, `effectiveFrom: DateTime @default(now())`, `effectiveTo: DateTime?`.
  - Store rates as decimal fractions (`0.15` and `0.85`), with documentation and getters supporting percentage representation (`15%` and `85%`).

### Step 5: Architecture of FinancialAccount & Double-Entry Accounting
- Requirements:
  - Accounts for `CREATOR`, `PLATFORM`, and `ESCROW`.
  - Immutable double-entry bookkeeping tracking GMV, 15% platform commission deductions, 85% creator royalty accruals, and payout disbursements.
  - Acceptance criterion: `Reconciliation engine verifies sum(Credits) - sum(Debits) = Current Balance for every creator ledger.`
- Deduction:
  - Add `FinancialAccount` model with:
    - `accountType: String` (`CREATOR`, `PLATFORM`, `ESCROW`).
    - `accountNumber: String @unique` (e.g. `ACC-CREATOR-dash-ape`, `ACC-PLATFORM-REVENUE`, `ACC-ESCROW-HOLDING`).
    - `balance: Int @default(0)` (in THB).
    - `currency: String @default("THB")`.
    - `creatorId: String? @unique` (links 1-to-1 to `CreatorProfile` for creator accounts, null for system accounts).
  - To implement true double-entry bookkeeping where `sum(Credits) - sum(Debits) = Current Balance`, pair `FinancialAccount` with `JournalEntry`:
    - `accountId: String -> FinancialAccount`.
    - `entryType: String` (`DEBIT` or `CREDIT`).
    - `amount: Int` (THB).
    - `balanceAfter: Int`.
    - `orderId: String? -> Order`.
    - `reference: String?`.
  - Transaction Mechanics:
    - Order placed with artwork licensing fee (e.g. 100 THB GMV):
      - Escrow: Credit 100 THB.
      - Upon settlement/allocation:
        - Escrow: Debit 100 THB.
        - Platform Account: Credit 15 THB (15% commission).
        - Creator Account: Credit 85 THB (85% royalty).
      - Invariant: `Credit(15) + Credit(85) = Debit(100)`. Balanced to zero.
    - Creator Payout of 85 THB:
      - Creator Account: Debit 85 THB -> New Balance = 85 - 85 = 0.
    - Creator Account verification:
      - `Credits = [85]`, `Debits = [85]`.
      - `sum(Credits) - sum(Debits) = 85 - 85 = 0 == balance`. Verified!
  - Coexistence with `RoyaltyLedgerEntry`:
    - `RoyaltyLedgerEntry` continues to record `EARNING` and `PAYOUT_SETTLEMENT` exactly as tested by the 268 baseline tests.
    - `FinancialAccount` and `JournalEntry` provide the robust double-entry enterprise accounting foundation.

### Step 6: Architecture of ReconciliationReport
- Requirements: Period, total GMV, total commission, total creator royalties, matched items count, discrepancy count, status, balance conservation verification.
- Deduction:
  - Add `ReconciliationReport` model:
    - `period: String` (e.g. `2026-10`, `2026-W41`).
    - `periodStart: DateTime?`, `periodEnd: DateTime?`.
    - `totalGmv: Int @default(0)`.
    - `totalCommission: Int @default(0)`.
    - `totalCreatorRoyalties: Int @default(0)`.
    - `matchedItemsCount: Int @default(0)`.
    - `discrepancyCount: Int @default(0)`.
    - `status: String @default("BALANCED")` (`BALANCED`, `DISCREPANCY`, `PENDING`, `RECONCILED`).
    - `balanceConservationVerified: Boolean @default(true)`.
    - `discrepancyDetails: String?` (JSON diagnostic breakdown if discrepancies occur).
    - `generatedBy: String?` (`SYSTEM` or actor user ID).

### Step 7: Architecture of AuditEvent Alignment
- Requirements: `entityType`, `entityId`, `action`, `actorId`, `details/metadata JSON`, `timestamp`.
- Existing Model: `userId` (relation to User), `action`, `entityType`, `entityId`, `payload`, `createdAt`.
- Deduction:
  - Keep `userId` and `payload` for 100% backwards compatibility with existing test suites and `src/lib/royalties.ts`.
  - Add `actorId String?` (allows system or non-user actor identifiers like `'SYSTEM'` or `'RECONCILIATION_ENGINE'`).
  - Add `metadata String?` (optional field alongside `payload`).
  - `createdAt DateTime @default(now())` serves as the authoritative timestamp.

---

## 3. Caveats

1. **SQLite Database Constraints & Alterations**:
   - The project uses SQLite (`prisma/dev.db`). In SQLite, modifying existing column constraints or dropping columns can trigger table rebuilds. Because our proposed schema is **purely additive** (new models and optional relations), `prisma db push` operates cleanly without requiring table rebuilds of core existing data.
2. **Monetary Integer Representation**:
   - All monetary amounts in the schema (`basePrice`, `price`, `totalAmount`, `amount`, `balance`) are stored as `Int` representing whole Thai Baht (THB).
   - Platform commission calculations (15% of 25 THB = 3.75 THB) should be rounded systematically (e.g. standard rounding or integer cents) in the reconciliation engine to prevent fractional THB storage in integer columns.
3. **Seed Teardown Order**:
   - Any new models (`CreatorStorefrontSettings`, `ArtworkFileSpec`, `JournalEntry`, `FinancialAccount`, `CommissionRule`, `ReconciliationReport`) must be added to the top of `prisma/seed.mjs`'s `deleteMany()` sequence before their parent tables are deleted, avoiding SQLite foreign key constraint errors during reseeding.

---

## 4. Conclusion & Complete Schema Architecture Proposal

### A. Proposed Prisma Schema Extensions

Below is the complete, drop-in Prisma schema additions to be appended to `prisma/schema.prisma`:

```prisma
// ============================================================================
// RELATION ADDITIONS TO EXISTING MODELS
// ============================================================================

// In model CreatorProfile:
//   storefrontSettings CreatorStorefrontSettings?
//   financialAccount   FinancialAccount?

// In model Artwork:
//   fileSpec           ArtworkFileSpec?

// In model Order:
//   journalEntries     JournalEntry[]

// In model AuditEvent:
//   actorId            String?
//   metadata           String?

// ============================================================================
// NEW R4 MODELS
// ============================================================================

model CreatorStorefrontSettings {
  id                 String         @id @default(cuid())
  creatorId          String         @unique
  creator            CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  customSlug         String?        @unique
  bio                String?
  bannerUrl          String?
  avatarUrl          String?
  socialLinks        String?        // JSON string: { instagram, twitter, behance, tiktok, youtube }
  themePreferences   String?        // JSON string: { primaryColor, accentColor, font, mode }
  featuredArtworkIds String?        // JSON string array of artwork IDs: ["art_1", "art_2"]
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
}

model ArtworkFileSpec {
  id                     String   @id @default(cuid())
  artworkId              String   @unique
  artwork                Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  storagePath            String   // Local filesystem path e.g. public/uploads/masters/[id].png
  mimeType               String   // image/png, image/svg+xml, image/tiff, image/jpeg
  width                  Int      // Width in pixels
  height                 Int      // Height in pixels
  dpi                    Int      @default(300) // Minimum 300 DPI (or 0 for vector)
  colorSpace             String   @default("sRGB") // sRGB, Display P3, CMYK
  hasTransparency        Boolean  @default(false)
  isVector               Boolean  @default(false)
  previewWatermarkedPath String?  // Watermarked public preview path
  fileSize               Int      // File size in bytes
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model CommissionRule {
  id            String    @id @default(cuid())
  name          String    @unique // e.g. "STANDARD_15_85", "EXCLUSIVE_CREATOR_TIER"
  platformRate  Float     @default(0.15) // 15% platform commission rate
  creatorRate   Float     @default(0.85) // 85% creator royalty share rate
  isActive      Boolean   @default(true)
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  description   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model FinancialAccount {
  id            String          @id @default(cuid())
  accountType   String          // CREATOR, PLATFORM, ESCROW
  accountNumber String          @unique // e.g. "ACC-CREATOR-dash-ape", "ACC-PLATFORM-REVENUE", "ACC-ESCROW-HOLDING"
  balance       Int             @default(0) // In THB
  currency      String          @default("THB")
  creatorId     String?         @unique
  creator       CreatorProfile? @relation(fields: [creatorId], references: [id], onDelete: SetNull)
  status        String          @default("ACTIVE") // ACTIVE, FROZEN, CLOSED
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  journalEntries JournalEntry[]
}

model JournalEntry {
  id           String           @id @default(cuid())
  accountId    String
  account      FinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  entryType    String           // DEBIT, CREDIT
  amount       Int              // In THB (positive integer)
  balanceAfter Int              // Balance of this account after this transaction
  orderId      String?
  order        Order?           @relation(fields: [orderId], references: [id], onDelete: SetNull)
  reference    String?          // e.g. orderNumber, settlementNumber
  description  String?
  createdAt    DateTime         @default(now())
}

model ReconciliationReport {
  id                          String    @id @default(cuid())
  period                      String    // e.g. "2026-10", "2026-W41"
  periodStart                 DateTime?
  periodEnd                   DateTime?
  totalGmv                    Int       @default(0) // Gross Merchandise Value in THB
  totalCommission             Int       @default(0) // Total 15% platform commission
  totalCreatorRoyalties       Int       @default(0) // Total 85% creator royalties
  matchedItemsCount           Int       @default(0)
  discrepancyCount            Int       @default(0)
  status                      String    @default("BALANCED") // BALANCED, DISCREPANCY, PENDING, RECONCILED
  balanceConservationVerified Boolean   @default(true) // Verified sum(Credits) == sum(Debits)
  discrepancyDetails          String?   // JSON diagnostics if discrepancy detected
  generatedBy                 String?   // User ID or "SYSTEM"
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt
}
```

### B. Seed Script Teardown & Population Additions (`prisma/seed.mjs`)
1. **Teardown additions** at start of `main()`:
   ```javascript
   await prisma.reconciliationReport.deleteMany();
   await prisma.journalEntry.deleteMany();
   await prisma.financialAccount.deleteMany();
   await prisma.commissionRule.deleteMany();
   await prisma.artworkFileSpec.deleteMany();
   await prisma.creatorStorefrontSettings.deleteMany();
   ```
2. **CommissionRule seeding**:
   ```javascript
   await prisma.commissionRule.create({
     data: {
       name: 'STANDARD_15_85',
       platformRate: 0.15,
       creatorRate: 0.85,
       isActive: true,
       description: 'Standard ape-parel marketplace commission split (15% platform, 85% creator).',
     },
   });
   ```
3. **FinancialAccount seeding**:
   - Seed Platform Account: `accountType: 'PLATFORM'`, `accountNumber: 'ACC-PLATFORM-REVENUE'`.
   - Seed Escrow Account: `accountType: 'ESCROW'`, `accountNumber: 'ACC-ESCROW-HOLDING'`.
   - Seed Creator Accounts for `creator1` (Dash Ape), `creator2` (Cyber Monk), and `creator3` (Soma Botanica).
4. **CreatorStorefrontSettings seeding**:
   - Seed customized banners, theme preferences (`#131718` / `#DABA98`), social links (`instagram`, `twitter`), and featured artwork arrays for the 3 creators.
5. **ArtworkFileSpec seeding**:
   - Seed 300 DPI specs with valid dimensions (`width: 3000`, `height: 3000`, `dpi: 300`, `hasTransparency: true`, `mimeType: 'image/png'`, `fileSize: 2450000`) for the 5 seeded artworks.

---

## 5. Verification Method

To independently verify this schema architecture:

1. **Prisma Schema Validation**:
   ```powershell
   npx prisma validate
   ```
   *Expected result*: `The schema at prisma\schema.prisma is valid`.

2. **Database Push & Client Generation**:
   ```powershell
   npx prisma db push
   npx prisma generate
   ```
   *Expected result*: Tables `CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `JournalEntry`, and `ReconciliationReport` created in `dev.db`, and `@prisma/client` types generated.

3. **Database Seed Execution**:
   ```powershell
   node prisma/seed.mjs
   ```
   *Expected result*: Seed executes to completion with `--- SEEDING COMPLETED SUCCESSFULLY ---`.

4. **TypeScript Compiler Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, zero type errors.

5. **Existing Regression Test Suite**:
   ```powershell
   npm test
   ```
   *Expected result*: All 13 test files and all 268 existing tests pass without regression.

6. **Invalidation Conditions**:
   - Making any relation mandatory on existing models (e.g. `storefrontSettings CreatorStorefrontSettings` without `?` on `CreatorProfile`), which would cause existing test records or seed insertions to fail.
   - Renaming or deleting `RoyaltyLedgerEntry` fields (`entryType`, `amount`, `balanceAfter`), which would invalidate the 268 baseline tests.
   - Removing `userId` or `payload` from `AuditEvent`, which would break `src/lib/royalties.ts` and portal test suites.
