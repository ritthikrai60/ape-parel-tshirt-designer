# Project Profile: Small Web App / MVP

## Description
A lightweight setup for prototypes, MVPs, and internal tools where velocity is prioritized over extreme robustness.

## Typical Role Composition
- **Technical Lead:** Implements features, writes tests, manages the board.
- *(Optional)* **Human Reviewer:** For critical deployment gates.

## Default Quality Gates
- Code compiles.
- Linting passes.
- Basic Unit Tests pass.

## Security Considerations
- Ensure no hardcoded secrets.
- Verify basic input sanitization.

## Workflow
1. Tech Lead takes task from `TASK_BOARD.md`.
2. Implements code and local tests.
3. Tech Lead self-verifies.
4. Transitions task to `PASS`.
