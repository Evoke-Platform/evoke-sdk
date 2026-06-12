---
name: plan-widget
description: Use before starting non-trivial widget work. Interviews the developer and produces a short blueprint capturing purpose, data needs, configurable props, and acceptance criteria before any code is written.
---

# Plan a Widget

Before building or significantly changing a widget, interview the developer and write a
blueprint to `plans/widget-<WidgetName>-blueprint.md`. Keep it short enough to read in
two minutes.

## Interview Questions

Ask only what is not already known:

1. **Purpose** — what does the widget show or let the user do?
2. **Target page/context** — which app pages will host it? Does it need a bound Data
   Source object (`needsDataSource`) or a specific instance (`needsInstance`)?
3. **Builder-configurable props** — which settings should app builders control through
   `WidgetProperties.json`, and which are hardcoded?
4. **SDK hooks** — which platform context does it need? Common hooks:
   `useAuthenticationContext`, `useApiServices`, `useObject`, `useNotification`,
   `usePageParam`, `useNavigate`, `useApp`.
5. **Presentational split** — the default structure is a thin container (`index.tsx`,
   holding all SDK hooks and state) over presentational components (props in, JSX out)
   in `components/`, each with a Storybook story. Only a trivial widget with no SDK
   hooks or network calls may skip the split — record the reason in the blueprint.

## Blueprint Contents

-   Purpose (one paragraph)
-   Target page/context, and data source / instance needs
-   Table of Builder-configurable props (name, type, required?)
-   SDK hooks used and why
-   Container/presentational component list (or the recorded reason the split is skipped)
-   Acceptance criteria (testable bullet list). For each criterion that belongs to a
    presentational component, name the story/play-function assertion that will drive it
    red-green with the storybook-tdd skill during implementation. For criteria that need
    platform providers or real APIs, record why they are not covered by Storybook.

Confirm the blueprint with the developer before writing code. In a non-interactive run,
treat the provided spec or feature file as the completed interview: record your
decisions in the blueprint and proceed.
