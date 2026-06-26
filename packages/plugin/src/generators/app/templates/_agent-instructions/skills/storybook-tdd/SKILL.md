---
name: storybook-tdd
description: Red-green TDD for widgets using Storybook interaction tests — write a failing play function first, watch it go red in the Interactions panel, implement until green. Use when building or changing presentational widget components, when acceptance criteria need executable tests, when the user says TDD, test-first, play function, or interaction test, or when a developer wants to watch the widget being built.
---

# Storybook Interaction TDD

Widgets in this scaffold are tested with **Storybook interaction tests**: a story's
`play` function runs after render, drives the component with `userEvent`, and asserts
with `expect`. The Interactions panel shows every step with a green check or a red X —
so the test run is _visible_, live, next to the rendered component. The scaffold also has
`@storybook/test-runner`, so `npm run test-storybook` executes the same play functions in
Chromium and exits nonzero when a story is red.

## The red-green loop

1. **Pick one acceptance criterion** from the widget blueprint (plan-widget output).
2. **Write the story + play function FIRST** — against the presentational component,
   driving it through props (`args`) and DOM interaction only.
3. **See it red.** With `npm run storybook` running in one terminal, run
   `npm run test-storybook` in another. The command should fail for the new behavior
   before implementation. In attended sessions, the Interactions panel should show the
   same failing step. Never skip this — a test that has never failed proves nothing.
4. **Implement the minimum** to satisfy the assertion.
5. **See it green.** Re-run `npm run test-storybook`; it should pass. If Storybook is
   open, the Interactions panel should also go green.
6. **Refactor** with the test green, then repeat with the next criterion.

In an attended session the developer is watching the same panel and canvas — they can
interact with the component mid-build and give feedback. Treat that feedback as new
failing play functions, not as ad-hoc fixes.

## Watched Storybook surface

When a developer or browser automation is watching the loop, keep the Storybook manager
open to a real story with the Interactions panel selected. Prefer opening a primary
container/Playground story that shows the whole widget's main flow rather than a leaf
fragment story (spinner, empty state, etc.). If story ordering makes the wrong story
appear first, correct it in the project-level Storybook config (`storySort` in
`.storybook/preview.tsx`) or navigate directly to the intended story URL.

```text
http://127.0.0.1:6006/?path=/story/<story-id>&addonPanel=storybook/interactions/panel
```

Get `<story-id>` from `http://127.0.0.1:6006/index.json`; do not guess it from the file
name. Do not use `iframe.html` as the human-facing watch surface — a bad id there shows
a large missing-story error instead of a useful UI. The manager URL keeps the rendered
component visible while the bottom panel shows `PASS`/`FAIL` and the named steps.

## The pattern

```tsx
import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import type { Meta, StoryObj } from '@storybook/react';

import { RecipientsView } from './RecipientsView';

const meta = {
    title: 'BulkEmail/RecipientsView',
    component: RecipientsView,
} satisfies Meta<typeof RecipientsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DisablesSendWithoutTemplate: Story = {
    args: {
        recipients: [{ id: '1', name: 'Ada', email: 'ada@example.com' }],
        selectedTemplateId: undefined,
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Intent: send stays disabled until a template is selected', async () => {
            await expect(canvas.getByRole('button', { name: /send/i })).toBeDisabled();
        });

        // Interactions are awaited userEvent calls inside named steps:
        // await step('User applies criteria', async () => {
        //     await userEvent.click(canvas.getByRole('button', { name: /apply/i }));
        //     await expect(await canvas.findByText('1 recipient matched')).toBeInTheDocument();
        // });
    },
};
```

Rules of the pattern:

-   `expect` comes from `@storybook/jest` (jest-dom matchers like `toBeInTheDocument`
    and `toBeDisabled` are pre-extended). `within`/`userEvent` come from
    `@storybook/testing-library`. Do not import from `@testing-library/react` directly
    in stories.
-   `await` every `userEvent` call and every `expect` — the panel logs each awaited
    step, which is what makes the run watchable and step-through debuggable.
-   Wrap meaningful assertions and interactions in `step('plain-language intent', async () => { ... })`.
    The step names should read like acceptance criteria, because they are what the
    developer sees in the Interactions panel during red/green work.

    Without `step()` wrappers the Interactions panel shows raw matcher strings
    (`getByRole('button', {name: /send/i}).toBeDisabled`) instead of readable intent.
    Always name the intent:

    ```tsx
    // Bad — Interactions panel shows raw matcher, unreadable as spec
    await expect(canvas.getByRole('button', { name: /send/i })).toBeDisabled();

    // Good — panel shows "Send button is disabled before file is selected"
    await step('Send button is disabled before file is selected', async () => {
        await expect(canvas.getByRole('button', { name: /send/i })).toBeDisabled();
    });
    ```

