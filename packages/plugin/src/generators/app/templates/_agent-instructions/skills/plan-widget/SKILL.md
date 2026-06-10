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
5. **Storybook split** — can the rendering logic be a presentational component
   (props in, JSX out) so it can be previewed in Storybook without platform context?

## Blueprint Contents

-   Purpose (one paragraph)
-   Target page/context, and data source / instance needs
-   Table of Builder-configurable props (name, type, required?)
-   SDK hooks used and why
-   Presentational/container split, if any
-   Acceptance criteria (testable bullet list)

Confirm the blueprint with the developer before writing code.
