---
name: send-correspondence
description: Send correspondence templates (email) from a widget — verified endpoints for listing templates, sending by email with history, and downloading merged documents. The endpoints live on the data service, NOT the mailMerge service. Use whenever a widget needs to email users, send a correspondence template, list correspondence templates, or do mail-merge-style sending.
---

# Send Correspondence from a Widget

Correspondence templates and sending belong to the **data** service — not the
`mailMerge` service. (`mailMerge` is a low-level document-merge engine the platform uses
internally; widgets do not call it directly.) Verified endpoints, as used by the
platform's own widgets:

-   List templates available for an object:
    `GET /data/correspondenceTemplates?filter={"where":{"or":[{"objectId":"<id>"}, ...]}}`
    The platform builds the `or` list from the object's full hierarchy — the object's id
    plus each ancestor `baseObject.objectId` — so templates registered on a base object
    are offered for its subtypes. Fetch an object's parent via
    `GET /data/objects/{id}/effective` and read `baseObject.objectId`, repeating until
    there is no parent. Shortcut: `ObjectStore.get()` returns `ObjWithRoot` — the
    hierarchy fields are `obj.id` (current), `obj.baseObject?.objectId` (direct
    parent), and `obj.rootObjectId` (root ancestor). For shallow hierarchies,
    deduplicate those three ids instead of making extra API calls.
    Pass the filter through the `params` option — `api.get('/data/correspondenceTemplates',
{ params: { filter } })` — ApiServices' serializer JSON-stringifies and URL-encodes
    object params. (The platform's own widgets also inline `'filter=' +
JSON.stringify(filter)` directly in the URL; both forms work, but the `params` option
    avoids hand-encoding mistakes.) Response items are `{ id, name, objectId, ... }` —
    no SDK type exists for correspondence templates; define a minimal local type with
    the fields you use.
-   Send a template by email for one instance:
    `POST /data/correspondenceTemplates/{templateId}/send` with body
    `{ "instanceId": "<id>" }`. Sending through this endpoint creates normal
    correspondence history.
-   Download the merged document instead of sending:
    `POST /data/correspondenceTemplates/{templateId}/download` with body
    `{ "instanceId": "<id>" }` (plus optional `"format"`), response type blob.
