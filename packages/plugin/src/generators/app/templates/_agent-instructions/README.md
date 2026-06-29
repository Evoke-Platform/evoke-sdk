# Agent Instructions — SDK Developer Guide

This directory contains the AI agent instruction templates that ship with every
scaffolded plugin project. **This README is not copied into scaffolded projects** — it
exists only for SDK developers working on these templates.

## How It Gets Into a Scaffold

The Yeoman generator (`../index.ts`) copies two things from this directory:

1. **`INSTRUCTIONS.md`** → renamed based on the developer's agent choice:
    - `claude` → `CLAUDE.md` (project root)
    - `codex` → `AGENTS.md` (project root)
    - `generic` → `INSTRUCTIONS.md` (project root)
    - `none` → nothing copied
2. **`skills/**`\*\* → copied to the agent's skill directory:
    - `claude` → `.claude/skills/`
    - `codex` → `.agents/skills/`
    - `generic` → `.agents/skills/`

`INSTRUCTIONS.md` is an EJS template (uses `<%= projectName %>`) and is processed with
`copyTpl`. Skills are plain-copied with `fs.copy` — no interpolation.

Any file in this directory that isn't `INSTRUCTIONS.md` or under `skills/` is ignored
by the generator and won't appear in scaffolded projects.

## What Each File Does

### INSTRUCTIONS.md

The main project-level instruction file. It tells the agent:

-   What an Evoke plugin project is and how it's structured
-   Import rules (SDK re-exports, es5 target constraints, `const`/`let` over `var`)
-   How to verify API paths against the OpenAPI spec before using them
-   Platform UI component library usage (SDK-wrapped MUI, icon imports, deep-import ban)
-   SDK hooks (`useApiServices`, `useObject`, `useAuthenticationContext`, etc.)
-   Environment and OpenAPI spec lookup patterns
-   CriteriaBuilder Mongo→Loopback conversion
-   Storybook and MSW mock layer conventions
-   Widget TDD contract and implementation contract
-   Polling conventions (3-second `setTimeout`, cleanup on unmount) to allow the developer to watch the red-green tdd flow work in the storybook story
-   Commands (`npm run build`, `storybook`, `test-storybook`, `package`)
-   Guardrails (no commits, no secrets, no bypassing manifestgen)

### skills/

Each subdirectory is a self-contained skill with a `SKILL.md` frontmatter file. Skills
are invoked by agents (via `/skill-name` or tool dispatch) when the task matches the
skill's `description` field. The twelve skills and their roles:

