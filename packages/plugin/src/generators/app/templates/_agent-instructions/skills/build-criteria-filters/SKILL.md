---
name: build-criteria-filters
description: Build filter/criteria UI with CriteriaBuilder and convert its Mongo-style output for data API queries — two incompatible filter formats exist and the operator conversion map is documented here. Use whenever a widget needs a filter editor, criteria builder, query builder, or needs to pass user-built filters to findInstances or filter.where parameters.
---

# Build Criteria Filters in a Widget

Use `CriteriaBuilder` when the widget needs a Builder-style filter editor. It edits Evoke's
Mongo-style criteria objects, the same shape used in `filter` widget properties.

Before implementing, read `CriteriaBuilder` and its props from the installed
`@evoke-platform/ui-components` npm package's exported types. Use the published component
catalog for examples.

**Import path:** `import { CriteriaBuilder } from '@evoke-platform/sdk'`. Internal files
reached through declarations are read-only reference, not supported runtime import paths.

Pass the target object's `properties` array and keep the criteria in component state.
Use `presetValues`/`enablePresetValues` only when the widget should insert platform
template values such as `{{{user.id}}}`.

**Two filter formats exist — do not mix them up:**

-   CriteriaBuilder criteria (and saved `filter` widget property values) are
    **Mongo-style**: `$and`, `$or`, `$in`, `$lt`/`$lte`, `$gt`/`$gte`, `$regex`,
    equality as `{ status: 'Active' }`.
-   The data API's `Where` clauses (`ObjectStore.findInstances`, `filter.where` query
    params) are **Loopback-style**: `and`, `or`, `inq`, `lt`/`lte`, `gt`/`gte`,
    `regexp`, `neq`.

To query instances from CriteriaBuilder output, convert operators first. The platform
uses this mapping (recursively replace each `$`-prefixed key):

| Mongo        | Where      |
| ------------ | ---------- |
| `$and`       | `and`      |
| `$or`        | `or`       |
| `$eq`        | `eq`       |
| `$ne`        | `neq`      |
| `$lt`/`$lte` | `lt`/`lte` |
| `$gt`/`$gte` | `gt`/`gte` |
| `$in`        | `inq`      |
| `$nin`       | `nin`      |
| `$regex`     | `regexp`   |
| `$exists`    | `exists`   |
| `$not`       | `not`      |

Note the non-obvious ones: `$in` → `inq`, `$regex` → `regexp`, `$ne` → `neq`. Passing
unconverted Mongo criteria to `findInstances` will not match the `Where` type and will
not filter correctly.

There is **no platform utility** for this Mongo→Where conversion — write it from the
table above. Do not reach for `parseMongoDB` (exported from the SDK): despite the name,
it converts stored Mongo criteria into CriteriaBuilder's internal UI state for
re-populating the editor — its output is not a data API query.

Type the converted output as `Where`, exported from `@evoke-platform/sdk`, before
passing it to `findInstances({ where })` or a `filter.where` query parameter. Inspect
the installed declaration for its current shape.

Type caveat: the platform emits `regexp` and `not` at runtime (its own conversion maps
`$regex`/`$not` to them, and production widgets send `regexp` clauses), but the installed
`PredicateComparison` type may not declare them. If TypeScript rejects a converted
clause, cast that clause narrowly (e.g. `as unknown as Where`) rather than dropping the
operator.
