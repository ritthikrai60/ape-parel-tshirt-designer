# Milestone M1 Exploration & Seed Architecture Handoff Report

- **Agent**: `explorer_m1_gen4_2`
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen4_2`
- **Milestone**: M1 (Database Schema Expansion & Audit Infrastructure)
- **Role**: Database Migration Workflow, Teardown Order, and Seed Infrastructure
- **Date**: 2026-10-10T05:38:00Z
- **Reference**: `ORIGINAL_REQUEST.md` (latest section `## 2026-10-10T05:13:06Z`), `orchestrator_4/PROJECT.md`

---

## 1. Observation

### A. Current Project State & Verification Baseline
1. **Test Runner Baseline (`npm test` / `vitest run`)**:
   - Tool execution command: `npm test`
   - Verbatim result:
     ```
     Test Files  13 passed (13)
          Tests  268 passed (268)
       Duration  7.87s
     ```
   - Zero test failures across all 13 existing test suites.
2. **TypeScript Compilation (`npx tsc --noEmit`)**:
   - Tool execution command: `npx tsc --noEmit`
   - Verbatim result: Exit code `0`, zero compiler errors or warnings.
3. **Database Configuration & Seed Execution**:
   - `package.json:11-12`:
     ```json
     "db:push": "prisma db push",
     "db:seed": "node prisma/seed.mjs",
     ```
   - `.env:1`: `DATABASE_URL="file:./dev.db"`
   - Tool execution command: `node prisma/seed.mjs`
   - Verbatim result:
     ```
     --- SEEDING APE-PAREL DATABASE ---
     --- SEEDING COMPLETED SUCCESSFULLY ---
     Admin User: admin@ape-parel.com
     Creators: 3 seeded (Dash Ape, Cyber Monk, Soma Botanica)
     Suppliers: 2 seeded (Bangkok Garment Craft, Siam Textile Mill)
     Artworks: 5 seeded with active license options
     Sample Order: APX-ORD-9021 (Total: THB 410)
     ```
   - Seed executes cleanly and exits with code `0`.

### B. Current Seed Teardown Sequence (`prisma/seed.mjs:8-23`)
Current lines 8 to 23 of `prisma/seed.mjs`:
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

### C. Foreign Key Dependency Map of New Milestone M1 Models
From `explorer_m1_gen4_1`'s validated schema (`proposed_schema.prisma`):
1. `CreatorStorefrontSettings`:
   - Foreign key: `creatorId` references `CreatorProfile.id` (`onDelete: Cascade`).
   - Relationship: Child of `CreatorProfile`.
2. `ArtworkFileSpec`:
   - Foreign key: `artworkId` references `Artwork.id` (`onDelete: Cascade`).
   - Relationship: Child of `Artwork`.
3. `CommissionRule`:
   - Foreign keys: None. Standalone pricing/rule table.
4. `FinancialAccount`:
   - Foreign key: `creatorId` references `CreatorProfile.id` (`onDelete: Cascade`). Optional for system accounts (`PLATFORM`, `ESCROW`).
   - Relationship: Child of `CreatorProfile`, Parent of `JournalEntry`.
5. `JournalEntry`:
   - Foreign keys:
     - `accountId` references `FinancialAccount.id` (`onDelete: Cascade`).
     - `orderId` references `Order.id` (`onDelete: SetNull`).
   - Relationship: Child of `FinancialAccount` and `Order`.
6. `ReconciliationReport`:
   - Foreign keys: None. Audit snapshot entity.

### D. Benchmark Entities in Seed Script (`prisma/seed.mjs`)
1. **Creators (3 Seeded)**:
   - Creator 1: `dash-ape` (`Dash Ape Studio`, User: `dashape@ape-parel.com`)
   - Creator 2: `cyber-monk` (`Cyber Monk`, User: `cybermonk@ape-parel.com`)
   - Creator 3: `soma-botanica` (`Soma Botanica`, User: `soma@ape-parel.com`)
