# Team Blueprint: ape-parel MVP

Prepared by **Agents Factory** on 2026-10-10.

---

## 1. Project Classification & Complexity Assessment
- **Classification:** **Tier 3 — Complex Full-Stack Marketplace & 3D Interactive Web Application**
- **Core Complexity Vectors:**
  - 3D WebGL / Three.js Mesh loading, OrbitControls, and UV canvas texture compositing.
  - Multi-Party Financial Ledger (Immutable `RoyaltyLedgerEntry` & `RoyaltyObligation`).
  - Server-authoritative dynamic pricing with atomic checkout transactions.
  - Multi-surface design persistence (FRONT, BACK, SIDE).
  - Supplier production specification package generation.

---

## 2. Factory Agent Hierarchy & Subordinate Squads

```
                       ┌─────────────────────────┐
                       │   FACTORY ORCHESTRATOR  │
                       └────────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  TECH LEAD   │             │ CODE REVIEW  │             │ QA ENGINEER  │
│ (Lead Eng.)  │             │ (Sec/Arch)   │             │ (Verify/Test)│
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       ├─► database_engineer        ├─► security_auditor         ├─► pricing_royalty_tester
       ├─► studio_3d_engineer       └─► domain_integrity_reviewer└─► e2e_integration_tester
       └─► core_fullstack_engineer
```

### A. Technical Lead Squad (`tech_lead_agent`)
1. **`database_engineer` (Prisma & Data Architect):**
   - Designs `prisma/schema.prisma` across all 7 domains, indexes, migrations, and deterministic seed script `prisma/seed.mjs`.
2. **`studio_3d_engineer` (3D WebGL & Graphics Specialist):**
   - Implements Three.js garment viewport (`GarmentPreview3D.tsx`), `tshirt.obj` loading, OrbitControls, 3-point lighting rig, dynamic 1024x1024 CanvasTexture UV projection, and high-res transparent 2D canvas without print boundary constraints.
3. **`core_fullstack_engineer` (Next.js & API Specialist):**
   - Implements Next.js 14 App Router pages (`/marketplace`, `/artwork/[id]`, `/studio/new`, `/account/orders`, `/creator/*`, `/supplier/*`, `/admin/*`), Tailwind CSS streetwear UI, and API routes.

### B. Code Reviewer Squad (`code_reviewer_agent`)
1. **`security_auditor` (Security & Authorization Specialist):**
   - Audits server-side RBAC, verifies server recalculation of pricing to prevent frontend tampering, sanitizes SVGs, and protects private assets.
2. **`domain_integrity_reviewer` (Modular Monolith & Transaction Specialist):**
   - Verifies domain modularity, atomic database transactions for orders and royalties, and idempotency to prevent duplicate obligations.

### C. QA Engineer Squad (`qa_engineer_agent`)
1. **`pricing_royalty_tester` (Financial & Calculation Test Specialist):**
   - Writes and executes Vitest unit tests verifying the exact THB 410 benchmark (฿150 + ฿80 + ฿15 + ฿40 + ฿125), quantity scaling, and royalty ledger accounting.
2. **`e2e_integration_tester` (Build & User Journey Specialist):**
   - Verifies TypeScript compilation (`npx tsc --noEmit`), Next.js production builds (`npm run build`), API route health checks, and end-to-end user flows.

---

## 3. Team Coordination Protocol (.gemini/rules/team-coordination.md)
1. **Single Source of Truth:** `docs/TASK_BOARD.md` governs all task lifecycles (`READY` ➔ `IN_PROGRESS` ➔ `REVIEW` ➔ `VERIFYING` ➔ `PASS`).
2. **Evidence-Based Review:** No task passes without concrete execution logs (Test runner exit code 0, TypeScript 0 errors, Next.js build clean).
3. **Bounded Repair Loop:** Maximum 3 automatic retries per task before human escalation.
4. **Git Isolation:** Changes committed incrementally to Git branches/worktrees.
