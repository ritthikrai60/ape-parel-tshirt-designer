# Orchestration Plan — ape-parel

## Objective
Orchestrate the full implementation and verification of the ape-parel apparel design and production marketplace across all requirements:
- R1: 2D & 3D Interactive Design Studio (Three.js, 2D transparent canvas, Front/Back mapping, multi-artwork)
- R2: Authoritative Server-Side Pricing Engine & Checkout (exact THB 410 benchmark test, server validation)
- R3: Auditable Royalty Ledger & Supplier Production Specs (atomic transactions, obligations & ledger entries)
- R4: Multi-Role Portals & Marketplace (Customer, Creator, Supplier)
- Acceptance Criteria & Verification (tsc --noEmit, vitest, next build).

## Strategy & Phasing
1. **Phase 0: Survey & Scope Mapping**
   - Dispatch 3 Explorers in parallel to inspect existing codebase, schema, tests, and requirements.
   - Aggregate findings into `PROJECT.md` with full Architecture, Feature Inventory, Milestones, Code Layout, and Interface Contracts.
2. **Phase 1: E2E Testing Track Setup**
   - Test infrastructure setup (`TEST_INFRA.md`).
   - Comprehensive test cases covering Tiers 1-4 (minimum coverage formula).
   - Publish `TEST_READY.md`.
3. **Phase 2: Milestone Execution (Implementation Track)**
   - Milestone 1: Authoritative Server-Side Pricing Engine & Checkout (R2)
   - Milestone 2: Auditable Royalty Ledger & Supplier Production Specs (R3)
   - Milestone 3: 2D & 3D Interactive Design Studio (R1)
   - Milestone 4: Multi-Role Portals & Marketplace (R4)
   - For each milestone: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
4. **Phase 3: Final Verification & Adversarial Hardening**
   - Phase 1: 100% E2E tests pass (Tiers 1-4).
   - Phase 2: Tier 5 adversarial coverage hardening (Challengers -> Worker -> Reviewers).
   - Full suite execution: `tsc --noEmit`, `npm test`, `npm run build`.
   - Victory Audit and Final completion report to Sentinel.