2. **Benchmark Artworks (5 Seeded)**:
   - Artwork 1: `Dash Ape Classic Head Mark` (`creator1`, Mascot, Standard License THB 40)
   - Artwork 2: `Cyber Primate Tokyo 2088` (`creator1`, Illustration, Standard License THB 60)
   - Artwork 3: `Static Glitch Protocol` (`creator2`, Pattern, Standard License THB 25)
   - Artwork 4: `Neo Shibuya Heavy Kanji` (`creator2`, Typography, Standard License THB 50)
   - Artwork 5: `Bonsai Core Brutalism` (`creator3`, Illustration, Standard License THB 45)
3. **Benchmark Order (`APX-ORD-9021`)**:
   - Total Amount: THB 410 (Garment 150 + Print 80 + Pack 15 + Ship 40 + Licenses 125).
   - Licenses: 40 (Art 1) + 60 (Art 2) + 25 (Art 3) = 125 THB GMV.
   - Obligations: 3 obligations created (`ob1` 40, `ob2` 60, `ob3` 25).
   - RoyaltyLedgerEntries: 3 entries (`Dash Ape` balance: 100, `Cyber Monk` balance: 25).

---

## 2. Logic Chain

### Step 1: Preventing SQLite Foreign Key Constraint Failures in Teardown
- **Observation**: SQLite enforces foreign key checks at the table level during DML statements when foreign keys are enabled. In Prisma, calling `model.deleteMany()` executes `DELETE FROM "Model"` directly. If child rows reference a table being deleted, SQLite immediately aborts with:
  `Foreign key constraint failed on the field: foreign key constraint failed`.
- **Deduction**: Every child table MUST be emptied via `deleteMany()` before its parent table is emptied.
- **Topological Sorting of Tables**:
  - `ReconciliationReport`: No dependents or foreign keys. Can be cleared 1st.
  - `JournalEntry`: References `FinancialAccount` and `Order`. MUST be cleared before `FinancialAccount` AND before `Order`.
  - `FinancialAccount`: References `CreatorProfile`, referenced by `JournalEntry`. MUST be cleared after `JournalEntry` and before `CreatorProfile`.
  - `CommissionRule`: Independent table. Can be cleared at the start.
  - `ArtworkFileSpec`: References `Artwork`. MUST be cleared before `Artwork`.
  - `CreatorStorefrontSettings`: References `CreatorProfile`. MUST be cleared before `CreatorProfile`.
