---
name: storybook-tdd
description: Red-green TDD for widgets using Storybook interaction tests — write a failing play function first, watch it go red in the Interactions panel, implement until green. Use when building or changing presentational widget components, when acceptance criteria need executable tests, when the user says TDD, test-first, play function, or interaction test, or when a developer wants to watch the widget being built.
---

# Storybook Interaction TDD

Widgets in this scaffold are tested with **Storybook interaction tests**: a story's
`play` function runs after render, drives the component with `userEvent`, and asserts
with `expect`. The Interactions panel shows every step with a green check or a red X —
so the test run is _visible_, live, next to the rendered component.

## The red-green loop

1. **Pick one acceptance criterion** from the widget blueprint (plan-widget output).
2. **Write the story + play function FIRST** — against the presentational component,
   driving it through props (`args`) and DOM interaction only.
3. **See it red.** With `npm run storybook` running, the story hot-reloads and the
   Interactions panel shows the failing step. Never skip this — a test that has never
   failed proves nothing.
4. **Implement the minimum** to satisfy the assertion. HMR re-renders; the panel goes
   green.
5. **Refactor** with the panel green, then repeat with the next criterion.

In an attended session the developer is watching the same panel and canvas — they can
interact with the component mid-build and give feedback. Treat that feedback as new
failing play functions, not as ad-hoc fixes.

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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('button', { name: /send/i })).toBeDisabled();

        // Interactions are awaited userEvent calls:
        // await userEvent.click(canvas.getByRole('button', { name: /apply/i }));
        // await expect(await canvas.findByText('1 recipient matched')).toBeInTheDocument();
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
-   Query like a user: `getByRole`, `getByLabelText`, `getByText`. After an interaction,
    use `await canvas.findByText(...)` for anything that appears asynchronously.
-   Assert **user-visible behavior** (what renders, what's disabled, what appears after
    a click) — never implementation details (state variables, handler call counts,
    CSS classes).
-   One behavior per story. The story name states the expectation
    (`DisablesSendWithoutTemplate`, `ShowsSkippedCountAfterSend`) — the sidebar becomes
    a readable spec.

## Scope and limits

-   **Presentational components only.** SDK hooks cannot render in Storybook (no
    platform providers), so the container (`index.tsx`) stays thin and untested here —
    its logic should be nearly all delegation. Pure logic (e.g. a Mongo→Where
    converter) belongs in plain functions; if the developer wants a CLI test runner for
    those, propose adding one (e.g. Vitest) and get agreement first — do not add
    dependencies or mocks unilaterally.
-   **There is no CLI test signal in this scaffold.** The Interactions panel is the
    red-green display, and the developer is the verifier in attended sessions. In an
    unattended run, state plainly which behaviors are covered by play functions and
    that they were not executed; `npm run build-storybook` only proves stories compile.
-   Cover the main states of every presentational component via `args`: loaded, empty,
    error, in-progress — each as its own story, each with a play function when there is
    behavior to assert.
