# BRIEFING — 2026-10-09T23:38:00Z

## Mission
Design and specify `src/lib/__tests__/pricing.test.ts` validating benchmark THB 410, quantity scaling, dual-surface printing, and error handling, along with defensive patch for `src/lib/pricing.ts`.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Pricing Test Suite & Edge Case Investigator
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_1
- Original parent: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Milestone: Milestone 1 - Pricing Engine Specification & Verification

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code in src/ directly.
- All code proposals must be provided as specifications/diffs/handoff reports in working directory.
- Test suite must validate exact THB 410 benchmark, quantity scaling, dual-surface printing, and error handling for missing garment/license options.

## Current Parent
- Conversation ID: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Updated: 2026-10-09T23:38:00Z

## Investigation State
- **Explored paths**:
  - `src/lib/pricing.ts`: pricing logic, silent missing license bug identified (lines 101-113)
  - `src/lib/types.ts`: `PricingPayload`, `PriceCalculationResult`, `ArtworkLicenseLine`, `PrintSurface`
  - `prisma/schema.prisma` & `prisma/seed.mjs`: verified data models, APX-HVY-001 (150 base, 15 pack, 40 ship), DTG service (80/surface), seeded artworks (40, 60, 25 THB licenses)
  - `vitest.config.ts` & `package.json`: Vitest 1.6.1 configured with node environment and `@/` path alias
- **Key findings**:
  - 1 unit benchmark: 150 (garment) + 80 (1 surface DTG) + 15 (packaging) + 40 (shipping) + 125 (40+60+25 licenses) = 410 THB.
  - 3 units scaling: 450 (garment) + 240 (DTG) + 45 (pack) + 40 (flat ship) + 375 (licenses) = 1150 THB.
  - Dual-surface print: FRONT + BACK = 2 surfaces * 80 = 160 THB print cost. Total = 465 THB.
  - Vulnerability: `pricing.ts` silently skips missing `licenseOptionId`. Must throw Error to satisfy server anti-tamper requirement R2.
  - Security spoofing: Must ensure `license.artworkId === item.artworkId`.
  - Garment variant defense: Must throw if `garmentVariantId` is provided but not found on product variants.
- **Unexplored areas**: None for M1 pricing scope. Ready for handoff.

## Key Decisions Made
- Use live Prisma query in `beforeAll` targeting SKU and artwork titles instead of hardcoded cuid strings, ensuring test robustness across database re-seeds.
- Include comprehensive subtotal assertions, quantity normalization tests (0, float), triple-surface test, and blank garment baseline test.
- Provide unified diff patch for `src/lib/pricing.ts`.

## Artifact Index
- `handoff.md` — Complete 5-component handoff report with exact test code and patch specification.
