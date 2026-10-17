# BRIEFING — 2026-10-11T14:18:00Z

## Mission
Orchestrate the SWE Light implementation and refinement loop for 3D Print Placement Guide & Ruler Exporter in ape-parel.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_3
- Original parent: Sentinel / Parent Agent
- Original parent conversation ID: 890b6fa8-ff98-4490-96e5-809d88b07f68

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_3\context.md
1. **Decompose**: Do not decompose. Pass the full verbatim task to worker.
2. **Dispatch & Execute**:
   - teamwork_preview_implementer -> produces working diff and test results
   - teamwork_preview_reviewer (Round 1) -> adversarial break/fix
   - teamwork_preview_reviewer (Round 2) -> adversarial break/fix
   - teamwork_preview_reviewer (Round 3) -> adversarial break/fix
   - Independent verification (re-run tests)
   - teamwork_preview_victory_auditor -> post-victory audit
3. **On failure**:
   - Retry: nudge stuck agent
   - Replace: spawn fresh worker with partial progress
   - Carry open-issues ledger across all rounds
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. R1-R4 Implementation & Verification [pending]
- **Current phase**: Dispatch Implementer (Round 0)
- **Current focus**: teamwork_preview_implementer

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and repair to workers.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Propagate the task verbatim without alteration.
- Floor of at least three review rounds after implementer.
- Re-run tests independently to verify.
- Blocking victory audit before reporting completion.

## Current Parent
- Conversation ID: 890b6fa8-ff98-4490-96e5-809d88b07f68
- Updated: 2026-10-11T14:18:00Z

## Key Decisions Made
- Use SWE Light sequential refinement workflow.
- First step: spawn teamwork_preview_implementer with verbatim prompt.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Implementer 1 | teamwork_preview_implementer | R1-R4 Initial Implementation | completed | 0fa61e52-f2de-4ba4-a7c1-dfa0ef280ad9 |
| Reviewer 1 | teamwork_preview_reviewer | Adversarial Review Round 1 | completed | 82820532-ced0-4557-8fc5-391631f27dc4 |
| Reviewer 2 | teamwork_preview_reviewer | Adversarial Review Round 2 | completed | 9582ca63-5c55-45f0-b66d-6ce33acc7ed7 |
| Reviewer 3 | teamwork_preview_reviewer | Adversarial Review Round 3 | completed | 8cadea4c-cd75-43fa-84f1-637de16e168c |
| Victory Auditor | teamwork_preview_victory_auditor | Post-Victory Independent Audit | completed | 8b833a44-f3e0-405f-81dc-8e7dee7b1a68 |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not needed (task completed)

## Active Timers
- Heartbeat cron: 081d3e74-abd5-4004-bc03-a67f5f5ef254/task-15
- Safety timer: none

## Artifact Index
- context.md — Task description and requirements
- DISPATCH.md — Dispatch log from parent
- progress.md — Heartbeat and iteration status
- BRIEFING.md — Persistent working memory