- **Exact Teardown Sequence**:
  Placing all new models at the top of the existing teardown sequence:
  ```javascript
  await prisma.reconciliationReport.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.artworkFileSpec.deleteMany();
  await prisma.creatorStorefrontSettings.deleteMany();
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
  - `JournalEntry` (line 2) is deleted before `FinancialAccount` (line 3) and before `Order` (line 11).
  - `FinancialAccount` (line 3) is deleted before `CreatorProfile` (line 19).
  - `ArtworkFileSpec` (line 5) is deleted before `Artwork` (line 17).
  - `CreatorStorefrontSettings` (line 6) is deleted before `CreatorProfile` (line 19).
  - Every child is guaranteed deleted before its parent. Zero foreign key constraint violations can occur.

### Step 2: Seed Creation for CommissionRule
- **Requirement**: 'STANDARD_15_85' with 15% platform commission rate and 85% creator rate.
- **Deduction**:
  Seed record with:
  ```javascript
  const standardCommissionRule = await prisma.commissionRule.create({
    data: {
      name: 'STANDARD_15_85',
      platformRate: 0.15,
      creatorRate: 0.85,
      isActive: true,
      description: 'Standard ape-parel marketplace commission split (15% platform, 85% creator).',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  ```

### Step 3: Seed Creation for Double-Entry Financial Accounts
- **Requirement**: Enterprise double-entry general ledger tracking `PLATFORM`, `ESCROW`, and `CREATOR` accounts.
- **Deduction**:
  - `platformAccount`: `accountType: 'PLATFORM'`, `accountNumber: 'ACC-PLATFORM-REVENUE'`, `currency: 'THB'`, `balance: 19`.
  - `escrowAccount`: `accountType: 'ESCROW'`, `accountNumber: 'ACC-ESCROW-HOLDING'`, `currency: 'THB'`, `balance: 0`.
  - `creatorAccount1` (`Dash Ape`): `accountType: 'CREATOR'`, `accountNumber: 'ACC-CREATOR-dash-ape'`, `creatorId: creator1.id`, `balance: 85`.
  - `creatorAccount2` (`Cyber Monk`): `accountType: 'CREATOR'`, `accountNumber: 'ACC-CREATOR-cyber-monk'`, `creatorId: creator2.id`, `balance: 21`.
  - `creatorAccount3` (`Soma Botanica`): `accountType: 'CREATOR'`, `accountNumber: 'ACC-CREATOR-soma-botanica'`, `creatorId: creator3.id`, `balance: 0`.
- **Double-Entry Journal Balancing for Benchmark Order APX-ORD-9021**:
  - Customer payment received into Escrow:
    - `accountId: escrowAccount.id`, `entryType: 'CREDIT'`, `amount: 125`, `balanceAfter: 125`.
  - Escrow released on royalty allocation:
    - `accountId: escrowAccount.id`, `entryType: 'DEBIT'`, `amount: 125`, `balanceAfter: 0`.
  - Platform commission revenue:
    - `accountId: platformAccount.id`, `entryType: 'CREDIT'`, `amount: 19`, `balanceAfter: 19`.
  - Dash Ape creator accrual (85% of THB 100):
    - `accountId: creatorAccount1.id`, `entryType: 'CREDIT'`, `amount: 85`, `balanceAfter: 85`.
  - Cyber Monk creator accrual (85% of THB 25):
    - `accountId: creatorAccount2.id`, `entryType: 'CREDIT'`, `amount: 21`, `balanceAfter: 21`.
- **Conservation Invariant Verification**:
  - Escrow: Credits(125) - Debits(125) = 0 == balance(0).
  - Platform: Credits(19) - Debits(0) = 19 == balance(19).
  - Dash Ape: Credits(85) - Debits(0) = 85 == balance(85).
  - Cyber Monk: Credits(21) - Debits(0) = 21 == balance(21).
  - Soma Botanica: Credits(0) - Debits(0) = 0 == balance(0).
  - System GMV Conservation: 19 (Platform) + 85 (Dash Ape) + 21 (Cyber Monk) = 125 THB.
  - Matches total licensing cost of order `APX-ORD-9021` to the exact baht!

### Step 4: Seed Creation for CreatorStorefrontSettings
- **Requirement**: Storefront customization for the 3 default creators with bio, banner, avatar, socialLinks JSON, themePreferences JSON, design tokens (Ink Black `#131718`, Paper Beige `#F5F0E8`, Warm Kraft `#DABA98`), featured artworks, and verified badge.
- **Deduction**:
  - `dash-ape`: Custom slug `dash-ape`, featured artworks `[art1.id, art2.id]`, dark streetwear aesthetic (`#131718` / `#DABA98`), verified badge `true`.
  - `cyber-monk`: Custom slug `cyber-monk`, featured artworks `[art3.id, art4.id]`, brutalist typography theme (`#131718` / `#DABA98`), verified badge `true`.
  - `soma-botanica`: Custom slug `soma-botanica`, featured artworks `[art5.id]`, organic minimalist theme (`#F5F0E8` / `#DABA98`), verified badge `true`.
  - Seeded right after artworks are created so `art1.id` through `art5.id` are bound accurately.

### Step 5: Seed Creation for ArtworkFileSpec
- **Requirement**: 5 benchmark artworks seeded with 300 DPI, format specs, transparency, vector flags, storage paths, and watermarked previews.
- **Deduction**:
  - `art1` (`Dash Ape Classic`): 3600x3600, 300 DPI, sRGB, transparent PNG, size 2.84MB.
  - `art2` (`Cyber Primate 2088`): 4200x4200, 300 DPI, sRGB, transparent PNG, size 3.92MB.
  - `art3` (`Static Glitch Protocol`): 3000x3000, 300 DPI, sRGB, transparent SVG vector (`isVector: true`), size 185KB.
  - `art4` (`Neo Shibuya Kanji`): 3200x4000, 300 DPI, sRGB, transparent SVG vector (`isVector: true`), size 245KB.
  - `art5` (`Bonsai Core Brutalism`): 3800x3800, 300 DPI, sRGB, transparent PNG, size 3.15MB.
  - Exercises both high-res transparent raster and scalable vector workflows.

### Step 6: Seed Creation for ReconciliationReport
- **Requirement**: Audit snapshot with total GMV, commission, royalties, matched items, discrepancy count, balance conservation status.
- **Deduction**:
  - Period: `'2026-10'`, GMV: 125, commission: 19, royalties: 106, matchedItems: 3, discrepancies: 0, status: `'BALANCED'`, `balanceConservationVerified: true`.

---

## 3. Caveats

1. **Foreign Key Deletion Order is Strictly Enforced**:
   - If any new model is deleted *after* its parent (e.g. deleting `CreatorProfile` before `CreatorStorefrontSettings` or before `FinancialAccount`), SQLite will throw a foreign key constraint violation. The prescribed order must be preserved.
2. **Rounding Convention on 15% / 85% Split**:
   - For Artwork 3 (25 THB): 15% is 3.75 THB, and 85% is 21.25 THB.
   - In whole THB integers, platform rounds to 4 THB, creator gets 21 THB (4 + 21 = 25).
   - Across Artworks 1 & 2 (100 THB): platform gets 15 THB, creator gets 85 THB.
   - Total Platform = 15 + 4 = 19 THB. Total Creators = 85 + 21 = 106 THB. 19 + 106 = 125 THB.
   - Integer balance conservation holds exactly without fractional loss.
3. **Additive-Only Execution Guarantee**:
   - Existing order `APX-ORD-9021`, user profiles, garments, and printing services are preserved identically, ensuring that existing tests referencing `APX-ORD-9021` (`portals_marketplace.test.ts`, `orders_royalties.test.ts`) continue passing without regression.

---

## 4. Conclusion & Actionable Blueprint for Worker M1

A drop-in proposed seed file has been created at:
`d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen4_2\proposed_seed.mjs`

### Implementation Blueprint Summary

#### 1. Teardown Additions (`prisma/seed.mjs:8-23`)
Replace lines 8-23 with:
```javascript
  // Clean existing records in sequence (child tables before parent tables to respect SQLite foreign keys)
  await prisma.reconciliationReport.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.artworkFileSpec.deleteMany();
  await prisma.creatorStorefrontSettings.deleteMany();
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

#### 2. CommissionRule Seeding (Immediately after Teardown)
```javascript
  // 0. Commission Rules (R4 & Milestone M1)
  const standardCommissionRule = await prisma.commissionRule.create({
    data: {
      name: 'STANDARD_15_85',
      platformRate: 0.15,
      creatorRate: 0.85,
      isActive: true,
      description: 'Standard ape-parel marketplace commission split (15% platform, 85% creator).',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
```

#### 3. FinancialAccount Seeding (After Creators are Created)
```javascript
  // 6. Double-Entry Financial Accounts (Platform, Escrow, Creators)
  const platformAccount = await prisma.financialAccount.create({
    data: {
      accountType: 'PLATFORM',
      accountNumber: 'ACC-PLATFORM-REVENUE',
      balance: 19, // Benchmark order commission accrued
      currency: 'THB',
      status: 'ACTIVE',
    },
  });

  const escrowAccount = await prisma.financialAccount.create({
    data: {
      accountType: 'ESCROW',
      accountNumber: 'ACC-ESCROW-HOLDING',
      balance: 0, // Cleared on settlement
      currency: 'THB',
      status: 'ACTIVE',
    },
  });

  const creatorAccount1 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-dash-ape',
      balance: 85, // 85% of THB 100 for Dash Ape
      currency: 'THB',
      creatorId: creator1.id,
      status: 'ACTIVE',
    },
  });

  const creatorAccount2 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-cyber-monk',
      balance: 21, // 85% of THB 25 for Cyber Monk
      currency: 'THB',
      creatorId: creator2.id,
      status: 'ACTIVE',
    },
  });

  const creatorAccount3 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-soma-botanica',
      balance: 0,
      currency: 'THB',
      creatorId: creator3.id,
      status: 'ACTIVE',
    },
  });
