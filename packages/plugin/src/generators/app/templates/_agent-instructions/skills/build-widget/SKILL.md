---
name: build-widget
description: Required workflow for creating or materially changing Evoke widgets — architecture, WidgetProperties.json, container/presentational split, Storybook TDD, MSW stories, and verification. Use for every new widget and every non-trivial change to an existing widget, not only for initial scaffolding.
---

# Build a Widget

## Prerequisites

This skill assumes the plugin scaffold already exists: `package.json`, `src/`,
`webpack.config.js`, and `.storybook/` are all present. If any of these are absent, the
plugin has not been generated yet — run the generator first:

```bash
# Local (unreleased) build:
node /path/to/evoke-sdk/packages/plugin/bin/create-plugin.js

# Published release:
npx @evoke-platform/plugin
```

Do **not** re-run the generator if the scaffold is already present — it will overwrite
configuration files.

## Execution Mode

Before writing any widget code, determine how the developer wants to pace and version
the implementation. This decision happens once — after the blueprint is confirmed and the
implementation plan is ready, at the moment the agent is about to write the first file.

### Step 1: Detect git

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

### Step 2: Ask the developer

**If git is available**, present these options:

> The implementation plan has N steps, each producing an atomic commit. How would you
> like to proceed?
>
> 1. **Review-then-commit (recommended)** — I implement each step, run the validation
>    gate (build-storybook + test-storybook), stage the changes, and show you the diff.
>    You review in Storybook, then tell me to commit and continue.
> 2. **Autonomous** — I implement each step, run the validation gate, and commit
>    automatically after each green gate. You review the full history at the end.

**If git is not available**, present these options:

> No git repo detected. How would you like to proceed?
>
> 1. **Step-by-step (recommended)** — I implement each step, run the validation gate,
>    and pause for your review before continuing to the next step.
> 2. **One-shot** — I implement the full plan without stopping. You review the result
>    at the end.

### Step 3: Carry the mode

Record the developer's choice and follow it through the entire build:

-   **Review-then-commit**: After each implementation plan step passes its validation
    gate, stage the relevant files and present the diff. Wait for the developer to
    confirm before running `git commit`. Use the implementation plan's task title as
    the commit message subject, prefixed with the project's commit convention. Do not
    push — the developer pushes.
-   **Autonomous**: After each step's validation gate passes, stage and commit
    immediately. Use the plan's task title as the commit subject. Log each commit hash
    so the developer can review the history or revert individual steps. Do not push.
-   **Step-by-step** (no git): Pause after each step's validation gate and wait for
    the developer's go-ahead. No commits.
-   **One-shot** (no git): Execute all steps without stopping. Run the full validation
    gate at the end.

### Validation gate (per step)

Each atomic step must pass before staging/committing or continuing:

```bash
npm run build             # manifestgen + production webpack
npm run build-storybook   # stories compile
npm run test-storybook    # play functions pass
```

If the gate fails, fix the issue in the current step before moving on. Never commit
red code or skip a failing gate.

### Commit boundaries

Each of these is one atomic commit:

1. `WidgetProperties.json` + container skeleton (`index.tsx` with phase type and empty switch)
2. Each presentational component + its story file (one commit per component)
3. Container story + MSW handlers
4. Final verification pass (any fixups from the full validation gate)

The implementation plan's task breakdown defines the exact boundaries. One task = one
commit.

## Widget File Structure

Create:

```text
src/widgets/<WidgetName>/
├── index.tsx                  # thin container: SDK hooks, state, handlers — no layout JSX
├── <WidgetName>.stories.tsx   # container story: real widget over the MSW mock layer
├── WidgetProperties.json
└── components/                # presentational components: props in, JSX out
    ├── <Name>View.tsx
    └── <Name>View.stories.tsx
```

### Component Decomposition Rule

Each distinct widget phase or mode (idle, loading, in-progress, complete, error, empty)
must be its own presentational component under `components/`. The container (`index.tsx`)
uses a discriminated-union state type to track the current phase and renders exactly one
presentational component at a time based on that state:

```tsx
// index.tsx — container renders one view per phase
type Phase =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'in-progress'; progress: number }
    | { kind: 'complete'; result: Result }
    | { kind: 'error'; message: string };

const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

switch (phase.kind) {
    case 'idle':
        return <IdleView onStart={handleStart} />;
    case 'loading':
        return <LoadingView />;
    case 'in-progress':
        return <ProgressView progress={phase.progress} />;
    case 'complete':
        return <CompleteView result={phase.result} onReset={handleReset} />;
    case 'error':
        return <ErrorView message={phase.message} onRetry={handleRetry} />;
}
```

