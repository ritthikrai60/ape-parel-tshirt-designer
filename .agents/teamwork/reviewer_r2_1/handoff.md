# Adversarial Review & QA Handoff Report: In-Studio Auth Modal & State Preservation

**Milestone:** In-Studio Auth Modal (`/studio/new`) Interception, Zero Data Loss, & Session Resumption  
**Reviewer:** `reviewer@swe_light`, `qa@swe_light`  
**Verdict:** CRITICAL RACE CONDITIONS & EDGE CASES RESOLVED, FULLY VERIFIED WITH 0 REGRESSIONS.

---

> [!WARNING] **Skepticism Disclaimer**
> High confidence in component lifecycle, type safety, and test assertions (32/32 dedicated, 366/366 repo-wide); live external Google OAuth redirection across third-party identity servers cannot be executed in headless CLI without a physical browser.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: Flawed Initial Mount Guard in `DesignStudioClient.tsx`
- **Input:** User mounts `/studio/new` with pre-existing design state in localStorage (e.g., after an OAuth round-trip or page reload).
- **Expected:** The auto-persist hook skips the initial mount render completely, allowing state restoration to commit before persisting.
- **Actual:** The prior attempt used `isInitializedRef` initialized to `false` and set `isInitializedRef.current = true;` inside the mount effect. Because React executes all effects sequentially in Commit 1, the auto-persist effect ran in that same Commit 1 immediately after the mount effect. Since `isInitializedRef.current` was already mutated to `true`, the auto-persist effect proceeded to run with the initial empty state (`frontElements: []`, `backElements: []`, `selectedColor: '#131718'`), wiping the pre-existing design from localStorage in Commit 1.
- **Root Cause:** React refs mutate synchronously across effects within the same render commit. An initialization flag set in Effect 1 does not prevent Effect 2 from running in the very same commit.
- **Fix:** Replaced with the standard skip-initial-mount ref pattern: `if (!isMountedRef.current) { isMountedRef.current = true; return; }` in the auto-persist effect. This ensures that Commit 1 always returns early without writing to storage, and only Commit 2+ (after state restoration has committed) persists changes.

### Issue 2: Full Page Reload on Dev Mock Credential Login Dropping In-Memory Canvas State
- **Input:** Unauthenticated user clicks "Save Design" or "Order Now", modal opens, user clicks "Dev Customer" or "Dev Creator".
- **Expected:** In-studio authentication succeeds in-place without page reload, preserving 3D WebGL context, active Three.js canvas, and in-memory state.
- **Actual:** NextAuth's `signIn('credentials')` was invoked without `{ redirect: false }`, causing a full browser navigation/reload.
- **Root Cause:** Missing `redirect: false` in `handleDevLogin` in `StudioAuthModal.tsx` and absence of `updateSession()` call in `DesignStudioClient.tsx`.
- **Fix:** Configured `signIn('credentials', { email, redirect: false, callbackUrl: ... })` and updated `handleDevLoginSuccess` in `DesignStudioClient.tsx` to invoke `await updateSession()`, allowing instantaneous in-place session establishment without page reload.

### Issue 3: Desynchronized Storage State on Modal Dismissal
- **Input:** Unauthenticated user clicks "Save Design", opens modal, then dismisses via Close button, Escape, or backdrop.
- **Expected:** Pending action is cleared from both `PENDING_ACTION_STORAGE_KEY` and `STUDIO_STORAGE_KEY`.
- **Actual:** Only `clearPendingStudioAction()` was called; `STUDIO_STORAGE_KEY` retained `pendingAction: 'SAVE'` until the next state change triggered auto-persist. If the user reloaded before another change, `loadStudioState()` returned the old pending action.
- **Root Cause:** Lack of explicit `saveStudioState({ pendingAction: null })` inside `handleCloseAuthModal` and the session resumption hook.
- **Fix:** Added synchronous `saveStudioState({ pendingAction: null })` to both `handleCloseAuthModal` and the auth resumption effect.

### Issue 4: Prototype & Array Confusion Vulnerability in `loadStudioState()`
- **Input:** LocalStorage contains a JSON array (`"[1, 2, 3]"`) or corrupted objects where `frontElements` or `backElements` are not arrays (e.g. string or number).
- **Expected:** Safely rejected or sanitized to empty arrays without throwing.
- **Actual:** `typeof [1,2,3] === 'object'` evaluated to true, returning an array as `StudioPersistedState`. If `frontElements` was a string, `textureSync.ts` crashed with `.map is not a function`, taking down the 3D studio.
- **Root Cause:** Missing `Array.isArray(parsed)` check and missing defensive array sanitization in `loadStudioState()`.
- **Fix:** Added `Array.isArray(parsed)` rejection guard and defensive array sanitization (`Array.isArray(parsed.frontElements) ? parsed.frontElements : []`), quantity bounds validation, and activeSurface normalization.