-   Query like a user: `getByRole`, `getByLabelText`, `getByText`. After an interaction,
    use `await canvas.findByText(...)` for anything that appears asynchronously.
-   Assert **user-visible behavior** (what renders, what's disabled, what appears after
    a click) — never implementation details (state variables, handler call counts,
    CSS classes).
-   One behavior per story. The story name states the expectation
    (`DisablesSendWithoutTemplate`, `ShowsSkippedCountAfterSend`) — the sidebar becomes
    a readable spec.
-   If the component renders through a portal (`Dialog`, `Menu`, popovers), query
    `within(document.body)` instead of `within(canvasElement)` for portal content.
-   If a DataGrid is on screen, its pagination UI may add a second `combobox`. Prefer
    role-and-name queries such as `getByRole('combobox', { name: /template/i })` and use
    visible summary/count assertions instead of brittle row-by-row DOM checks because
    rows are virtualized.
-   Container stories run the real widget over the scaffold's MSW mock layer
    (`src/mocks/`): pass `parameters: { msw: { handlers } }`, assert on what the
    handlers received (e.g. the exported `requestLog`), and treat a
    `[MSW] Warning: captured a request without a matching request handler` in the
    preview console as a failing signal — add the missing handler. If
    `.storybook/public` is missing (install ran with `--ignore-scripts`), run
    `npx msw init` once.
-   MSW intercepts HTTP only. If a container story depends on missing React providers,
    record that honestly and keep most red/green coverage in presentational stories.
-   The container/Playground story should have a play function that walks through the
    widget's primary end-to-end flow using named `step()` calls. This makes the full
    lifecycle (e.g. upload → progress → result) visible and readable in the Interactions
    panel.
-   **Pace the container story for watchability.** Each named `step()` in a container
    or end-to-end play function must begin with a 2-second delay so the developer can
    read the step name in the Interactions panel and watch the UI change before the next
    step runs. Use a `wait` helper at the top of each step:

    ```tsx
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('User uploads a CSV file', async () => {
            await wait(2000);
            // ... interaction and assertions
        });

        await step('Progress bar reaches 100%', async () => {
            await wait(2000);
            // ... interaction and assertions
        });

        await step('Results summary shows 5 created', async () => {
            await wait(2000);
            // ... assertions
        });
    };
    ```

    The `wait` helper is intentional — it makes the Interactions panel usable as a
    live walkthrough of the widget's happy path. Do not skip it and do not reduce the
    delay below 2 seconds. The delay goes at the _start_ of each step (before the
    interaction), not at the end — this gives the developer time to read the step name
    before the UI changes.

-   The Interactions panel's replay button lets the developer re-run or interact
    manually after the play function completes.
-   For no-op callback args in stories, use `() => {}` rather than returning `undefined`
    unless the callback's return value is part of the behavior.
-   Be careful with `aria-label`: it overrides visible text in accessible-name queries.
-   Avoid broad text matchers that accidentally match several nodes (for example `/4/`
    matching both `42` and `4`). Prefer role/name queries or labeled text.

## CLI Verification

Use this exact loop when the developer asks for TDD, when writing non-trivial
presentational components, or in dogfood runs:

```bash
# Terminal 1 — attended session: use the normal dev server command; do not add `--ci`
npm run storybook -- --host 127.0.0.1

# Terminal 2
npm run test-storybook
```

> **`--ci` is prohibited in attended sessions.** The `--ci` flag suppresses the browser
> from opening — it exists for headless pipeline use only. In an attended session, use
> the normal Storybook dev-server command and keep the browser visible so the developer
> can watch the Interactions panel go red → green in real time.

> **New story files require a dev server restart.** After scaffolding new widget story
> files while Storybook is already running, webpack HMR will not always discover them.
> Stop the dev server (`Ctrl+C`) and run `npm run storybook` again before running
> `test-storybook`.

Expected signals:

-   Before implementation, the new story's play test fails and the terminal names the
    failing story and assertion. Keep that failure; it proves the assertion is meaningful.
-   A browser-launch error from `test-storybook` ("Executable doesn't exist",
    `browserType.launch`) is an environment failure, not a red test — the scaffold's
    `postinstall` normally downloads Chromium; run `npx playwright install chromium`
    and retry. Do not change the component.
-   `build-storybook` size warnings are usually non-blocking. Treat them as noise unless
    they line up with a real broken story or build failure.
-   After implementation, `npm run test-storybook` passes.
-   If an existing story fails, treat the failure as feedback about either the component
    or the story. Fix the real issue before moving on.

When using browser automation against Storybook:

