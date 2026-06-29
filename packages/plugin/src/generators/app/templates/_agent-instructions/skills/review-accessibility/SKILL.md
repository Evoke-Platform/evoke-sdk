---
name: review-accessibility
description: Use when reviewing widget code for accessibility — forms, controls, dialogs, tables, keyboard interaction, labels, ARIA, focus behavior, color contrast, error messages, or dynamic UI updates. Run as part of a full review or standalone when the developer asks about accessibility.
---

# Accessibility Reviewer

Role: senior accessibility engineer applying WCAG 2.2 AA to React + MUI widgets.

## Context

Evoke widgets use MUI components imported through `@evoke-platform/sdk`. MUI provides
baseline accessibility (focusable buttons, dialog focus traps, form label association),
but agent-generated code frequently undermines it with missing accessible names, broken
focus restoration, and silent state changes.

Widgets follow a container/presentational split: `index.tsx` manages state and SDK hooks;
`components/*.tsx` render pure JSX. Review presentational components — those are what
users interact with. The container only renders one presentational component at a time
via a phase machine (`switch` on `phase.kind`).

Storybook interaction tests (`play` functions with `@storybook/testing-library`) are
the only test mechanism. Accessible queries in play functions (`getByRole`,
`getByLabelText`) serve double duty — they prove the component works AND prove
accessibility hooks are wired up.

## Anti-Patterns

| Anti-pattern                        | Detection signal                                                                                                   | Fix direction                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nameless control                    | Button, IconButton, input, or link has no accessible name — no visible label, `aria-label`, or `aria-labelledby`   | Add visible label text or `aria-label`; for IconButton, always provide `aria-label` describing the action (e.g. `aria-label="Approve request"`)                 |
| Keyboard trap                       | Focus enters a dialog or popover and cannot leave via Escape or Tab; focus is not restored to the trigger on close | Use MUI `Dialog` (has built-in focus trap + restoration); if custom, add Escape handler and restore focus to the triggering element                             |
| Silent state change                 | Phase transition (loading → complete), async result, toast, or error appears without screen-reader announcement    | Add `aria-live="polite"` region for status updates; use `aria-live="assertive"` for errors that require immediate attention                                     |
| Table without headers               | Data rendered in `<table>` or `DataGrid` without column headers, or with headers that don't describe the data      | Ensure `<th>` elements or DataGrid column `headerName` values are descriptive; add `aria-label` to the table if its purpose isn't clear from context            |
| Contrast regression                 | Text, icon, button, or focus indicator loses minimum contrast against its background                               | Use MUI theme tokens (`text.primary`, `text.secondary`, `action.active`); verify custom colors meet 4.5:1 for normal text, 3:1 for large text and UI components |
| Confirmation dialog without context | Approve/deny/delete confirmation shows a generic message without identifying what is being acted on                | Include the specific item (name, title, ID) in the dialog content so screen-reader users know what they are confirming                                          |
| Non-semantic test queries           | Play function uses `getByTestId` when `getByRole` + accessible name would work                                     | Replace with `getByRole('button', { name: 'Approve' })`, `getByLabelText('Denial reason')`, etc. — this validates real accessibility                            |

## Review Checklist

For each presentational component:

1. **Controls**: Every interactive element (button, link, input, select, checkbox) has
   an accessible name — either visible text content, an associated `<label>`, or
   `aria-label`/`aria-labelledby`.
2. **Keyboard path**: The component is fully operable via keyboard. Tab order follows
   visual order. Dialogs trap focus and restore it on close. No interaction requires
   mouse hover.
3. **State announcements**: Phase transitions, loading completion, error messages, and
   action confirmations reach screen readers — via live regions, associated error text,
   or dialog focus management.
4. **Semantic structure**: Tables have headers. Lists use `<ul>`/`<ol>`. Headings follow
   a logical hierarchy. ARIA roles are used only when no native element fits.
5. **Color independence**: Information is not conveyed by color alone — error states have
   text or icons, not just red borders.

## Review Output

Report P0–P3 findings with the affected user interaction. Each finding includes the
component file, the control or element, why a user with a disability would be blocked or
confused, and the fix direction. If the component is clear, cite the accessible names,
keyboard path, focus behavior, and announcement coverage that prove it.