```

#### 4. CreatorStorefrontSettings Seeding (After Artworks are Created)
```javascript
  // 8. Creator Storefront Settings (R1 & R4)
  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator1.id,
      customSlug: 'dash-ape',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics. Official Apex Resident Artist.',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      avatarUrl: creator1.avatarUrl,
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/dashapestudio',
        twitter: 'https://x.com/dashape_art',
        behance: 'https://behance.net/dashape',
        website: creator1.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#131718', // Ink Black
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#F5F0E8', // Paper Beige
        font: 'Space Grotesk',
        mode: 'dark',
        layout: 'grid-featured',
      }),
      featuredArtworkIds: JSON.stringify([art1.id, art2.id]),
      badgeVerified: true,
    },
  });

  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator2.id,
      customSlug: 'cyber-monk',
      bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions. Pushing the boundaries of neo-industrial apparel.',
      bannerUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80',
      avatarUrl: creator2.avatarUrl,
      socialLinks: JSON.stringify({
        twitter: 'https://x.com/cybermonk_x',
        instagram: 'https://instagram.com/cybermonk.art',
        behance: 'https://behance.net/cybermonk',
        website: creator2.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#131718', // Ink Black
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#222729',
        font: 'JetBrains Mono',
        mode: 'dark',
        layout: 'editorial',
      }),
      featuredArtworkIds: JSON.stringify([art3.id, art4.id]),
      badgeVerified: true,
    },
  });

  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator3.id,
      customSlug: 'soma-botanica',
      bio: 'Experimental botanical drawings meets modern industrial streetwear framing. Organic textures intertwined with architectural lines.',
      bannerUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&q=80',
      avatarUrl: creator3.avatarUrl,
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/somabotanica',
        behance: 'https://behance.net/somabotanica',
        website: creator3.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#F5F0E8', // Paper Beige
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#131718', // Ink Black
        font: 'Cinzel',
        mode: 'light',
        layout: 'minimal-curated',
      }),
      featuredArtworkIds: JSON.stringify([art5.id]),
      badgeVerified: true,
    },
  });
