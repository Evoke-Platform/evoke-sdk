---
name: package-and-upload
description: Package this plugin into a deployable zip and upload it to an Evoke environment — build, inspect the manifest, upload widgets or payment gateways, and debug at runtime.
---

# Package and Upload

## Package

```bash
npm run package
```

This builds the plugin (manifestgen, then webpack) and zips `dist/` into
`target/plugin.zip`.

## Inspect Before Uploading

```bash
unzip -l target/plugin.zip
unzip -p target/plugin.zip manifest.json
```

Confirm every expected widget and payment gateway appears in `manifest.json` with the
right id, version, and properties.

## Upload

-   **Widgets:** in the Evoke Builder, open a page's layout editor, go to the **Add** tab,
    select **New Widget**, and upload `target/plugin.zip`. Imported widgets become
    available across all apps in the environment.
-   **Payment gateways:** upload through **Settings > Payment Gateway** in the Evoke
    environment.

## Runtime Debugging

-   The plugin loads through webpack Module Federation (`remoteEntry.js`); check the
    browser console and network tab for load failures.
-   `react`, `react-dom`, `@evoke-platform/context`, and `@evoke-platform/ui-components`
    are shared singletons provided by the host app — version conflicts surface as
    shared-module errors in the console.
-   If a widget renders blank, verify the props configured in the Builder settings match
    the names in `WidgetProperties.json`.

## Guardrails

Do not commit or push as part of packaging. `target/` and `dist/` are build artifacts,
not source.
