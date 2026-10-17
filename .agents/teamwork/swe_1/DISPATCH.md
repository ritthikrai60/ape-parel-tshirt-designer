## 2026-10-11T06:30:16Z

You are the SWE Light Orchestrator for this task.
Your working directory is: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_1
The authoritative request is recorded at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
Implement a Contextual In-Studio Auth Modal in the ape-parel 3D T-shirt design studio (`/studio/new`) that intercepts "Save Design" and "Order Now" for unauthenticated users, authenticates them, and preserves 3D canvas and design state without page reload or state loss.

Working directory for code: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

Requirements:
### R1. Contextual In-Studio Auth Modal Component
Implement an accessible, streetwear-themed authentication modal (`StudioAuthModal.tsx`) within the 3D design studio (`src/components/studio/DesignStudioClient.tsx`).
- When an unauthenticated user triggers "Save Design" or "Order Now / Checkout", intercept the action and display the modal rather than redirecting away from the studio.
- Support Google authentication via NextAuth (`signIn('google')`) and development credential/mock access if configured.
- Include a dismiss button and Escape key listener that closes the modal without altering or clearing the user's active 2D/3D design elements, garment colorway, or active surface (Front/Back).

### R2. Seamless State & Pending Action Preservation
Ensure zero design data loss:
- The active design state (frontElements, backElements, colorway, size) must be preserved in state/local storage during and across the authentication flow.
- Once authenticated, the system seamlessly resumes the pending save or order checkout action.

### R3. Automated Test Suite & Regression Verification
Author a dedicated test suite verifying the modal behavior:
- Tests confirm that unauthenticated clicks open the modal and authenticated clicks proceed directly to save/order.
- Tests confirm that closing the modal preserves existing canvas elements intact.
- Verify that all existing 334 Vitest tests in the project continue to pass with 0 regressions.

Acceptance Criteria:
- [ ] Unauthenticated click on "Save Design" or "Order Now" in `DesignStudioClient.tsx` opens `StudioAuthModal` without navigating away from `/studio/new`.
- [ ] Closing the modal via Close button or backdrop preserves all design elements, selected colorway, and 3D preview intact.
- [ ] Authenticated users bypass the modal and directly trigger the save or order flow.
- [ ] Dedicated Vitest test suite covering `StudioAuthModal` passes with exit code 0.
- [ ] All 334 existing Vitest tests across the 17 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.

Maintain progress updates in `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_1\progress.md`.
When the task is complete and verified, write your final handoff and notify the Sentinel.
