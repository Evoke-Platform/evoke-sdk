---
name: add-widget
description: Scaffold a new widget in this Evoke plugin — directory layout, WidgetProperties.json shape, TypeScript prop mapping, and build verification.
---

# Add a Widget

## Scaffold

Create:

```text
src/widgets/<WidgetName>/
├── index.tsx
└── WidgetProperties.json
```

`index.tsx` default-exports a React function component whose props match the
`properties` declared in `WidgetProperties.json` — each property's `name` becomes a
React prop with the value the app builder configured.

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
-   `allowSticky`, `typesSupported`, `deprecated`, `betaRelease`

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
    dependent saved values automatically.
-   **`visibility`** takes an `operator` (`and`/`or`) and `conditions` comparing another
    property's value with `equals`/`notEquals`. Values may be strings, booleans, or
    numbers. In repeatable `inputGroup`s, conditions evaluate against the current row.
-   **`hidden: { "dataType": [...] }`** hides a property for specific data source types
    (e.g. `["documents"]`) — useful when a widget supports several `typesSupported`.

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

Mark properties with `isOptional: true` as optional (`?`) in the props type.

## Verify

Run `npm run build` and confirm the widget appears in `dist/manifest.json` with the
expected id and properties. Manifest generation (`manifestgen`) runs automatically as
the prebuild step — do not bypass it.

## Storybook

If the widget is mostly prop-driven, add or update a story with `args`. If it depends
on SDK hooks or network calls, prefer a presentational split or defer mocking to a
separate task — do not add provider mocks or MSW.
