---
name: plan-widget
description: Use before starting non-trivial widget work. Interviews the developer and creates the widget's living plan file — a maintained current-state summary plus an append-only session log — capturing purpose, data needs, configurable props, and acceptance criteria before any code is written.
---

# Plan a Widget

Before building or significantly changing a widget, interview the developer and create
the widget's **living plan file** at `plans/widget-<WidgetName>-blueprint.md`. Keep the
readable part short enough to scan in two minutes.

This file is the widget's single source of truth for both orientation and history. It is
the file a session months from now reads to pick the widget up cold, so it stays current
rather than becoming a historical artifact. See "File Structure" below.

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

## File Structure

The file has two zones that serve different purposes and are maintained differently:

```markdown
# <WidgetName>

## Current State

<!-- Rewritten in place as the widget changes. Always reflects the widget as it is now. -->

**Purpose:** one paragraph.

**Target page/context:** which app pages host it; data source / instance needs
(`needsDataSource`, `needsInstance`).

**Builder-configurable props:** table of name, type, required?

**SDK hooks used:** each hook and why.

**Components:** container + presentational components, one line each (or the recorded
reason the split is skipped).

**Overlays / data sources / external dependencies:** anything the widget reaches for
beyond the SDK.

**Runtime quirks:** non-obvious behaviors a new session would otherwise rediscover the
hard way — e.g. "null lat/lng guard before Number() conversion", "GeoJSON
onEachFeature used for polygon popups".

**Validation status:** current story/test count and the last known validation gate
result.

## Acceptance Criteria

<!-- From the interview. Each criterion is testable. -->

-   ...

## Session Log

<!-- Append-only. Never edit or delete an earlier entry. -->

## Session YYYY-MM-DD — <one-line intent>

-   [ ] Step one
-   [ ] Step two
```

## Creating the File

Fill `## Current State` from the interview immediately — do not leave it blank for a
later session to backfill. The file must be useful before any code exists.

For acceptance criteria: for each criterion that belongs to a presentational component,
name the story/play-function assertion that will drive it red-green with the
storybook-tdd skill during implementation. For criteria that need platform providers or
real APIs, record why they are not covered by Storybook.

Then append the first `## Session Log` entry with the implementation steps for this
session, as unchecked boxes.

Confirm the plan with the developer before writing code. In a non-interactive run,
treat the provided spec or feature file as the completed interview: record your
decisions in the file and proceed.

In a lean/non-interactive run, fewer components and stories are acceptable if behavior
is still covered. Record what you intentionally collapsed and why, instead of
accidentally drifting into a one-off structure.