| Skill                         | Purpose                                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-widget`                | End-to-end workflow for creating or changing a widget. Covers prerequisites, execution mode (git versioning), file structure, component decomposition, WidgetProperties.json, Storybook, and verification. This is the primary orchestration skill. |
| `plan-widget`                 | Architecture and blueprint phase — produces a widget plan before implementation begins. Runs before `build-widget`.                                                                                                                                 |
| `storybook-tdd`               | Red-green TDD loop using Storybook interaction tests. Covers the `play` function pattern, `step()` naming, paced container stories, CLI verification, regression-first workflow, and visual/layout checks.                                          |
| `review-accessibility`        | Accessibility review — WCAG 2.2 AA: accessible names, keyboard paths, focus management, live regions, contrast, semantic structure. Run after a build or on request.                                                                                |
| `review-performance`          | Performance review — polling intervals, timer/subscription cleanup, data bounds, render stability, bundle imports. Catches issues that pass tests but break in production.                                                                          |
| `review-behavioral`           | Behavioral and test quality review — phase coverage, async safety, error handling, dialog lifecycle, empty states, play function quality. Covers correctness and test coverage together.                                                            |
| `review-agentic-instructions` | Agentic instruction review — CLAUDE.md, AGENTS.md, INSTRUCTIONS.md, SKILL.md, workflow rules, tool-use guidance, autonomy gates, validation strategy, source-of-truth paths, and context efficiency.                                                |
| `build-criteria-filters`      | CriteriaBuilder usage and Mongo→Loopback `Where` clause conversion.                                                                                                                                                                                 |
| `render-evoke-forms`          | FormRenderer / FormRendererContainer V2 props and usage.                                                                                                                                                                                            |
| `send-correspondence`         | Correspondence (email) endpoints on the data service.                                                                                                                                                                                               |
| `add-payment-gateway`         | Scaffolding a new payment gateway implementation.                                                                                                                                                                                                   |
| `plan-payment-gateway`        | Planning phase for payment gateway work.                                                                                                                                                                                                            |

## Key Design Decisions

### Container / Presentational Split

Widgets follow a strict container/presentational architecture:

-   **Container** (`index.tsx`): SDK hooks, state management, API calls, handler
    functions. No layout JSX. Default-exports the widget component.
-   **Presentational components** (`components/*.tsx`): Pure props-in, JSX-out. No
    `@evoke-platform/*` hook imports. Each renders in Storybook without platform context.

This split exists because Storybook can't provide the full App Viewer runtime (auth,
navigation, notifications). Presentational components are fully testable in isolation;
the container gets one MSW-backed integration story.

### Phase Machine Pattern

The `build-widget` skill requires one presentational component per widget phase (idle,
loading, in-progress, complete, error). The container uses a discriminated-union `Phase`
type and renders exactly one component at a time via `switch`. This was added after
agentic autonomated testing runs showed that unattended agents produce monolithic single-view components
when not given explicit decomposition guidance.

### Storybook as the Test Suite

There is no Jest, Vitest, or React Testing Library in scaffolded projects. Storybook
interaction tests (`play` functions with `@storybook/jest` and
`@storybook/testing-library`) are the only test mechanism:

-   `npm run build-storybook` proves stories compile
-   `npm run test-storybook` executes play functions in headless Chromium
-   The Interactions panel shows red/green per named `step()`

The `storybook-tdd` skill enforces a fail-first workflow: write the play function,
see it red, implement the minimum, see it green. Container stories are paced with
2-second delays between steps so the developer can watch the happy path execute.

### MSW Mock Layer

The scaffold ships with MSW (`mockServiceWorker.js` in `.storybook/public/`,
initialized in `.storybook/preview.tsx`). Container stories use
`parameters: { msw: { handlers } }` to intercept API calls at the network boundary.
Handlers live in `src/mocks/` and shape fixtures from installed `.d.ts` types.

An unhandled-request warning in the Storybook console is treated as a test failure —
the agent must add the missing handler.

### Execution Mode (Git Versioning)

The `build-widget` skill includes an execution mode decision point at the
planning-to-implementation transition. Before writing any code, the agent:

1. Detects whether the project is in a git repo
2. Asks the developer to choose a pacing mode:
    - **With git**: review-then-commit (agent pauses for review) or autonomous (agent
      commits after each green gate)
    - **Without git**: step-by-step (agent pauses) or one-shot (agent runs straight
      through)
3. Each implementation plan task maps to one atomic commit with a validation gate
   (`build-storybook` + `test-storybook`) that must pass before proceeding

### Polling Convention

Widgets that poll async operations (import runs, bulk sends) must use a 3-second
`setTimeout` interval with cleanup on unmount. This was added after a agentic autonomated testing run used 150ms polling — fast enough to overwhelm the API in production.

## Editing These Templates

When modifying templates:

1. Edit the source files in this directory
2. Run `yarn build` from the repo root — the plugin package's build step runs
   `copyfiles -a -u 1 src/**/templates/** dist` to copy templates into `dist/`
3. Verify the changes appear in `packages/plugin/dist/generators/app/templates/`
4. To test end-to-end, scaffold a fresh project with the local generator:
    ```bash
    node packages/plugin/bin/create-plugin.js
    ```

Template changes don't require TypeScript compilation — they're plain-copied. But
the `yarn build` step is still needed to update the `dist/` copy that the generator
actually reads at scaffold time.

## Provenance

These instructions evolved through the AIT-26 agentic autonomated testing "dogfood" campaign: multiple rounds of scaffolding widgets with Claude and Codex agents, comparing the output against attended (human-guided) builds, and patching the instructions to close the gaps.

Key sources of each section:

-   **OpenAPI hard rule, multipart upload convention**: friction from early dogfood
    runs where agents invented API paths that 404'd in production
-   **Component decomposition, poll interval, `var` ban**: findings from a 2×2 dogfood
    matrix (Claude Sonnet 4.6 × Codex GPT-5.4, BulkEmailFromCriteria × ImportUpload)
    compared against attended reference implementations
-   **Paced container stories**: developer feedback that play functions executed too fast
    to follow in the Storybook Interactions panel
-   **Execution mode / git versioning**: added to give developers control over pacing
    and commit granularity during agent-assisted builds
-   **CriteriaBuilder, FormRenderer, correspondence skills**: extracted from platform
    widget source code and verified against OpenAPI specs to help teach the agent how to build with some of the more-custom platform components.
