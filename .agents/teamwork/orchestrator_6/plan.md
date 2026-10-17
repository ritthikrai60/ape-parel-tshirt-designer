# Plan: 3D T-Shirt Model Generation & Web Integration

## Objective
Design, generate, and integrate a web-optimized 3D T-Shirt model using Blender MCP into the ape-parel 3D studio viewer, ensuring pixel-perfect UV mapping with the 2D canvas (front in [0.0, 0.5], back in [0.5, 1.0]), with zero regression on build and test suites.

## Phase 0: Survey & Investigation (Current Phase)
- Dispatch 3 parallel Explorers:
  - `explorer_survey_6_1`: 3D Studio Architecture & Texture Mapping Survey
  - `explorer_survey_6_2`: Blender MCP & 3D Model Generation Pipeline Survey
  - `explorer_survey_6_3`: Model Specs, Existing `tshirt.obj`, and Build/Test Verification Survey
- Synthesize reports into `PROJECT.md` at project root with Feature Inventory, Architecture, and Decomposition.

## Phase 1: Milestone Decomposition & Execution
- Milestone 1: 3D Model Creation & Strict UV Partitioning via Blender MCP (Worker + Reviewers + Challengers + Auditor)
- Milestone 2: Model Web Optimization & Three.js Integration (replace `public/models/tshirt.obj`, adjust viewer scaling/materials if necessary)
- Milestone 3: UV Alignment Verification & E2E Testing QA (Programmatic UV bounds check, 2D-to-3D alignment, build & tests pass)

## Phase 2: Final Verification & Sentinel Hand-off
- Comprehensive gate check across all tests and forensic audits.
- Final report to Sentinel for independent Victory Audit.
