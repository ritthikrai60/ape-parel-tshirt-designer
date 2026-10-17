## 2026-10-10T06:01:29Z
You are teamwork_preview_explorer #1 for Milestone M2 (Graphic Asset Upload & Strict Format Enforcement).
Your working directory is: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_gen4_1
Project root is: d:\Coding Projects\ape-parel tshirt

MANDATORY FIRST STEP:
Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest section ## 2026-10-10T05:13:06Z).
Read the project specification at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_4\PROJECT.md.

Your objective for Milestone M2:
1. Examine image processing and storage requirements:
   - Design `src/lib/storage.ts`: Modular local filesystem storage service (`public/uploads/masters` and `public/uploads/previews`) with pluggable `StorageService` interface (`saveMaster`, `savePreview`, `getMasterBuffer`, `deleteFile`).
   - Design `src/lib/assetValidation.ts`: Sharp-powered validation and watermarking engine:
     - Formats supported: PNG, SVG, TIFF, JPEG.
     - Transparency enforcement: PNG must have `hasAlpha === true`. If non-transparent, reject with clear error.
     - DPI verification: Raster images must have `density >= 300` DPI. SVG vector images are exempt from raster DPI checks (`isVector = true`).
     - Dimension and aspect ratio checks: Minimum dimensions (e.g. 1000px on shortest side for raster), reasonable aspect ratios [0.2, 5.0].
     - Automated preview generation: Sharp resizes master to max 1024x1024, composites semi-transparent SVG watermark overlay (`APE-PAREL • ROYALTY PROTECTED`), and outputs public web preview.
2. Ensure Sharp runs cleanly on Windows x64 host using installed `@img/sharp-win32-x64`.
3. Provide exact, complete code implementations for `src/lib/storage.ts` and `src/lib/assetValidation.ts`.
4. Create BRIEFING.md and progress.md in your working directory.
5. Deliver handoff report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_gen4_1\handoff.md` and message the orchestrator.
