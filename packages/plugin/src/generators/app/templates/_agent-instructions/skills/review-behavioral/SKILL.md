---
name: review-behavioral
description: Use when reviewing widget code for correctness — state management, async flows, effect dependencies, loading/error/empty states, dialog lifecycle, and test quality. Run as part of a full review or standalone when the developer asks about behavior or test coverage.
---

# Behavioral Reviewer

Role: senior front-end engineer reviewing Evoke widget behavior and test coverage.

## Context

Evoke widgets follow a container/presentational split with a phase machine pattern.
The container (`index.tsx`) manages state via a discriminated-union `Phase` type and
renders one presentational component at a time. Presentational components
(`components/*.tsx`) take plain props and have no SDK hook imports.

Storybook interaction tests (`play` functions with `@storybook/jest` and
`@storybook/testing-library`) are the only test mechanism — there is no Jest, Vitest,
or React Testing Library. Each presentational component has its own story file with
play functions covering meaningful states. One container story renders the real widget
over MSW.

This reviewer covers both behavioral correctness and test quality — issues in either
category can ship bugs to production.

## Behavioral Anti-Patterns

| Anti-pattern             | Detection signal                                                                                                               | Fix direction                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Stale effect deps        | `useEffect`/`useCallback`/`useMemo` references a value not in its dependency array                                             | Add the missing dep or restructure so the closure is stable                                   |
| Async race               | `await` chain with no cancellation — a later response can overwrite an earlier UI state, or a state update fires after unmount | Use a `cancelled` flag in the `useEffect` cleanup; check it after each `await`                |
| Missing phase            | Widget has no explicit loading, error, or empty-state phase — the component renders nothing or crashes when data is absent     | Add the missing phase to the discriminated union and create a presentational component for it |
| State not reset on close | Dialog or drawer reopens with stale form values, scroll position, or selection from the previous open                          | Reset state in the dialog's `onClose` handler or remount with a key                           |
| Empty-data crash         | Code assumes a list or object is non-empty when the API can return empty or partial results                                    | Guard with explicit empty-state UI; don't index into arrays without length checks             |
| Unhandled API error      | `catch` block swallows errors silently, or there is no `catch` at all — the widget appears frozen on failure                   | Transition to the error phase with a user-visible message and a retry action                  |
| Phase machine bypass     | Container renders JSX directly instead of delegating to a presentational component — breaks the one-component-per-phase rule   | Move the JSX into a dedicated `<PhaseView>` component under `components/`                     |

## Test Quality Anti-Patterns

| Anti-pattern                | Detection signal                                                                                                         | Fix direction                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Mock-only assertion         | Play function asserts on MSW handler call count or mock arguments without verifying what the user sees                   | Assert on rendered text, element presence, or visual state changes — the user outcome, not the plumbing                         |
| Missing component story     | A presentational component under `components/` has no corresponding `.stories.tsx` file                                  | Add a story file with play functions covering the component's meaningful states                                                 |
| Untested phase              | A phase in the discriminated union has no story or play function exercising it                                           | Add a presentational story for that phase with args matching the phase's data shape                                             |
| Brittle query               | Play function finds elements by `data-testid`, CSS class, or DOM structure rather than accessible role/name/text         | Use `getByRole`, `getByLabelText`, `getByText`, or `findByRole` for async — validates accessibility and behavior simultaneously |
| Unnamed steps               | Play function uses anonymous assertions instead of `step('description', async () => { ... })`                            | Wrap each logical assertion group in a named `step()` — the Interactions panel becomes readable                                 |
| Container story without MSW | Container story renders the real widget but doesn't set `parameters: { msw: { handlers } }` — network calls go unhandled | Add MSW handlers covering every endpoint the container hits; unhandled-request warnings are test failures                       |
| Missing error-path story    | Only the happy path has a play function; error responses, empty results, and edge cases are untested                     | Add stories with MSW handlers that return error responses (500, 404) and empty arrays                                           |

## Review Checklist

### Behavior

1. **Phase coverage**: Every phase in the `Phase` union has a presentational component.
   The container's `switch` is exhaustive (no `default` that silently swallows new phases).
2. **Async safety**: Every `useEffect` with async work has a `cancelled` flag checked
   after awaits. No fire-and-forget promises.
3. **Error handling**: API failures transition to an error phase with a user-visible
   message. No silent `catch` blocks.
4. **Dialog lifecycle**: Dialogs reset their internal state on close. Focus returns to
   the trigger.
5. **Empty state**: The widget handles zero results gracefully — a message, not a
   blank space or a crash.

### Tests

6. **Story coverage**: Every presentational component has a story file. Every phase has
   at least one story.
7. **Play function quality**: Assertions test user-visible outcomes. Queries use
   accessible selectors. Steps are named.
8. **Container story**: One MSW-backed story exercises the primary workflow end-to-end.
   All API paths have handlers.
9. **Error path**: At least one story covers an API error response.

## Review Output

Report P0–P3 findings with the user-visible behavior that could regress. Each finding
includes the file, the specific pattern, why it matters to a user, and the fix
direction. If the code is clean, cite the phase coverage, cleanup patterns, error
handling, and test assertions that prove it.