-   Human/watchable surface: manager URL with the Interactions panel.
-   Harness capture: manager URL with bounded waits. Do not wait on `networkidle` for
    the manager page; HMR, preview traffic, and the Interactions panel can keep the
    network busy.
-   Playwright against manager URL: the story canvas is inside an iframe. Use
    `page.frameLocator('#storybook-preview-iframe')` to query story content — a direct
    `page.getByRole(...)` will time out because it searches the manager shell, not the
    rendered story.
-   Plain screenshot only: `iframe.html?id=<story-id>&viewMode=story` with
    `waitUntil: 'load'` is acceptable and avoids the manager's WebSocket traffic.
    It is not the preferred watch surface for red/green work.

In unattended dogfood runs, the harness runs `npm run test-storybook` after the builder
finishes. The builder should still write play functions before implementation and report
which red/green checks it performed. If it could not run the CLI loop itself, say so
plainly; the harness result is the final automated signal.

## Regression-first Storybook loop

When a developer reports a reproducible widget bug during an attended session and the
widget can be exercised in Storybook/MSW, add or tighten a failing story/play function
**before** changing component code. Record the failing story, named step, and red signal
(`test-storybook` output, Interactions panel failure, or console error).

### Production-shaped fixtures

Main container stories should include at least one fixture set shaped like real platform
data rather than minimal stubs. Cover:

-   related/nested object values (not just flattened strings) so rendering code that
    dereferences `.property.value` or `.relatedObject.name` exercises real shapes
-   missing or optional fields that the widget should handle gracefully (empty strings,
    `null`, absent keys)
-   rows in different completion states (e.g. pending, completed, failed, skipped) so
    conditional rendering and status display paths all exercise
-   duplicate visible values (e.g. two rows with the same name but different IDs) so
    assertions and key-based rendering don't accidentally assume uniqueness
-   enough rows to exercise pagination, overflow, and virtualization if the widget uses
    a `DataGrid` or long list

When possible, ground fixture shapes in verified platform metadata — the installed
`.d.ts` types and the live/cached OpenAPI specs.

### Console, network, and runtime errors are red signals

A React hook-order error, an unhandled MSW request warning, a 404 or failed fetch, or a
visible console error during a story is a failing test condition — not optional diagnostic
noise. When observed, add or tighten a story to reproduce the error before fixing.

### Visual and layout checks

For high-value widget stories, check for:

-   no unexpected horizontal overflow on first paint
-   usable popover/dialog widths
-   stable height across state transitions (no layout jump between states)
-   no oscillating scrollbar or flicker after user actions

Some of these are assertable in play functions via DOM metrics without screenshot tooling:

```tsx
await step('No horizontal overflow on first paint', async () => {
    const el = canvas.getByTestId('widget-root');
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
});

await step('Filter popover is at least 300px wide', async () => {
    const popover = document.querySelector('[role="presentation"] .MuiPaper-root');
    expect(popover?.getBoundingClientRect().width).toBeGreaterThanOrEqual(300);
});
```

For issues that require visual judgment (flicker, animation jank, aesthetic spacing),
treat them as red signals when observed in attended sessions. If a Playwright script is
available, capture screenshots for the record.

### Name the TDD mode

When narrating or logging the loop, distinguish between:

-   **New criterion** — red-green work from a planned acceptance criterion
-   **Regression reproduction** — failing story from a developer-reported bug
-   **Refactor** — changes under existing green coverage

This makes it auditable whether the run followed fail-first TDD or used tests as
after-the-fact regression feedback.

## Scope and limits

-   **Presentational components first.** Container stories are encouraged when the
    scaffolded router plus MSW are enough, but Storybook is not a full App Viewer
    runtime. If a container depends on providers the scaffold does not have, record that
    limitation and keep the container nearly all delegation. Pure logic (e.g. a
    Mongo→Where converter) belongs in plain functions; if the developer wants a CLI test
    runner for those, propose adding one (e.g. Vitest) and get agreement first — do not
    add dependencies or mocks unilaterally.
-   `npm run build-storybook` only proves stories compile. `npm run test-storybook`
    executes play functions and is the pass/fail signal for interaction behavior.
-   Cover the main states of every presentational component via `args`: loaded, empty,
    error, in-progress — each as its own story, each with a play function when there is
    behavior to assert.
-   **Testing callbacks:** Mutating `args.onCallback` inside a `play` function after
    render has no effect — the component already bound to the original function. Instead,
    put a module-level counter or flag in the story's `args` at definition time and
    assert it changed, or assert a visible state change triggered by the callback.
-   **HMR cache errors:** If `npm run test-storybook` fails with
    `MissingStoryAfterHmrError`, restart Storybook first. If it persists, clear the
    webpack cache and re-run:
    `rm -rf node_modules/.cache/storybook && npm run test-storybook`
