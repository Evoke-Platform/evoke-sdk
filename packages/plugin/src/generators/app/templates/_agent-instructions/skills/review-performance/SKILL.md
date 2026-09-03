---
name: review-performance
description: Use when reviewing widget code for performance — polling intervals, leaked timers or subscriptions, unbounded renders, memoization issues, bundle size, or resource cleanup. Run as part of a full review or standalone when the developer asks about performance.
---

# Performance Reviewer

Role: senior performance engineer reviewing Evoke widget code.

## Context

Evoke widgets run inside App Viewer on pages that may contain many widgets. Performance
issues in one widget (leaked timers, tight polling, unbounded renders) affect the entire
page. Widgets use SDK hooks (`useApiServices`, `useObject`) for data and MUI components
from `@evoke-platform/sdk` for UI.

The project's polling convention requires a **3-second minimum `setTimeout` interval**
with cleanup on unmount. This was added after an unattended agent used 150ms polling —
fast enough to overwhelm the API in production.

Storybook interaction tests are the only test mechanism. Performance issues are rarely
caught by play functions — they manifest in production with real data volumes and
concurrent widgets. This reviewer catches them before they ship.

## Anti-Patterns

| Anti-pattern          | Detection signal                                                                                                                                 | Fix direction                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Fast polling          | `setInterval` or `setTimeout` with an interval under 3000ms, or any `setInterval` at all (prefer chained `setTimeout`)                           | Use chained `setTimeout` with minimum 3000ms delay; use 5000–10000ms for operations that take minutes                     |
| Leaked timer          | `setTimeout` or `setInterval` set inside `useEffect` without a cleanup function that clears it; missing `cancelled` flag for async chains        | Return a cleanup function from `useEffect` that sets a `cancelled` flag and/or calls `clearTimeout`/`clearInterval`       |
| Leaked subscription   | Event listener, SignalR subscription, or `useNotification` handler registered without corresponding removal on unmount                           | Return cleanup in `useEffect`; use the unsubscribe function from `useNotification`                                        |
| Unbounded fetch       | API call that fetches all records without `limit`, `where` filter, or pagination — works with 5 mock records, breaks with 5000 real ones         | Add pagination, a `where` clause, or explicit `limit`; use `instances/count` for totals instead of fetching and counting  |
| Render churn          | New objects, arrays, or functions created on every render and passed as props or effect dependencies — causes child re-renders or effect re-runs | Memoize with `useMemo`/`useCallback`; move static values outside the component; stabilize dependency arrays               |
| Unstable memo dep     | `useMemo`/`useCallback` dependency array includes a value that changes every render (inline object, `?? []`, inline function)                    | Extract the unstable value into its own `useMemo` or `useRef`, or restructure to avoid the dependency                     |
| Bundle duplication    | Importing runtime components from `@mui/material` or `@mui/icons-material` directly instead of from `@evoke-platform/sdk`                        | Import from `@evoke-platform/sdk` (re-exports MUI core); use `@evoke-platform/ui-components/icons/<Name>` for icons       |
| Missing loading state | API call or async operation runs without showing a loading indicator — the widget appears frozen or empty                                        | Show a loading skeleton or `CircularProgress` during async operations; the phase machine should include a `loading` phase |

## Review Checklist

1. **Polling**: Every `setTimeout`/`setInterval` uses >= 3000ms. Chained `setTimeout`
   preferred over `setInterval`. Polling stops at terminal state.
2. **Cleanup**: Every `useEffect` that creates a timer, subscription, listener, or async
   chain returns a cleanup function.
3. **Data bounds**: API calls include `limit`, `where`, or pagination. No
   fetch-all-and-filter-in-memory patterns.
4. **Render stability**: Props passed to children are referentially stable across
   renders. Dependency arrays don't include inline objects or functions.
5. **Bundle**: No direct `@mui/*` runtime imports. Icons use the `ui-components/icons/`
   subpath.

## Review Output

Report P0–P3 findings with the scale trigger — what data volume or usage pattern would
surface the issue. Each finding includes the file, the problematic pattern, the
production impact, and the fix direction. If the code is clean, cite the polling
interval, cleanup functions, data bounds, and stable references that prove it.
