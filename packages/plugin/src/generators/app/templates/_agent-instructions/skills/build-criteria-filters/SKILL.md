---
name: build-criteria-filters
description: Build filter/criteria UI with CriteriaBuilder and convert its Mongo-style output for data API queries — two incompatible filter formats exist and the operator conversion map is documented here. Use whenever a widget needs a filter editor, criteria builder, query builder, or needs to pass user-built filters to findInstances or filter.where parameters.
---

# Build Criteria Filters in a Widget

Use `CriteriaBuilder` when the widget needs a Builder-style filter editor. It edits Evoke's
Mongo-style criteria objects, the same shape used in `filter` widget properties.

Before implementing, inspect the installed package for the current props and examples:

-   `node_modules/@evoke-platform/ui-components/dist/published/components/custom/CriteriaBuilder/CriteriaBuilder.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/components/custom/CriteriaBuilder/utils.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/components/custom/CriteriaBuilder/types.d.ts`
-   `node_modules/@evoke-platform/ui-components/dist/published/stories/CriteriaBuilder.stories.js`

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