Do not combine multiple phases into a single component that switches internally with
`if`/`else` or conditional rendering blocks — that produces monolithic views that are
hard to test in isolation. Each `<PhaseView>` gets its own story file with play functions
covering its specific states and interactions.

`index.tsx` default-exports a React function component whose props match the
`properties` declared in `WidgetProperties.json` — each property's `name` becomes a
React prop with the value the app builder configured.

Widgets are discovered by `manifestgen` (from `WidgetProperties.json` and JSDoc tags)
and exposed through Module Federation from `dist/manifest.json`. Do **not** add the
widget to `src/index.ts` — that file only registers payment gateways.

## WidgetProperties.json Shape

```json
{
    "$schema": "https://raw.githubusercontent.com/Evoke-Platform/evoke-sdk/main/widgetschema.json",
    "id": "MyWidget",
    "name": "My Widget",
    "description": "What it does",
    "version": "1.0.0",
    "src": "src/widgets/MyWidget",
    "properties": [{ "name": "message", "type": "text", "isOptional": true, "displayName": "Message" }]
}
```

Property types: `text`, `number`, `boolean`, `date`, `choices`, `inputGroup`,
`actionButtons`, `documentUpload`, `columnSelector`, `filter`.

Common top-level flags:

-   `needsDataSource` — binds the widget to a Data Source object; exposes `$_objectId`
    in `api.url` configurations
-   `needsInstance` — the widget needs a specific object instance
-   `allowChildren` — the widget is a container; the component receives `children`
-   `allowSticky`, `needsDocument`, `typesSupported`, `deprecated`, `betaRelease`

Icon: `"icon": { "src": "Extension" }` — an MUI icon name without the trailing `Icon`.

## How Flag Values Reach the Widget at Runtime

-   `needsDataSource` — the Builder's data-source selection is delivered as the
    `objectId` prop (the platform's own widgets rely on this), and `$_objectId` resolves
    to it inside `api.url` configurations.
-   Route parameters — a property whose saved value is the sentinel `'$_param'` is
    replaced at render time with the page route parameter of the same name. This is how
    instance pages deliver `instanceId` to widgets that declare an `instanceId` property.
    Prefer `usePageParam('instanceId')` / `usePageParams()` in runtime code when page
    params are already available.
-   App Viewer also injects a `navigateTo` function prop for in-app navigation, alongside
    the other runtime props listed in the project instructions.

## Dynamic Settings: mappedValues and visibility

Two `WidgetProperties.json` features whose syntax is hard to guess. This is the (trimmed)
`formId` property of the platform's own Form widget — a dropdown whose API call depends on
two other settings, shown only when a checkbox is off:

```json
{
    "name": "formId",
    "type": "choices",
    "displayName": "Form",
    "api": {
        "url": "/forms?filter[where][objectId]=$_objectId&filter[where][actionId]=$_actionId",
        "resultMapping": { "value": "id", "label": "name" },
        "mappedValues": {
            "$_objectId": "objectId",
            "$_actionId": "formSettings.actionId"
        }
    },
    "visibility": {
        "operator": "and",
        "conditions": [{ "field": "useAutoGenForm", "operator": "notEquals", "value": true }]
    },
    "isOptional": true
}
```

-   **`mappedValues`** maps each `$_token` in `api.url` to the name of another property.
    Dotted paths reach into `inputGroup` values (`formSettings.actionId`); inside a
    repeatable `inputGroup`, use `[$Index]` to reference the current row (e.g.
    `filters[$Index].sourceObject`). When a source setting changes, the Builder clears
    dependent saved values automatically. `$_objectId`, `$_actionId`, and `$_appId` also
    resolve automatically from the widget's saved settings even **without** a
    `mappedValues` entry — the `needsDataSource` selection is stored as `objectId`, so
    `$_objectId` in an `api.url` always reaches the bound data source object.
-   **`visibility`** takes an `operator` (`and`/`or`) and `conditions` comparing another
    property's value with `equals`/`notEquals`. Values may be strings, booleans, or
    numbers. In repeatable `inputGroup`s, conditions evaluate against the current row.
-   **`hidden: { "dataType": [...] }`** hides a property for specific data source types
    (e.g. `["documents"]`) — useful when a widget supports several `typesSupported`.

To let the app builder pick one of the data source object's properties (e.g. which
property holds an email address), use a `choices` property whose API call returns the
object's property list — the platform's own Form widget uses this exact pattern:

```json
{
    "name": "emailPropertyId",
    "type": "choices",
    "displayName": "Email Property",
    "api": {
        "url": "/objects/$_objectId/effective/properties",
        "resultMapping": { "value": "id", "label": "name" }
    }
}
```

