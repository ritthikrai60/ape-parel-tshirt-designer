<RULE[team-coordination]>
# Team Coordination and Task Handoff

When operating within this Agents Factory-prepared project, all agents MUST adhere to the following coordination rules:

1. **Single Source of Truth:**
   - The `docs/TASK_BOARD.md` is the absolute source of truth for task states.
   - Do not claim a task is complete unless its status in the board is updated to `PASS`.

2. **Task Ownership:**
   - An agent may only work on a task if they are listed as the `Owner` or if the task is unassigned and they have permission to claim it.
   - Do not edit files outside the scope of your assigned task.

3. **Evidence-Based Review:**
   - Code Reviewers and QA Agents MUST NOT pass a task based solely on looking at the code.
   - They MUST execute the defined `Execution Command` in the task contract and verify the `Evidence Required` (e.g., test logs, build output).
   - If tests fail, transition the task state to `FAILED`, record the error output in the task contract, and ping the Implementation Agent to retry.

4. **Bounded Repair Loop:**
   - Implementers may retry a failing task a maximum of 3 times.
   - If a task fails 3 times for the same reason, the state MUST transition to `BLOCKED` or `NEEDS_HUMAN_DECISION`.
   - Escalate immediately for security issues or destructive actions.

5. **Parallel Work:**
   - Agents MUST NOT edit the same file concurrently unless a Git worktree or branch isolation is active.
</RULE[team-coordination]>
