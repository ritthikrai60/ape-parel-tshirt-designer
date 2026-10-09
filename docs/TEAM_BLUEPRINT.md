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

## 2. Factory Agent Team Composition

| Role | Agent Identifier | Mission & Responsibilities | Quality Gate Authority |
| :--- | :--- | :--- | :--- |
| **Technical Lead** | `tech_lead_agent` | Architecture, Next.js 14 App Router, Prisma ORM, Three.js 3D Viewport, Pricing Engine, and Production Export. | Implementation Owner for TASK-001 through TASK-007 |
| **Code Reviewer** | `code_reviewer_agent` | Architectural compliance, server-side RBAC validation, SVG/file upload sanitization, transactional atomicity, idempotency. | Approver for Architecture & Security Gates |
| **QA Engineer** | `qa_engineer_agent` | Automated test suite execution (`vitest`), benchmark calculation verification (THB 410), build verification, regression checks. | Approver for Acceptance Criteria & Test Evidence Gates |

---

## 3. Team Coordination Protocol (.gemini/rules/team-coordination.md)
1. **Single Source of Truth:** `docs/TASK_BOARD.md` governs all task lifecycles (`READY` ➔ `IN_PROGRESS` ➔ `REVIEW` ➔ `VERIFYING` ➔ `PASS`).
2. **Evidence-Based Review:** No task passes without concrete execution logs (Test runner exit code 0, TypeScript 0 errors, Next.js build clean).
3. **Bounded Repair Loop:** Maximum 3 automatic retries per task before human escalation.
4. **Git Isolation:** Changes committed incrementally to Git branches/worktrees.
