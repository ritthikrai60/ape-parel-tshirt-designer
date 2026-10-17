# Dispatch Instructions

## 2026-10-10T15:26:40Z

You are the Project Orchestrator for the ape-parel 3D T-Shirt model generation & integration task.

Project Root: `d:\Coding Projects\ape-parel tshirt`
Your Working Directory: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_6`
Authoritative Request: Read `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically the latest request under `## 2026-10-10T15:24:53Z`).

Objective:
Design, generate, and integrate a web-optimized 3D T-Shirt model using Blender MCP into the ape-parel 3D studio viewer, ensuring pixel-perfect UV mapping with the 2D canvas.
Integrity mode: benchmark

Key Requirements:
1. Web-Optimized 3D Model Generation:
   - Create or adapt a realistic, low-poly 3D T-Shirt model optimized for fast web rendering in Three.js.
   - UV map partitioned strictly: Front of the shirt maps exactly to [0.0, 0.5] UV space (U-axis), Back maps exactly to [0.5, 1.0].
2. Project Integration:
   - Export as `.obj` to maintain compatibility with existing Three.js loader.
   - Replace existing `public/models/tshirt.obj`.
   - Modify React/Three.js source code only if strictly necessary to scale, position, or render the new model.
3. Verification & Alignment QA:
   - Systematically verify that 2D design placed on front canvas aligns with 3D model without texture bleeding onto the back.
   - Verify `npm run build` and tests pass without regression.

Instructions:
- Maintain your `plan.md` and `progress.md` in your working directory.
- Decompose and orchestrate your specialist agents (implementers, reviewers, challengers, verifiers) adhering strictly to teamwork protocols.
- When all acceptance criteria are met, report project completion to Sentinel for independent Victory Audit.