`resultMapping` maps over the array the endpoint returns — use sub-resource endpoints
that return arrays directly (`/objects/$_objectId/effective/properties`,
`/objects/$_objectId/effective/actions`) rather than trying to extract nested arrays
from a parent object response.

The full schema is not shipped locally — it lives at the `$schema` URL
(<https://raw.githubusercontent.com/Evoke-Platform/evoke-sdk/main/widgetschema.json>).
Fetch it when a property shape is in doubt; it is small and the definitive validator
input.

## TypeScript Prop Mapping

| JSON type    | TypeScript prop                           |
| ------------ | ----------------------------------------- |
| `text`       | `string`                                  |
| `number`     | `number`                                  |
| `boolean`    | `boolean`                                 |
| `date`       | `string` (date string)                    |
| `choices`    | `string`, or `string[]` with `isMultiple` |
| `inputGroup` | `object`, or `object[]` with `isMultiple` |

Mark properties with `isOptional: true` as optional (`?`) in the props type. A property
is optional **only** when `isOptional: true` — omitting the key (or setting `false`)
means required in the Builder.

## Platform Entity Selector Properties

Any widget property whose value is selected from a list of existing platform resources
(imports, forms, objects, actions, instances, users, reports, etc.) **must** use
`"type": "choices"` with an `"api"` block — never `"type": "text"`. A text input
requires the app builder to know and manually type an internal ID (e.g.
`"hG2zsIlMj044WyiDtFIC3"`), which is not a supported Builder UX pattern.

```json
{
    "name": "importId",
    "type": "choices",
    "displayName": "Import Configuration",
    "api": {
        "url": "/data/imports",
        "resultMapping": { "value": "id", "label": "name" }
    }
}
```

The `url` uses the same service-relative path as `useApiServices` (leading `/data/`,
`/forms/`, etc.). Verify with `jq` that the endpoint returns a flat array before writing
`resultMapping`. If it returns a paginated wrapper, find the sub-resource endpoint that
returns the array directly (e.g. `/objects/$_objectId/effective/properties`).

When the choices list depends on another setting (e.g. the selected object), use
`mappedValues` to thread the dependency — see the dynamic settings section above.

## Verify

Run `npm run build` and confirm the widget appears in `dist/manifest.json` with the
expected id and properties. Manifest generation (`manifestgen`) runs automatically as
the prebuild step — do not bypass it.

For presentational components, also run Storybook verification:

1. `npm run build-storybook` — proves stories compile.
2. `npm run storybook -- --host 127.0.0.1` in one terminal, then
   `npm run test-storybook` in another — executes play functions and reports red/green
   status in the terminal.

## Storybook

Keep SDK hooks (`useObject`, `useApiServices`, …) in `index.tsx` only. Components under
`components/` take plain props, import no `@evoke-platform/*` hooks, and must render in
Storybook without platform context.

For each new presentational component under `components/`, invoke the `storybook-tdd`
skill **before writing the component body**. Do this per component, not just once at the
start of the session: write the failing story/play function first, see it fail, then
implement the minimum to go green before moving to the next presentational component.

Write a story for **every** presentational component, covering its main states (loaded,
empty, error) via `args`, and give each behavioral expectation a play function — invoke
the `storybook-tdd` skill for the fail-first workflow and assertion pattern. Verify stories compile with
`npm run build-storybook`, then execute play functions with `npm run test-storybook`
against a running Storybook server.

Also write **one container story** (`<WidgetName>.stories.tsx` beside `index.tsx`)
that renders the real widget over the scaffold's MSW mock layer: set
`parameters: { msw: { handlers } }` with handlers from `src/mocks/` covering each
endpoint the container hits — an unhandled-request warning in the preview console
means one is missing. Shape fixtures from the installed `.d.ts` types; they are dev
fixtures, not contract tests. Use explicit fake ids in story args and MSW handlers
instead of burying sentinels in component logic. MSW only mocks HTTP: if the real
container needs additional platform providers beyond the shipped router decorator, say so
plainly in the blueprint/story comments and keep the container thin rather than pretending
MSW alone solves it. Do not add provider mocks beyond the shipped MSW layer and the
preview's router decorator unless the developer explicitly asks.

## Review

After the build is complete and the validation gate passes, offer to run a code review
using the three reviewer skills (`review-accessibility`, `review-performance`,
`review-behavioral`). The review checks for accessibility gaps, performance hazards, and
behavioral correctness issues that compile and pass tests but would cause problems in
production. See the Code Review section in the project instructions for the full protocol.
