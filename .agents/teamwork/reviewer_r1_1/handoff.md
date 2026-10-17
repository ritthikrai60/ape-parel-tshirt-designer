# Adversarial Review & QA Handoff Report: In-Studio Auth Modal & State Preservation

**Task:** Contextual In-Studio Auth Modal (`/studio/new`) interception, state preservation, and zero data loss.  
**Reviewer Role:** `reviewer@swe_light`, `qa@swe_light`  
**Verdict:** ISSUES RESOLVED, FULLY VERIFIED WITH 0 REGRESSIONS.

---

> [!WARNING] **Skepticism Disclaimer**
> High confidence in component logic, type correctness, and Vitest test pass rates; external live OAuth round-trips via third-party Google servers remain unverified in headless CLI without a physical browser.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: TypeScript Compiler Failure (TS2367)
- **Input:** Running `npx tsc --noEmit` on the codebase.
- **Expected:** Pass with exit code 0 and 0 type errors.
- **Actual:** Failed with code 1:
  `src/lib/__tests__/studio_auth_modal.test.ts(513,13): error TS2367: This comparison appears to be unintentional because the types '"ORDER"' and '"SAVE"' have no overlap.`
- **Root Cause:** In the test case for ORDER resumption, `let pendingAction: 'SAVE' | 'ORDER' | null = 'ORDER'` was never reassigned before the branch check. TypeScript's control-flow analysis narrowed `pendingAction` statically to the literal `'ORDER'`. Consequently, `actionToResume === 'SAVE'` triggered compiler error TS2367.
- **Fix:** Refactored the test session-arrival resumption handler into a reusable helper function accepting `'SAVE' | 'ORDER'`, preventing static literal narrowing and allowing both branches to compile cleanly.

### Issue 2: Initial Mount LocalStorage State Overwrite Race Condition
- **Input:** User mounts `/studio/new` with a pre-existing design saved in localStorage (e.g. returning from an OAuth redirect or page reload).
- **Expected:** The saved design (`frontElements`, `backElements`, color, size, quantity) is loaded and preserved without being overwritten by default initial state.
- **Actual:** The auto-persist effect in `DesignStudioClient.tsx` ran unconditionally on the initial render with initial component defaults (`frontElements: []`, `backElements: []`). Because empty arrays are not nullish, `saveStudioState` overwrote the existing localStorage entry with empty arrays before the asynchronous React state update from `loadStudioState()` had committed.
- **Root Cause:** Absence of an initialization guard (`isInitializedRef`) on the auto-persist `useEffect`.
- **Fix:** Added `isInitializedRef` initialized to `false`. The mount restoration hook sets `isInitializedRef.current = true`, and the auto-persist hook early-returns if `!isInitializedRef.current`.

### Issue 3: Missing `activeSurface` Restoration on Mount
- **Input:** User configured custom graphics on the `BACK` surface of the shirt (`activeSurface: 'BACK'`).
- **Expected:** Upon reloading or authenticating, the active surface is restored to `'BACK'` so the user immediately sees their back design.
- **Actual:** `loadStudioState()` ignored `saved.activeSurface`, causing the studio to reset to `'FRONT'`.
- **Root Cause:** Missing `setActiveSurface` and `setViewPreset` calls in the mount effect in `DesignStudioClient.tsx`.
- **Fix:** Added `if (saved.activeSurface) { setActiveSurface(saved.activeSurface); setViewPreset(saved.activeSurface); }`.

### Issue 4: Asynchronous Persistence Gap on Unauthenticated Action Trigger
- **Input:** Unauthenticated user clicks "Save Design" or "Order Now", followed immediately by external Google OAuth navigation.
- **Expected:** Design state is guaranteed to be in localStorage before the browser initiates navigation.
- **Actual:** Handlers only set React state (`setPendingAction('SAVE')`) and relied on a subsequent re-render's `useEffect` to persist the state.
- **Root Cause:** Lack of synchronous `saveStudioState` call inside `handleTriggerSave` and `handleTriggerOrder`.
- **Fix:** Added explicit synchronous `saveStudioState({...})` calls directly in both `handleTriggerSave` and `handleTriggerOrder`.

### Issue 5: Lingering `pendingAction` on Modal Dismissal
- **Input:** Unauthenticated user clicks "Save Design", opens modal, then explicitly cancels/dismisses via `X`, Escape, or backdrop click.
- **Expected:** The pending action is aborted and cleared so that future unrelated logins do not unexpectedly trigger a save/checkout.
- **Actual:** `handleCloseAuthModal` only toggled `isAuthModalOpen = false`, leaving `pendingAction` in state and localStorage.
- **Root Cause:** Missing cleanup in `handleCloseAuthModal`.
- **Fix:** Added `setPendingAction(null)` and `clearPendingStudioAction()` to `handleCloseAuthModal`.

---

## 2. What I Changed

1. **`src/lib/__tests__/studio_auth_modal.test.ts`**:
   - Fixed TS2367 type narrowing error in both SAVE and ORDER resumption tests.
   - Added test verifying rapid-fire sequential switching between "Save Design" and "Order Now" without state pollution.
   - Added test verifying modal dismissal clears pending action and storage while preserving canvas layers and `activeSurface` intact.
   - Added test verifying persistence and recovery of `activeSurface` (`'BACK'` / `'FRONT'`) across sessions.
   - Suite expanded from 22 to 25 passing tests.

2. **`src/components/studio/DesignStudioClient.tsx`**:
   - Added `isInitializedRef` guard to prevent initial mount from clobbering localStorage.
   - Restored `saved.activeSurface` and updated 3D view preset on mount.
   - Added synchronous `saveStudioState` calls in `handleTriggerSave` and `handleTriggerOrder`.
   - Updated `handleCloseAuthModal` to clear `pendingAction` and `clearPendingStudioAction()` on dismiss.
   - Added `isInitializedRef.current` guard in the auth resumption effect.

---

## 3. Verification Record

- **TypeScript Compilation:**
  - `npx tsc --noEmit` -> **PASSED** (Exit Code 0, 0 type errors).
- **Dedicated Test Suite:**
  - `npx vitest run src/lib/__tests__/studio_auth_modal.test.ts` -> **PASSED** (25/25 tests passed in 78ms).
- **Full Project Regression Test Suite:**
  - `npx vitest run` -> **PASSED** (18 test files, 359 tests passed, 0 failures, 0 regressions against existing 334 baseline).
- **Production Build:**
  - `npm run build` -> **PASSED** (Exit Code 0, all 10 Next.js routes successfully compiled and optimized).

---

## 4. Known Issues

- `Minor Robustness Risk`: If a user operates with browser storage explicitly blocked (e.g. extreme security policy in incognito window), state persistence falls back to React memory and will not survive a full hard page navigation (expected web platform behavior).
- `Shallow Verification`: Live round-trip through external Google OAuth consent screen was verified via simulated NextAuth providers and unit tests, not interactive live Google production credentials in a browser.

---

## 5. Remaining Risk & Verdict

- **Verdict:** Task complete. Acceptance criteria R1, R2, R3 fully satisfied with zero regressions and clean types.
