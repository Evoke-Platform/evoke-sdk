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
