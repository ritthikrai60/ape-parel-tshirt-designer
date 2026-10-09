---
name: factory-prepare
description: The entrypoint skill for preparing a new or existing project using the Agents Factory. Generates the necessary roles, rules, and skills for the workspace.
---

# Factory Prepare Skill

## Purpose
To transform an empty or existing workspace into a properly configured AI-assisted engineering environment.

## Trigger
Use this skill when the user asks to "initialize this project", "prepare the workspace", or "setup the Agents Factory".

## Step-by-Step Instructions

### Step 1: Environment Discovery
- Inspect the current directory using `run_command` (e.g., `ls` or `dir`).
- Determine if the directory is empty or contains an existing project.
- Read any existing `.gemini/rules` or `.gemini/skills`.
- DO NOT overwrite existing project files without user permission.

### Step 2: Project Intake
- Ask the user to fill out the `templates/project-intake.md` questionnaire.
- If the user provides answers inline, synthesize them into a new file: `docs/PROJECT_BRIEF.md`.

### Step 3: Project Classification & Team Design
- Based on the intake, determine the project profile (e.g., Simple Web App, Complex Backend).
- Select the minimal required Agent Roles from `catalog/agent-roles/`.
  - Default for Small Project: 1 Technical Lead (Implementation + Planning)
  - Default for Medium Project: 1 Tech Lead, 1 Code Reviewer
  - Default for Large Project: 1 Tech Lead, 1 Code Reviewer, 1 QA Engineer
- Propose this team structure to the user for approval.

### Step 4: Asset Generation
- Once the team is approved, generate the `.gemini/` structure in the target project.
- Copy the relevant rules (e.g., `team-coordination.md`) to `.gemini/rules/`.
- Copy relevant skills to `.gemini/skills/`.
- Establish the `TASK_BOARD.md` using the task contract schema.

### Step 5: Handoff
- Present a final summary of the prepared workspace.
- Provide the user with the first suggested action (e.g., "Create the first task in TASK_BOARD.md").

## Inputs
- Current workspace path
- User prompt

## Outputs
- `docs/PROJECT_BRIEF.md`
- `.gemini/rules/` and `.gemini/skills/` populated
- `docs/TASK_BOARD.md` created

## Verification Criteria
- All generated files exist on disk.
- Rules and Skills conform to Antigravity 2.0 format.
- No existing user code was deleted.
