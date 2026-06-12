---
name: render-evoke-forms
description: Render an Evoke platform form inside a widget using the V2 components (FormRendererContainer / FormRenderer) — props, formlets, auto-generated forms, sticky footers, and a known Confluence documentation error. Use whenever a widget needs to display or submit an Evoke form, the user mentions FormRenderer, FormRendererContainer, formlets, action forms, or form submission inside a widget.
---

# Render Evoke Forms in a Widget

To render an Evoke form inside a widget, use the V2 components re-exported by the SDK:

-   **`FormRendererContainer`** — high-level; pass `objectId` (required) plus `formId`,
    `actionId`, and/or `instanceId`. It loads the form, handles submission and errors.
    `onSubmit(submission, defaultSubmitHandler)` lets you intercept and still call the
    default flow. `formId: '_auto_'` renders an auto-generated form for the selected
    action. Use this for ordinary Evoke forms.
-   **`FormRenderer`** — granular; you supply an already-loaded `form` and manage state
    via `value`/`onChange`. When loading the form yourself, fetch
    `GET /api/data/forms/{id}/effective` so formlets are expanded.
-   `FormRendererContainer` exposes **no form-change event** — `onChange` is not a prop
    (only `onValidationChange`). If the widget needs dirty-state tracking (e.g. a
    discard confirmation), either use `FormRenderer` and own `value`/`onChange`, or
    treat any interaction with the open form as potentially dirty.

Before implementing, inspect the installed package for the current props and examples:

-   `node_modules/@evoke-platform/ui-components/dist/published/index.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/components/custom/FormV2/FormRendererContainer.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/components/custom/FormV2/FormRenderer.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/stories/FormRendererContainer.stories.js`
-   `node_modules/@evoke-platform/ui-components/dist/published/stories/FormRenderer.stories.js`

The `.d.ts` files are the source of truth for the installed version. Story files are
read-only examples if present; do not import from `dist/published/stories`.

If a developer asks for "a form", clarify whether they mean an Evoke V2 form rendered
from an object/action/form definition or a custom local UI. For Evoke forms, use V2
(`FormRendererContainer` / `FormRenderer`) rather than the legacy V1 `Form`.

Known documentation mismatch: the Confluence page "Form V2 and Custom Widgets" lists
`hideButtons`, `stickyFooter`, and `onClose` as props of these components. **They are
not** — those belong to the legacy V1 `Form` component or to widget-level settings. With
V2, customize the footer through `renderFooter` (e.g. render `FormRenderer.Footer` with
`position: 'sticky'` for a sticky footer, or return `null` to hide buttons), and handle
modal close in the surrounding dialog, not on the form component. The prop types exported
from the installed package are the source of truth.
