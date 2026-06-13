---
name: add-widget
description: Scaffold a new widget in this Evoke plugin — directory layout, WidgetProperties.json shape, TypeScript prop mapping, and build verification.
---

# Add a Widget

## Scaffold

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
Storybook without platform context. Write a story for **every** presentational
component, covering its main states (loaded, empty, error) via `args`, and give each
behavioral expectation a play function — invoke the `storybook-tdd` skill for the
fail-first workflow and assertion pattern. Verify stories compile with
`npm run build-storybook`, then execute play functions with `npm run test-storybook`
against a running Storybook server.

Also write **one container story** (`<WidgetName>.stories.tsx` beside `index.tsx`)
that renders the real widget over the scaffold's MSW mock layer: set
`parameters: { msw: { handlers } }` with handlers from `src/mocks/` covering each
endpoint the container hits — an unhandled-request warning in the preview console
means one is missing. Shape fixtures from the installed `.d.ts` types; they are dev
fixtures, not contract tests. Do not add provider mocks beyond the shipped MSW layer
and the preview's router decorator.
