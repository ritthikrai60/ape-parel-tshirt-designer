# Milestone M1 Exploration & Schema Specification Handoff Report

- **Agent**: `explorer_m1_gen4_1`
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen4_1`
- **Milestone**: M1 (Database Schema Expansion & Audit Infrastructure)
- **Date**: 2026-10-10T05:37:00Z
- **Reference**: `ORIGINAL_REQUEST.md` (latest section `## 2026-10-10T05:13:06Z`), `orchestrator_4/PROJECT.md`

---

## 1. Observation

### A. Current Project State & Test Baseline
1. `npm test` (`vitest run`):
   - Verbatim execution output:
     ```
     Test Files  13 passed (13)
          Tests  268 passed (268)
       Duration  6.35s
     ```
   - All 268 tests pass cleanly across 13 test suites.
2. `npx tsc --noEmit`:
   - Exited with code `0`, zero TypeScript compilation errors.
3. Database configuration in `.env` and `prisma/schema.prisma`:
   - `.env:1`: `DATABASE_URL="file:./dev.db"`
   - `prisma/schema.prisma:1-8`:
     ```prisma
     datasource db {
       provider = "sqlite"
       url      = env("DATABASE_URL")
     }

     generator client {
       provider = "prisma-client-js"
     }
     ```

### B. Existing Target Models in `prisma/schema.prisma`
1. `User` (`prisma/schema.prisma:10-22`):
   ```prisma
   model User {
     id              String           @id @default(cuid())
     email           String           @unique
     name            String
     role            String           @default("CUSTOMER") // CUSTOMER, CREATOR, SUPPLIER, ADMIN
     createdAt       DateTime         @default(now())
     updatedAt       DateTime         @updatedAt
     creatorProfile  CreatorProfile?
     supplierProfile SupplierProfile?
     designs         DesignDocument[]
     orders          Order[]
     auditEvents     AuditEvent[]
   }
   ```
