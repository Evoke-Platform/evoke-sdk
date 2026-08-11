# CDR-3348 — Auto-subscribe to root object upon subscription for notification

**Ticket:** CDR-3348
**Date:** 2026-08-07
**Status:** Draft
**Scope:** `packages/context/src/notification` — resolve subtype object IDs to their root object before
subscribing/unsubscribing to SignalR instance and document change notifications

---

## Problem

Widgets that reference a subtype often also need to subscribe for instance-change notifications on it (e.g. a Kanban
board scoped to `Subtype2A`). Change notifications are only ever emitted by the backend under the **root** object's
ID, so today `instanceChanges.subscribe('Subtype2A', ...)` and `documentChanges.subscribe('Subtype2A', ..., ...)`
register a SignalR listener under an event name that never fires — a silent no-op with no error or warning. This
affects any widget using `useNotification` directly, or the deprecated `useSignalRConnection` (which delegates to
it), whenever it subscribes to anything other than a true root object.

## Approach

`subscribe`/`unsubscribe` in `NotificationProvider.tsx` will resolve the given `objectId` to its `rootObjectId` via
`new ObjectStore(api, objectId).get()` before calling the underlying SignalR hub's `.on()`/`.off()`, for both
`instanceChanges` and `documentChanges`. This is chosen over a dedicated resolver cache because `ObjectStore`
already provides exactly this data (`rootObjectId`) with a 30-second TTL cache — reusing it avoids duplicating
caching logic and keeps object-model resolution centralized in one place, per the SDK's existing conventions. Root
objects resolve to themselves (`rootObjectId === objectId`), so no special-casing is needed for the "subscribing to
an actual root" case. An object ID that fails to resolve (e.g. `'DoesNotExist'`) logs a console warning and skips
registration, preserving today's no-throw behavior for invalid IDs.

## Key Decisions

| Question                                                                                                                   | Decision                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Should this ticket cover both `instanceChanges` and `documentChanges`, or split `documentChanges` into a follow-up ticket? | Both fixed together in this ticket — same root-resolution logic applies to each.                                                        |
| How should an unresolvable object ID (e.g. `'DoesNotExist'`) be handled?                                                   | Log a console warning and skip subscribing; do not throw. Matches today's silent no-op behavior for invalid IDs, so no breaking change. |
| How should subtype → root resolution be implemented?                                                                       | Reuse `ObjectStore.get()` rather than a dedicated resolver cache, to avoid duplicating caching logic already provided by `ObjectStore`. |

## Special Considerations

-   `NotificationProvider` is a shared context used by every widget and the app viewer via `useNotification`, and
    indirectly via the deprecated `useSignalRConnection` (which delegates straight through to it) — this fix has
    broad blast radius across all custom widgets that subscribe to instance or document changes.
-   `subscribe()` and `unsubscribe()` become internally async (an HTTP round-trip to resolve `rootObjectId` before
    the hub registration happens), though their public signatures stay synchronous/fire-and-forget. There's a brief
    window after calling `subscribe()` where a change event for that object could occur before resolution completes
    and the listener is registered.
-   Because `subscribe` and `unsubscribe` for the same `objectId` both go through `ObjectStore`'s cached promise,
    repeated or paired calls (e.g. quick mount/unmount) resolve to the same `rootObjectId` consistently rather than
    racing to different results.
-   `NotificationProvider.tsx` currently has no dedicated unit tests — existing coverage
    (`useSignalRConnection.unit.tsx`) mocks `NotificationContext` directly and never exercises this file's actual
    `subscribe`/`unsubscribe` implementation. New tests need to mock `ApiServices`/`ObjectStore` and the SignalR
    `HubConnection`.
-   `packages/context/README.md` documents `useNotification`'s `subscribe`/`unsubscribe` with no mention of
    subtype/root resolution. It must be updated to explain that subscribing to a subtype automatically subscribes to
    its root object's changes (avoiding a throw for unresolvable IDs), and to recommend that consumers subscribe to
    the root object directly going forward when it's known, to skip the extra resolution round-trip.

## Interface Changes

No interface changes. `subscribe`/`unsubscribe` on `instanceChanges` and `documentChanges` keep their existing
signatures and return types (`void`, fire-and-forget) — only their internal behavior changes (root resolution
before hub registration). No new props, parameters, or exports are introduced. This is a non-visual SDK/context-
layer change with no direct UI surface.

## Backwards Compatibility

No backwards incompatible changes.

-   Subscriptions to actual root objects are unaffected — `rootObjectId` resolves to the same ID, so the hub event
    name is unchanged.
-   Subscriptions to subtypes previously received zero notifications (silent no-op); after this fix they start
    receiving them. This is a bug fix restoring intended behavior, not a breaking change — no caller could have
    depended on the broken no-op.
-   Subscribing with an unresolvable object ID still does not throw; it now additionally logs a console warning,
    which is purely additive and doesn't change return types or control flow for callers.
-   The deprecated `useSignalRConnection` hook inherits the fix automatically with no changes to its own code or
    public signature.
-   No Cedar backend or API contract changes — this is entirely front-end/SDK resolution logic.

## Test Cases

-   [ ] `instanceChanges.subscribe('Root', callback)` registers the hub listener under `'Root'` when the object is
        already a root (root subscribing to itself)
-   [ ] `instanceChanges.subscribe('Subtype2A', callback)` resolves the nested subtype's root and registers the hub
        listener under the resolved root ID, not `'Subtype2A'`
-   [ ] `instanceChanges.unsubscribe('Subtype2A', callback)` resolves the same root ID and removes the listener using
        the exact callback instance
-   [ ] `instanceChanges.unsubscribe('Subtype2A')` (no callback) removes all listeners registered under the resolved
        root ID
-   [ ] `instanceChanges.subscribe('DoesNotExist', callback)` logs a console warning and does not register a hub
        listener, without throwing
-   [ ] `instanceChanges.unsubscribe('DoesNotExist', callback)` does not throw when the object cannot be resolved
-   [ ] Two widgets subscribing to different subtypes of the same root (`'Subtype1'` and `'Subtype2'`) both receive
        notifications for that root object's instance changes
-   [ ] `documentChanges.subscribe('Subtype2A', instanceId, callback)` resolves the root and registers the listener
        under `${rootObjectId}/${instanceId}`
-   [ ] `documentChanges.unsubscribe('Subtype2A', instanceId, callback)` resolves the same root ID and removes the
        exact callback
-   [ ] `documentChanges.subscribe('DoesNotExist', instanceId, callback)` logs a console warning and does not
        register a hub listener, without throwing

## File Map

| Action | Path                                                                    | Responsibility                                                                                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `packages/context/src/notification/NotificationProvider.tsx`            | Resolve `objectId` → `rootObjectId` via `ObjectStore.get()` in `instanceChanges`/`documentChanges` `subscribe`/`unsubscribe`, before registering/removing SignalR hub listeners; log a console warning and skip on unresolvable object IDs. |
| Create | `packages/context/src/tests/notification/NotificationProvider.unit.tsx` | Unit tests covering root resolution, nested subtypes, unresolvable object IDs, and shared-root subscriptions for both `instanceChanges` and `documentChanges` (see Test Cases).                                                             |
| Modify | `packages/context/README.md`                                            | Document that `subscribe`/`unsubscribe` on a subtype automatically resolve to the root object, that unresolvable object IDs warn instead of throwing, and recommend subscribing to the root object directly when known.                     |
