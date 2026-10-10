# E2E Test Infra: ape-parel Marketplace

## Test Philosophy
- Opaque-box, requirement-driven. Derives test cases from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory Coverage (Tiers 1-4)
| # | Feature | Requirement | Tier 1 (Unit/Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) |
|---|---------|-------------|:---------------------:|:-----------------:|:----------------------:|:-----------------:|
| F1 | 2D Canvas (Transparent & Colors) | R1 | 5 cases | 5 cases | Yes | Yes |
| F2 | 3D Viewport & OrbitControls | R1 | 5 cases | 5 cases | Yes | Yes |
| F3 | Independent UV Texture Mapping | R1 | 5 cases | 5 cases | Yes | Yes |
| F4 | Multi-Artwork Layer Management | R1 | 5 cases | 5 cases | Yes | Yes |
| F5 | Authoritative Pricing Math | R2 | 5 cases | 5 cases | Yes | Yes |
| F6 | Exact THB 410 Benchmark | R2 | 5 cases | 5 cases | Yes | Yes |
| F7 | Anti-Tampering Server Validation | R2 | 5 cases | 5 cases | Yes | Yes |
| F8 | Atomic Order Placement & Transaction | R3 | 5 cases | 5 cases | Yes | Yes |
| F9 | Auditable Royalty Ledger & Balance | R3 | 5 cases | 5 cases | Yes | Yes |
| F10| Supplier Production Spec Package | R3 | 5 cases | 5 cases | Yes | Yes |
| F11| Marketplace & Storefronts | R4 | 5 cases | 5 cases | Yes | Yes |
| F12| Creator Dashboard & Ledger View | R4 | 5 cases | 5 cases | Yes | Yes |
| F13| Supplier Dashboard & Job Queue | R4 | 5 cases | 5 cases | Yes | Yes |
| F14| Customer Order Tracking & Breakdown | R4 | 5 cases | 5 cases | Yes | Yes |

## Test Architecture
- **Framework**: Vitest (`vitest run`, `environment: 'node'`).
- **Commands**:
  - `npm test` runs the complete Vitest test suite across unit and integration tests.
  - `npx tsc --noEmit` verifies strict TypeScript compilation.
  - `npm run build` verifies Next.js production bundle creation.
- **Pass / Fail Semantics**: Zero test failures, zero type errors, exit code 0.
