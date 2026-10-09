# Task Board: ape-parel MVP

Single Source of Truth for task execution and coordination within the Agents Factory framework.

---

## Task Summary Table

| ID | Title | Owner | Reviewer | State | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-001** | Project Scaffolding & Prisma Database Architecture | Technical Lead | Code Reviewer | READY | Setup Next.js, Prisma schema, and seed data |
| **TASK-002** | Creator Marketplace & Artwork Portfolio | Technical Lead | QA Engineer | READY | Build catalog browsing & artwork detail pages |
| **TASK-003** | 2D Canvas & Real Three.js 3D Garment Studio | Technical Lead | Code Reviewer | READY | Integrate centered transparent mockups & 3D OBJ model |
| **TASK-004** | Live Pricing Engine & Quote Server Validation | Technical Lead | QA Engineer | READY | Implement cost calculation API & unit tests |
| **TASK-005** | Order Pipeline & Supplier Production Specification | Technical Lead | Code Reviewer | READY | Build order placement & supplier job sheets |
| **TASK-006** | Royalty Ledger & Financial Settlement System | Technical Lead | QA Engineer | READY | Implement immutable ledger records & payout views |
| **TASK-007** | Supplier Portal, Admin Moderation & Audit Logs | Technical Lead | Code Reviewer | READY | Build supplier status update & admin controls |

---

## Detailed Task Contracts

### Task Contract: TASK-001
- **Title:** Project Scaffolding & Prisma Database Architecture
- **Objective:** Initialize Next.js 14 App Router project with Tailwind CSS, TypeScript, and Prisma ORM schema modeling Users, CreatorProfiles, Artworks, GarmentProducts, GarmentVariants, Orders, and RoyaltyLedgers.
- **Owner:** Technical Lead
- **Reviewer:** Code Reviewer
- **Expected Files:** `package.json`, `prisma/schema.prisma`, `prisma/seed.mjs`, `src/lib/prisma.ts`
- **Acceptance Criteria:**
  1. Next.js App Router project boots cleanly on port 3000.
  2. Prisma schema migrates cleanly and seed script populates test creators, artworks, garments, and suppliers.
- **Required Tests:** `npx prisma db push`, `node prisma/seed.mjs`, `npm run build`
- **Current State:** READY

### Task Contract: TASK-002
- **Title:** Creator Marketplace & Artwork Portfolio
- **Objective:** Implement marketplace home (`/marketplace`), artist profile pages (`/creators/[slug]`), and artwork licensing modals.
- **Owner:** Technical Lead
- **Reviewer:** QA Engineer
- **Expected Files:** `src/app/marketplace/page.tsx`, `src/app/creators/[slug]/page.tsx`, `src/components/marketplace/*`
- **Acceptance Criteria:**
  1. Users can search, filter by category (Mascot, Typography, Illustration), and view license pricing.
  2. "Customize on Garment" button links directly into the Design Studio.
- **Current State:** READY

### Task Contract: TASK-003
- **Title:** 2D Canvas & Real Three.js 3D Garment Studio
- **Objective:** Implement interactive studio (`/studio/new`) supporting transparent 2D mockups and genuine 3D T-shirt geometry (`tshirt.obj`) in Three.js across FRONT, BACK, and SIDE surfaces.
- **Owner:** Technical Lead
- **Reviewer:** Code Reviewer
- **Expected Files:** `src/app/studio/new/page.tsx`, `src/components/studio/DesignStudioClient.tsx`, `src/components/studio/GarmentPreview3D.tsx`, `public/models/tshirt.obj`, `public/mockups/*`
- **Acceptance Criteria:**
  1. 2D Canvas renders high-res centered mockups with authentic fabric colors on transparent background.
  2. Three.js loads `tshirt.obj` with 360° rotation and dynamic texture projection.
  3. No artificial print boundary boxes constrain the view.
- **Current State:** READY

### Task Contract: TASK-004
- **Title:** Live Pricing Engine & Quote Server Validation
- **Objective:** Implement server-side pricing engine calculating exact garment blank costs, printing surface fees, licensed artwork royalties, and shipping.
- **Owner:** Technical Lead
- **Reviewer:** QA Engineer
- **Expected Files:** `src/lib/pricing.ts`, `src/app/api/pricing/calculate/route.ts`, `src/lib/__tests__/pricing.test.ts`
- **Acceptance Criteria:**
  1. Server is the sole authority for order totals.
  2. Vitest unit tests pass 100% for various surface and quantity combinations.
- **Current State:** READY

### Task Contract: TASK-005
- **Title:** Order Pipeline & Supplier Production Specification
- **Objective:** Implement order checkout, order details page, and production file generation (JSON specs with printable high-res asset coordinates).
- **Owner:** Technical Lead
- **Reviewer:** Code Reviewer
- **Expected Files:** `src/app/api/orders/route.ts`, `src/app/account/orders/[id]/page.tsx`, `src/app/api/orders/[id]/production/route.ts`
- **Acceptance Criteria:**
  1. Orders generate unique human-readable order numbers.
  2. Production endpoint delivers complete specifications for the supplier.
- **Current State:** READY

### Task Contract: TASK-006
- **Title:** Royalty Ledger & Financial Settlement System
- **Objective:** Create immutable ledger records for creator earnings upon order creation and settlement tracking.
- **Owner:** Technical Lead
- **Reviewer:** QA Engineer
- **Expected Files:** `src/lib/royalties.ts`, `src/app/creator/earnings/page.tsx`, `src/app/api/royalties/settle/route.ts`, `src/lib/__tests__/orders_royalties.test.ts`
- **Acceptance Criteria:**
  1. Every order line item records explicit royalty obligations.
  2. Creators can inspect accrued vs. settled royalties.
- **Current State:** READY

### Task Contract: TASK-007
- **Title:** Supplier Portal, Admin Moderation & Audit Logs
- **Objective:** Implement supplier dashboard (`/supplier/dashboard`), order status transition controls, and admin moderation.
- **Owner:** Technical Lead
- **Reviewer:** Code Reviewer
- **Expected Files:** `src/app/supplier/dashboard/page.tsx`, `src/app/admin/orders/page.tsx`, `src/app/admin/moderation/page.tsx`
- **Acceptance Criteria:**
  1. Suppliers can update order fulfillment states.
  2. Admins can review platform-wide orders, royalties, and audit logs.
- **Current State:** READY