```

#### 5. ArtworkFileSpec Seeding (After Artworks are Created)
```javascript
  // 9. Artwork File Specifications (R2 & R4)
  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art1.id,
      storagePath: 'public/uploads/masters/art1_dash_ape_classic.png',
      storageKey: 'masters/art1_dash_ape_classic.png',
      mimeType: 'image/png',
      width: 3600,
      height: 3600,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art1_dash_ape_classic_watermarked.png',
      fileSize: 2840500,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art2.id,
      storagePath: 'public/uploads/masters/art2_cyber_primate_2088.png',
      storageKey: 'masters/art2_cyber_primate_2088.png',
      mimeType: 'image/png',
      width: 4200,
      height: 4200,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art2_cyber_primate_2088_watermarked.png',
      fileSize: 3920100,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art3.id,
      storagePath: 'public/uploads/masters/art3_static_glitch_protocol.svg',
      storageKey: 'masters/art3_static_glitch_protocol.svg',
      mimeType: 'image/svg+xml',
      width: 3000,
      height: 3000,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: true,
      previewWatermarkedPath: 'public/uploads/previews/art3_static_glitch_protocol_watermarked.png',
      fileSize: 185400,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art4.id,
      storagePath: 'public/uploads/masters/art4_neo_shibuya_kanji.svg',
      storageKey: 'masters/art4_neo_shibuya_kanji.svg',
      mimeType: 'image/svg+xml',
      width: 3200,
      height: 4000,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: true,
      previewWatermarkedPath: 'public/uploads/previews/art4_neo_shibuya_kanji_watermarked.png',
      fileSize: 245900,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art5.id,
      storagePath: 'public/uploads/masters/art5_bonsai_core.png',
      storageKey: 'masters/art5_bonsai_core.png',
      mimeType: 'image/png',
      width: 3800,
      height: 3800,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art5_bonsai_core_watermarked.png',
      fileSize: 3154800,
    },
  });
