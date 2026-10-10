# BRIEFING — 2026-10-10T01:15:30Z

## Mission
Design Three.js 3D Viewport (`GarmentPreview3D.tsx`), Real-Time 2D->3D Sync pipeline, and Studio Page (`src/app/studio/new/page.tsx` & `DesignStudioClient.tsx`) with LivePricingCard & Order integration for Milestone 3.

## 🔒 My Identity
- Archetype: explorer
- Roles: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m3_3
- Original parent: b128b841-82a3-43da-89c3-1191302bd832
- Milestone: Milestone 3 (2D & 3D Interactive Design Studio)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly into `src/` (worker role will implement)
- Scope: Three.js 3D Viewport (`GarmentPreview3D.tsx`), Real-Time 2D->3D Sync, and Studio Page (`src/app/studio/new/page.tsx`, `DesignStudioClient.tsx`, `LivePricingCard`)

## Current Parent
- Conversation ID: b128b841-82a3-43da-89c3-1191302bd832
- Updated: 2026-10-10T01:15:30Z

## Investigation State
- **Explored paths**:
  - `src/lib/types.ts`: `DesignElement`, `PricingPayload`, `PriceCalculationResult`, `CreateOrderInput`, `CreateOrderResult`.
  - `src/lib/pricing.ts` & `src/lib/__tests__/pricing.test.ts`: Exact ฿410 benchmark verification (150 base + 80 DTG + 15 pack + 40 ship + 125 licenses).
  - `src/lib/orders.ts`: Atomic Prisma transaction, anti-tampering verification, obligation and ledger entry creation.
  - `src/lib/production.ts`: Center-based coordinate mapping `(x, y)` as percentage `[0, 100]`.
  - `prisma/seed.mjs`: Benchmark garment `APX-HVY-001`, 4 authentic colors (`#131718`, `#FFFFFF`, `#F5F0E8`, `#DABA98`), benchmark artworks (Dash Ape ฿40, Cyber Primate ฿60, Static Glitch ฿25).
  - `explorer_m3_1/handoff.md`: 3D t-shirt OBJ generator, verified UV boundaries ($u \in [0.04, 0.46]$ front, $u \in [0.54, 0.96]$ back), orientation alignment.
  - `explorer_m3_2/handoff.md`: 2D transparent full-bleed canvas, center-based layer coordinate mechanics, layer manager controls.
- **Key findings**:
  - OrbitControls requires damping (`0.05`), distance limits (`1.2` to `4.0`), and polar angle limit (`Math.PI * 0.60`) to prevent dipping beneath the floor.
  - 3-point neutral lighting with Key (`1.2` top-front-right), Fill (`0.6` front-left), Rim (`0.8` back), and Ambient (`0.45` neutral) highlights cotton fabric folds without washing out colors.
  - Floor shadow plane using a radial gradient canvas alpha texture provides an ultra-smooth, lightweight contact shadow.
  - Procedural fallback geometry prevents studio rendering failures while `tshirt.obj` loads.
  - Zero-stutter sync is achieved by updating `texture.needsUpdate = true` on the shared `CanvasTexture` without recreating renderer or WebGL context.
  - LivePricingCard seamlessly recalculates via `POST /api/pricing/calculate`, and 1-click Benchmark Preset demonstrates exact ฿410 verification.
  - Checkout modal posts to `POST /api/orders` with atomic transaction and anti-tamper clientClaimedTotal protection.
- **Unexplored areas**: None within M3 scope.

## Key Decisions Made
- Unified coordinate system: `(x, y)` strictly represents the CENTER percentage `[0, 100]` of the garment surface, matching `production.ts` and Explorer 2.
- Provided 5 full proposed code files in working directory for worker execution.
- Added 1-click "⚡ Load ฿410 Benchmark" preset to `DesignStudioClient.tsx` for immediate audit and manual verification.

## Artifact Index
- `DISPATCH.md` — Initial dispatch instructions
- `progress.md` — Liveness heartbeat and status log
- `BRIEFING.md` — Persistent working memory
- `proposed_GarmentPreview3D.tsx` — Complete Three.js 3D Viewport component
- `proposed_LivePricingCard.tsx` — Real-time pricing calculator component
- `proposed_DesignStudioClient.tsx` — Studio coordinator component
- `proposed_studio_page.tsx` — Studio Next.js server page (`src/app/studio/new/page.tsx`)
- `proposed_texture_sync.ts` — 2D->3D offscreen canvas texture baking pipeline
- `handoff.md` — Comprehensive 5-component handoff report