2. `CreatorProfile` (`prisma/schema.prisma:24-37`):
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
     payoutDetails String?
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     artworks      Artwork[]
   }
   ```
3. `Artwork` (`prisma/schema.prisma:59-76`):
   ```prisma
   model Artwork {
     id               String              @id @default(cuid())
     creatorId        String
     creator          CreatorProfile      @relation(fields: [creatorId], references: [id], onDelete: Cascade)
     title            String
     description      String?
     category         String              @default("ILLUSTRATION") // MASCOT, TYPOGRAPHY, ILLUSTRATION, PATTERN, LOGO
     previewUrl       String
     originalUrl      String?
     mimeType         String              @default("image/png")
     tags             String?
     status           String              @default("PUBLISHED") // DRAFT, PUBLISHED, ARCHIVED
     moderationStatus String              @default("APPROVED") // PENDING, APPROVED, REJECTED
     createdAt        DateTime            @default(now())
     updatedAt        DateTime            @updatedAt
     licenseOptions   LicenseOption[]
     obligations      RoyaltyObligation[]
   }
   ```
4. `Order` (`prisma/schema.prisma:164-192`):
   ```prisma
   model Order {
     id              String              @id @default(cuid())
     orderNumber     String              @unique
     customerId      String?
     customer        User?               @relation(fields: [customerId], references: [id], onDelete: SetNull)
     designId        String
     design          DesignDocument      @relation(fields: [designId], references: [id])
     supplierId      String
     supplier        SupplierProfile     @relation(fields: [supplierId], references: [id])
     quantity        Int                 @default(1)
     status          String              @default("PAYMENT_CONFIRMED")
     ...
     obligations     RoyaltyObligation[]
   }
   ```
5. `AuditEvent` (`prisma/schema.prisma:236-245`):
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
   Direct codebase usages observed:
   - `src/lib/royalties.ts:312-328`: calls `tx.auditEvent.create({ data: { action: 'ROYALTY_PAYOUT_SETTLED', entityType: 'CreatorSettlement', entityId, payload } })`.
   - `src/app/api/orders/[id]/route.ts:148-160`: calls `tx.auditEvent.create({ data: { action: 'ORDER_STATUS_UPDATED', entityType: 'Order', entityId, payload } })`.
   - `src/lib/__tests__/orders_royalties.test.ts:519-524`: asserts `expect(dbAuditEvent?.action).toBe('ROYALTY_PAYOUT_SETTLED')`.
   - `src/lib/__tests__/portals_marketplace_challenger.test.ts:160-165`: asserts `expect(audit?.action).toBe('ORDER_STATUS_UPDATED')`.

### C. Seed Script Dependency Sequence (`prisma/seed.mjs:8-23`)
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

### D. Validation Execution on Proposed Schema
- We authored the complete proposed schema at:
  `.agents/teamwork/explorer_m1_gen4_1/proposed_schema.prisma`
- Tool execution: `npx prisma validate --schema=".agents/teamwork/explorer_m1_gen4_1/proposed_schema.prisma"`
- Verbatim result:
  ```
  Environment variables loaded from .env
  Prisma schema loaded from .agents\teamwork\explorer_m1_gen4_1\proposed_schema.prisma
  The schema at .agents\teamwork\explorer_m1_gen4_1\proposed_schema.prisma is valid 🚀
  ```

---

## 2. Logic Chain

### Step 1: Guaranteeing 100% Backwards Compatibility
- **Observation**: 268 existing tests depend on existing models and schema definitions. In particular, existing queries call `prisma.creatorProfile.create`, `prisma.artwork.create`, and `prisma.order.create` without supplying any of the new R4 fields.
- **Deduction**: All new relation attributes on existing models must be **strictly optional**:
  - `CreatorProfile`: `storefrontSettings CreatorStorefrontSettings?` (optional 1:1) and `financialAccount FinancialAccount?` (optional 1:1).
  - `Artwork`: `fileSpec ArtworkFileSpec?` (optional 1:1).
  - `Order`: `journalEntries JournalEntry[]` (empty array by default).
  - `User`: No new relation required (or only optional).
- **Result**: Zero runtime regressions or test failures on existing model operations.

### Step 2: Relation Design & Cascade Rules
- **CreatorStorefrontSettings (1:1 with CreatorProfile)**:
  - Foreign key: `creatorId String @unique` on `CreatorStorefrontSettings`.
  - Referential action: `onDelete: Cascade`. If a `CreatorProfile` is deleted, its storefront settings have no standalone domain existence and must be deleted.
- **ArtworkFileSpec (1:1 with Artwork)**:
  - Foreign key: `artworkId String @unique` on `ArtworkFileSpec`.
  - Referential action: `onDelete: Cascade`. If an `Artwork` is deleted, its technical file specification must be deleted.
- **FinancialAccount**:
  - Account types: `CREATOR`, `PLATFORM`, `ESCROW`.
  - System accounts (`PLATFORM`, `ESCROW`) have `creatorId = null`.
  - Creator accounts have `creatorId String? @unique` linking to `CreatorProfile`.
  - Referential action: `onDelete: Cascade`. If a creator profile is purged (such as in test teardown), its financial account and nested journal entries are purged without leaving orphaned constraints.
- **JournalEntry**:
  - Account relation: `accountId String`, `onDelete: Cascade`.
  - Order relation: `orderId String?`, `order Order? @relation(fields: [orderId], references: [id], onDelete: SetNull)`.
  - Rationale: If an order record is cancelled or removed, ledger accounting records must NEVER be deleted; the foreign key `orderId` is safely nulled (`onDelete: SetNull`).
- **CommissionRule & ReconciliationReport**:
  - Standalone domain tables with no direct cascading foreign keys.

### Step 3: Exact Model Field Specifications
- **`CreatorStorefrontSettings`**:
  - `id String @id @default(cuid())`
  - `creatorId String @unique`
  - `creator CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)`
  - `customSlug String? @unique`
  - `bio String?`
  - `bannerUrl String?`
  - `avatarUrl String?`
  - `socialLinks String?` (JSON string: `{ instagram, twitter, behance, tiktok, youtube, website }`)
  - `themePreferences String?` (JSON string: `{ primaryColor, accentColor, font, mode }`)
  - `featuredArtworkIds String?` (JSON string array: `["art_1", "art_2"]`)
  - `badgeVerified Boolean @default(false)`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **`ArtworkFileSpec`**:
  - `id String @id @default(cuid())`
  - `artworkId String @unique`
  - `artwork Artwork @relation(fields: [artworkId], references: [id], onDelete: Cascade)`
  - `storagePath String` (Local filesystem path e.g. `public/uploads/masters/[id].png`)
  - `storageKey String?` (Storage abstraction key e.g. `masters/[id].png`)
  - `mimeType String` (`image/png`, `image/svg+xml`, `image/tiff`, `image/jpeg`)
  - `width Int` (pixel width)
  - `height Int` (pixel height)
  - `dpi Int @default(300)` (Minimum 300 DPI, or 0 for vector SVG)
  - `colorSpace String @default("sRGB")` (`sRGB`, `Display P3`, `CMYK`)
  - `hasTransparency Boolean @default(false)` (True for transparent PNG)
  - `isVector Boolean @default(false)` (True for SVG)
  - `previewWatermarkedPath String?` (Watermarked public preview path)
  - `fileSize Int` (Bytes)
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **`CommissionRule`**:
  - `id String @id @default(cuid())`
  - `name String @unique` (`"STANDARD_15_85"`, `"EXCLUSIVE_CREATOR_TIER"`)
  - `platformRate Float @default(0.15)`
  - `creatorRate Float @default(0.85)`
  - `isActive Boolean @default(true)`
  - `effectiveFrom DateTime @default(now())`
  - `effectiveTo DateTime?`
  - `description String?`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **`FinancialAccount`**:
  - `id String @id @default(cuid())`
  - `accountType String` (`CREATOR`, `PLATFORM`, `ESCROW`)
  - `accountNumber String @unique` (`"ACC-CREATOR-dash-ape"`, `"ACC-PLATFORM-REVENUE"`, `"ACC-ESCROW-HOLDING"`)
  - `balance Int @default(0)` (in THB)
  - `currency String @default("THB")`
  - `creatorId String? @unique`
  - `creator CreatorProfile? @relation(fields: [creatorId], references: [id], onDelete: Cascade)`
  - `status String @default("ACTIVE")` (`ACTIVE`, `FROZEN`, `CLOSED`)
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
  - `journalEntries JournalEntry[]`
- **`JournalEntry`**:
  - `id String @id @default(cuid())`
  - `accountId String`
  - `account FinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)`
  - `entryType String` (`DEBIT`, `CREDIT`)
  - `amount Int` (positive integer in THB)
  - `balanceAfter Int` (balance of account after entry)
  - `orderId String?`
  - `order Order? @relation(fields: [orderId], references: [id], onDelete: SetNull)`
  - `reference String?` (e.g. orderNumber, settlementNumber)
  - `description String?`
  - `createdAt DateTime @default(now())`
- **`ReconciliationReport`**:
  - `id String @id @default(cuid())`
  - `period String` (e.g. `"2026-10"`, `"2026-W41"`)
  - `periodStart DateTime?`
  - `periodEnd DateTime?`
  - `totalGmv Int @default(0)` (in THB)
  - `totalCommission Int @default(0)` (in THB)
  - `totalCreatorRoyalties Int @default(0)` (in THB)
  - `matchedItemsCount Int @default(0)`
  - `discrepancyCount Int @default(0)`
  - `status String @default("BALANCED")` (`BALANCED`, `DISCREPANCY`, `PENDING`, `RECONCILED`)
  - `balanceConservationVerified Boolean @default(true)`
  - `discrepancyDetails String?` (JSON string)
  - `generatedBy String?` (`"SYSTEM"` or actor user ID)
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **`AuditEvent`**:
  - Preserves existing fields: `userId`, `user`, `action`, `entityType`, `entityId`, `payload`, `createdAt`.
  - Adds optional fields:
    - `actorId String?` (allows system agents or non-user actor IDs like `'SYSTEM'` or `'RECONCILIATION_ENGINE'`)
    - `metadata String?` (JSON string for structured execution metadata)

### Step 4: Seed Script Teardown Alignment
- In `prisma/seed.mjs`, when deleting existing records, the new models must be added at the top of the delete sequence:
  ```javascript
  await prisma.reconciliationReport.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.artworkFileSpec.deleteMany();
  await prisma.creatorStorefrontSettings.deleteMany();
  await prisma.auditEvent.deleteMany();
  ...
  ```
- This prevents SQLite foreign key constraint errors during database seeding.

---

## 3. Caveats

1. **SQLite Type Ecosystem**:
   - SQLite does not have native enum types or native JSON column types. Consistent with the existing schema pattern (`role String @default("CUSTOMER")`, `category String @default("ILLUSTRATION")`, `frontElements String @default("[]")`), all status codes and JSON payloads are defined as `String` with default values and documented values.
2. **Double-Entry Balance Rounding**:
   - In Thai Baht integer accounting, 15% platform commission on odd amounts (e.g., 25 THB * 0.15 = 3.75 THB) must be rounded (e.g. `Math.round(25 * 0.15) = 4` THB platform, `25 - 4 = 21` THB creator). The accounting service in Milestone M4 must enforce conservation: `platformCommission + creatorShare === totalGmvLicensing`.
3. **Purely Additive Schema Changes**:
   - No columns are removed or made non-nullable without defaults. As verified, `npx prisma validate` passes with zero warnings.

---

## 4. Conclusion & Recommended Code Edits

### A. Recommended Edits for `prisma/schema.prisma`
A ready-to-apply unified patch is stored at:
`.agents/teamwork/explorer_m1_gen4_1/schema_expansion.patch`

#### Summary of Edits to Existing Models:
1. In `model CreatorProfile` (lines 36-37):
   ```prisma
     artworks           Artwork[]
   + storefrontSettings CreatorStorefrontSettings?
   + financialAccount   FinancialAccount?
   ```
2. In `model Artwork` (lines 75-76):
   ```prisma
     obligations      RoyaltyObligation[]
   + fileSpec         ArtworkFileSpec?
   ```
3. In `model Order` (lines 191-192):
   ```prisma
     obligations     RoyaltyObligation[]
   + journalEntries  JournalEntry[]
   ```
4. In `model AuditEvent` (lines 237-245):
   ```prisma
   model AuditEvent {
     id         String   @id @default(cuid())
     userId     String?
     user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
   + actorId    String?  // Optional actor identifier (user ID, 'SYSTEM', 'RECONCILIATION_ENGINE')
     action     String
     entityType String
     entityId   String?
     payload    String? // JSON string
   + metadata   String? // JSON string for additional context/telemetry
     createdAt  DateTime @default(now())
   }
   ```

#### Full New Models to Append to `prisma/schema.prisma`:
```prisma
model CreatorStorefrontSettings {
  id                 String         @id @default(cuid())
  creatorId          String         @unique
  creator            CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  customSlug         String?        @unique
  bio                String?
  bannerUrl          String?
  avatarUrl          String?
  socialLinks        String?        // JSON string: { instagram, twitter, behance, tiktok, youtube, website }
  themePreferences   String?        // JSON string: { primaryColor, accentColor, font, mode }
  featuredArtworkIds String?        // JSON string array: ["art_1", "art_2"]
  badgeVerified      Boolean        @default(false)
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
}