```

#### 6. Double-Entry Journal Entries & Reconciliation Report (After Sample Order is Created)
```javascript
  // 15. Double-Entry General Ledger Entries (Layer 2 Enterprise Bookkeeping)
  // Step 1: Customer payment received in Escrow account (125 THB total artwork GMV)
  await prisma.journalEntry.create({
    data: {
      accountId: escrowAccount.id,
      entryType: 'CREDIT',
      amount: 125,
      balanceAfter: 125,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Customer payment received in escrow for order ${sampleOrder.orderNumber}`,
    },
  });

  // Step 2: Escrow released upon order fulfillment / royalty allocation
  await prisma.journalEntry.create({
    data: {
      accountId: escrowAccount.id,
      entryType: 'DEBIT',
      amount: 125,
      balanceAfter: 0,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Escrow released for order ${sampleOrder.orderNumber} royalty settlement`,
    },
  });

  // Step 3: Platform 15% commission fee recognized (15% of 125 THB = 19 THB rounded)
  await prisma.journalEntry.create({
    data: {
      accountId: platformAccount.id,
      entryType: 'CREDIT',
      amount: 19,
      balanceAfter: 19,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Platform 15% commission fee for order ${sampleOrder.orderNumber}`,
    },
  });

  // Step 4: Dash Ape Creator Accrual (85% of THB 100 = 85 THB)
  await prisma.journalEntry.create({
    data: {
      accountId: creatorAccount1.id,
      entryType: 'CREDIT',
      amount: 85,
      balanceAfter: 85,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Creator royalty accrual (85%) for order ${sampleOrder.orderNumber}: Artworks 1 & 2`,
    },
  });

  // Step 5: Cyber Monk Creator Accrual (85% of THB 25 = 21 THB)
  await prisma.journalEntry.create({
    data: {
      accountId: creatorAccount2.id,
      entryType: 'CREDIT',
      amount: 21,
      balanceAfter: 21,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Creator royalty accrual (85%) for order ${sampleOrder.orderNumber}: Artwork 3`,
    },
  });

  // 16. Financial Reconciliation Report (October 2026 Audit)
  await prisma.reconciliationReport.create({
    data: {
      period: '2026-10',
      periodStart: new Date('2026-10-01T00:00:00.000Z'),
      periodEnd: new Date('2026-10-31T23:59:59.000Z'),
      totalGmv: 125,
      totalCommission: 19,
      totalCreatorRoyalties: 106,
      matchedItemsCount: 3,
      discrepancyCount: 0,
      status: 'BALANCED',
      balanceConservationVerified: true,
      generatedBy: 'SYSTEM',
    },
  });
```

---

## 5. Verification Method

To independently verify the database migration workflow and seed execution:

1. **Verify Schema Syntax & Compilation**:
   ```powershell
   npx prisma validate
   ```
   *Expected outcome*: `The schema at prisma\schema.prisma is valid 🚀`.

2. **Push Schema to SQLite Database**:
   ```powershell
   npx prisma db push
   ```
   *Expected outcome*: Prisma synchronizes tables with `dev.db` without requesting data loss approval.

3. **Generate Prisma Client Types**:
   ```powershell
   npx prisma generate
   ```
   *Expected outcome*: Client code generated in `node_modules/@prisma/client` with zero errors.

4. **Execute Database Seed**:
   ```powershell
   node prisma/seed.mjs
   ```
   *Expected outcome*:
   ```
   --- SEEDING APE-PAREL DATABASE ---
   --- SEEDING COMPLETED SUCCESSFULLY ---
   Admin User: admin@ape-parel.com
   Creators: 3 seeded (Dash Ape, Cyber Monk, Soma Botanica) with Storefront Settings & Accounts
   Suppliers: 2 seeded (Bangkok Garment Craft, Siam Textile Mill)
   Artworks: 5 seeded with active license options & file specifications
   Financial Accounts: Platform (19 THB), Escrow (0 THB), 3 Creators (106 THB total accrual)
   Sample Order: APX-ORD-9021 (Total: THB 410)
   Double-Entry Journal: 5 entries recorded, 1 reconciliation report generated
   ```
   Exit code `0`. Zero foreign key constraint errors.

5. **Execute Regression Test Suite**:
   ```powershell
   npm test
   ```
   *Expected outcome*: All 13 test files and all 268 tests pass without regression.

6. **Execute TypeScript Compiler Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code `0`, zero compiler errors.

7. **Invalidation Conditions**:
   - Calling `prisma.creatorProfile.deleteMany()` before `prisma.creatorStorefrontSettings.deleteMany()` or `prisma.financialAccount.deleteMany()`.
   - Calling `prisma.financialAccount.deleteMany()` before `prisma.journalEntry.deleteMany()`.
   - Calling `prisma.artwork.deleteMany()` before `prisma.artworkFileSpec.deleteMany()`.
   - Any modification that removes or modifies pre-seeded order `APX-ORD-9021`.