### Issue 5: Missing SSR Guard on Keydown Event Listener in `StudioAuthModal.tsx`
- **Input:** Server-side rendering or non-browser execution environment when `isOpen` is true.
- **Expected:** No reference errors when `window` is undefined.
- **Actual:** `window.addEventListener` was called directly if `isOpen` was true.
- **Root Cause:** Lack of `typeof window !== 'undefined'` guard in the effect.
- **Fix:** Added `if (!isOpen || typeof window === 'undefined') return;`.

### Issue 6: Error Extraction Gap in `executeSaveDesign()`
- **Input:** `/api/designs` responds with a 400 or 500 error (`{ error: 'Validation Error' }`).
- **Expected:** User-facing toast displays the specific backend validation message.
- **Actual:** Handlers looked only for `err.message`, which was undefined, defaulting to generic `'Failed to save design'`.
- **Root Cause:** Next.js API route returns `{ error: message }`, while the client only extracted `err.message`.
- **Fix:** Updated to `err.message || err.error || 'Failed to save design'`.

### Issue 7: Test Suite Shallow Assertions & Missing Edge Cases
- **Input:** Running test suite against edge cases.
- **Expected:** Deep tests verifying real Escape keydown listeners, corrupted storage arrays, mount race condition prevention, and non-reloading credential contracts.
- **Actual:** Tests contained dummy assertions (e.g., `expect(typeof onClose).toBe('function')`) and lacked coverage for race conditions and malformed storage payloads.
- **Root Cause:** Shallow test coverage in `studio_auth_modal.test.ts`.
- **Fix:** Expanded suite with Section 9 (7 new adversarial tests, bringing total from 25 to 32 tests), thoroughly verifying all edge cases.

---

## 2. What I Changed

1. **`src/components/studio/studioStateStorage.ts`**:
   - Added `Array.isArray(parsed)` rejection guard to prevent array payload confusion.
   - Defensively sanitized `frontElements` and `backElements` to guaranteed arrays.
   - Enforced bounds validation on `quantity` (positive number, defaults to 1).
   - Enforced surface normalization on `activeSurface` ('FRONT' | 'BACK').
   - Handled `undefined` vs `[]` distinction in `saveStudioState` so layer clearing and partial preservation both work reliably.

2. **`src/components/studio/StudioAuthModal.tsx`**:
   - Added `typeof window !== 'undefined'` guard in Escape keydown effect.
   - Configured `signIn('credentials', { email, redirect: false, callbackUrl: ... })` to prevent page reload during dev mock login.

3. **`src/components/studio/DesignStudioClient.tsx`**:
   - Replaced flawed `isInitializedRef` with standard `isMountedRef` skip-initial-mount pattern to prevent mount race condition clobbering localStorage.
   - Destructured `update: updateSession` from `useSession()` and called `await updateSession()` in `handleDevLoginSuccess` for in-place session refresh.
   - Added synchronous `saveStudioState({ pendingAction: null })` to `handleCloseAuthModal` and session resumption effect.
   - Enhanced API error extraction in `executeSaveDesign` to inspect `err.error` in addition to `err.message`.
   - Wired fallback checkout authentication button to invoke `handleTriggerOrder()` and close the checkout modal.

4. **`src/lib/__tests__/studio_auth_modal.test.ts`**:
   - Added Section 9 with 7 new adversarial tests covering array payload rejection, non-array element sanitization, invalid quantity sanitization, mount race condition prevention via `isMountedRef`, synchronous dual-key dismissal cleanup, asymmetrical back-only surface designs, and `redirect: false` credential login contracts.
   - Suite expanded from 25 to 32 tests, all passing.

---

## 3. Verification Record

- **TypeScript Compilation:**
  - `npx tsc --noEmit` -> **PASSED** (Exit Code 0, 0 type errors).
- **Dedicated Test Suite:**
  - `npx vitest run src/lib/__tests__/studio_auth_modal.test.ts` -> **PASSED** (32/32 tests passed in 71ms).
- **Full Project Regression Test Suite:**
  - `npx vitest run` -> **PASSED** (18 test files, 366 tests passed, 0 failures, 0 regressions against existing 334 baseline).
- **Production Build:**
  - `npm run build` -> **PASSED** (Exit Code 0, all 10 Next.js routes successfully compiled and optimized).

---

## 4. Known Issues

- `Minor Robustness Risk`: In extreme private/incognito browsing modes where `window.localStorage` is explicitly blocked or throws security exceptions on access, design state is safely held in React memory and will survive in-studio credential authentication (`redirect: false`), but cannot survive a full hard browser navigation to external Google OAuth servers.
- `Shallow Verification`: Full round-trip through external Google OAuth accounts was verified using NextAuth provider contracts, mocked callbacks, and unit tests, rather than live Google Client ID authorization in a graphical browser.

---

## 5. Remaining Risk & Next Step

- **Verdict:** Task complete. Acceptance criteria R1, R2, and R3 are fully satisfied, all race conditions and edge case vulnerabilities have been remediated, and all 18 test suites (366 tests total) pass with zero regressions.