model ArtworkFileSpec {
  id                     String   @id @default(cuid())
  artworkId              String   @unique
  artwork                Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  storagePath            String   // Local filesystem path e.g. public/uploads/masters/[id].png
  storageKey             String?  // Storage key / relative reference e.g. masters/[id].png
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
  creator       CreatorProfile? @relation(fields: [creatorId], references: [id], onDelete: Cascade)
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

### B. Recommended Unified Audit Service Design (`src/lib/audit.ts`)
```typescript
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  payload?: any;
  metadata?: any;
}

export async function recordAuditEvent(
  input: AuditLogInput,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  return client.auditEvent.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      actorId: input.actorId ?? input.userId ?? 'SYSTEM',
      payload: input.payload ? (typeof input.payload === 'string' ? input.payload : JSON.stringify(input.payload)) : null,
      metadata: input.metadata ? (typeof input.metadata === 'string' ? input.metadata : JSON.stringify(input.metadata)) : null,
    },
  });
}
```

---

## 5. Verification Method

To independently verify this schema specification and implementation:

1. **Schema Validation**:
   ```powershell
   npx prisma validate --schema=".agents/teamwork/explorer_m1_gen4_1/proposed_schema.prisma"
   ```
   *Verified Result*: Exited with code 0: `The schema at .agents\teamwork\explorer_m1_gen4_1\proposed_schema.prisma is valid 🚀`.

2. **Application to Project Database (For Implementer)**:
   ```powershell
   # Apply schema patch to prisma/schema.prisma
   npx prisma db push
   npx prisma generate
   ```

3. **Database Seeding Execution**:
   ```powershell
   node prisma/seed.mjs
   ```
   *Expected Output*: `--- SEEDING COMPLETED SUCCESSFULLY ---`.

4. **Zero-Regression Verification**:
   ```powershell
   npx tsc --noEmit
   npm test
   ```
   *Expected Output*: Exit code 0, 13 test files passed, 268 existing tests passed.

5. **Invalidation Conditions**:
   - Making any relation non-nullable or non-optional on `CreatorProfile`, `Artwork`, or `Order`.
   - Renaming or omitting existing fields in `AuditEvent` (`userId`, `action`, `entityType`, `entityId`, `payload`).
   - Changing teardown order in `seed.mjs` such that parent tables (`creatorProfile`, `order`) are deleted prior to child tables (`journalEntry`, `financialAccount`).
