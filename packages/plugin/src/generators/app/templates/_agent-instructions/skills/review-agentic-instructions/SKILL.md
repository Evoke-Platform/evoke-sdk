---
name: review-agentic-instructions
description: Use when reviewing AI agent instruction files and skills — CLAUDE.md, AGENTS.md, INSTRUCTIONS.md, SKILL.md files, prompt packs, workflow rules, tool-use guidance, review skills, planning contracts, or other agent-facing documentation. Run when the developer asks whether instructions will steer autonomous or semi-autonomous agents correctly, safely, and efficiently.
---

# Agentic Instruction Reviewer

Role: senior agentic-systems reviewer evaluating whether instructions reliably shape
AI agent behavior in real work.

## Context

Agent-facing instructions are executable design surfaces. Their failures usually do not
look like syntax errors; they look like agents guessing, over-asking, skipping validation,
loading too much context, following stale local assumptions, or obeying two conflicting
rules at once.

Review the instruction artifact itself, not the product code it describes. Treat the
question as: "What behavior will a capable agent actually produce after reading this,
under time pressure, partial context, and imperfect tool availability?"

For skills, remember that only frontmatter is available before trigger. Any trigger,
scope, or "when to use" guidance that matters must be in the `description`, not only in
the body.

## Review Principles

1. **Behavior over prose**: Judge whether the instruction changes agent decisions, not
   whether it sounds comprehensive.
2. **Operational specificity**: Prefer concrete source-of-truth lookup paths, validation
   commands, output formats, and stop conditions over broad advice.
3. **Right-sized autonomy**: Instructions should tell agents when to proceed, when to
   ask, and when to stop. Approval gates should protect meaningful risk, not routine
   implementation.
4. **Progressive disclosure**: Keep always-loaded guidance short. Move rare, detailed,
   or variant-specific material into skill bodies or referenced files.
5. **Tool realism**: Required tools, connectors, files, paths, commands, and permissions
   must exist or include a graceful fallback.
6. **Conflict awareness**: Later, local, user, and tool instructions can override each
   other. Make precedence explicit when a project rule could conflict with platform or
   developer instructions.

## Anti-Patterns

| Anti-pattern           | Detection signal                                                                                                                                                                     | Fix direction                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Untriggerable skill    | Skill body explains when to use it, but frontmatter `description` is vague or misses common user wording                                                                             | Move trigger contexts, artifact names, and task verbs into the description                                                           |
| Advice without action  | Instruction says "be careful", "consider", "ensure quality", or "follow best practices" without saying what to inspect or do                                                         | Replace with checks, commands, source files, decision rules, or output requirements                                                  |
| Conflicting rules      | One section says to proceed autonomously while another requires confirmation; one command gate differs from another; commit/push rules disagree                                      | Pick a single rule or state precedence and the exact exception path                                                                  |
| Approval drag          | Agent must ask before low-risk reads, ordinary edits, routine tests, or every plan step                                                                                              | Reserve explicit confirmation for irreversible actions, live systems, credentials, production deploys, or user-visible scope changes |
| Missing stop condition | Workflow tells the agent to iterate, poll, retry, or validate but not when to stop or report failure                                                                                 | Add pass/fail criteria, retry limits, terminal states, and what to tell the developer when blocked                                   |
| Validation theater     | Required validation is impossible, irrelevant, too expensive for the task, or can pass without checking the behavior that matters                                                    | Align validation with the risk; state lighter fallback checks when the full gate cannot run                                          |
| Tool or path fiction   | Instruction references connector tools, slash commands, local paths, generated files, or package exports that may not exist                                                          | Add discovery commands, availability checks, and fallback behavior                                                                   |
| Stale source of truth  | Instruction relies on memory, old docs, copied API paths, or generated examples where live docs/specs/types should decide                                                            | Name the authoritative source and the exact lookup pattern before implementation                                                     |
| Context bloat          | Long always-loaded file contains niche examples, reference dumps, repeated rules, or variant-specific details                                                                        | Split into skills/references and tell the agent when to load each one                                                                |
| Format ambiguity       | Review, plan, changelog, or final-response expectations are implied but not shaped                                                                                                   | Define the minimum fields, severity scale, file references, and success/blocked summary                                              |
| Agent-host mismatch    | Instructions assume one agent runtime's features in another runtime, such as Claude-only slash commands, Codex-only directives, missing MCP connectors, or unavailable browser tools | Name supported hosts or provide equivalent manual fallback steps                                                                     |
| Unsafe delegation      | Agent is told to use subagents, automation, commits, pushes, deployments, or external writes without boundaries                                                                      | Specify allowed scope, required review points, and cleanup/reporting expectations                                                    |

## Review Checklist

### Triggering and Scope

1. **Audience**: Identify which agent hosts the file targets (Claude, Codex, generic, or
   multiple) and whether the instructions match those hosts' capabilities.
2. **Entry points**: For each skill or workflow, confirm the trigger description names
   the artifact types and user requests that should activate it.
3. **Boundaries**: Confirm the file says what the agent should not handle, when to ask
   the developer, and when to use another skill or source.

### Decision Quality

4. **Source of truth**: Confirm the agent is told how to discover current facts,
   package APIs, schemas, tickets, docs, or generated artifacts instead of guessing.
5. **Precedence**: Look for contradictions with system/developer instructions, local
   repository rules, tool permissions, and user requests.
6. **Autonomy gates**: Check that confirmation gates correspond to real risk and do not
   force unnecessary user interrupts.
7. **Failure handling**: Verify that unavailable tools, missing files, failed commands,
   and ambiguous requirements have fallback or reporting instructions.

### Execution Quality

8. **Workflow shape**: Confirm steps have clear order, inputs, outputs, and stop
   conditions.
9. **Validation**: Confirm validation commands or review checks prove the intended
   behavior and include realistic fallback checks.
10. **State hygiene**: Check instructions for dirty-worktree handling, generated files,
    local-only artifacts, secrets, environment files, and external writes.
11. **Context efficiency**: Identify material that should move out of always-loaded
    instructions into skills, references, scripts, or examples.

### Reviewability

12. **Output contract**: Confirm the agent is told how to report findings, line
    references, severity, open questions, and residual risk.
13. **Forward-testability**: For complex skills or workflows, check whether a fresh
    agent could be asked to use the instructions on a realistic task without hidden
    context.

## Review Output

Report P0-P3 findings that describe the agent behavior likely to fail:

-   **P0**: Can cause destructive actions, credential exposure, production impact, or
    irreversible external writes.
-   **P1**: Likely to make agents produce materially wrong work, skip required source of
    truth, or violate important project rules.
-   **P2**: Causes recurring inefficiency, over-asking, brittle validation, missed edge
    cases, or inconsistent outputs.
-   **P3**: Clarity, maintainability, or context-efficiency improvement.

Each finding includes the instruction file and line or section, the likely agent
behavior, why it matters, and a concrete rewrite direction. If the instructions are
sound, cite the trigger coverage, source-of-truth paths, autonomy gates, validation
strategy, and failure handling that prove it.
