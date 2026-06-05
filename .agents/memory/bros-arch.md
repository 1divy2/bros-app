---
name: brOS architecture decisions
description: Non-obvious constraints and patterns for the brOS codebase
---

## Hook usage

All generated module hooks (useGetArchitecture, useGetSecurity, etc.) **require** `queryKey` in the `query` options object — not just `enabled`. Use the matching `getGetXxxQueryKey(id)` function from `@workspace/api-client-react`.

**Why:** Orval-generated hooks with `UseQueryOptions` type have `queryKey` as required (not optional) at the top level of the options union.

**How to apply:** Always write `{ query: { enabled: !!id, queryKey: getGetXxxQueryKey(id) } }` for all module-level hooks.

## Lib declarations must be rebuilt before API server typecheck

After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` first. Otherwise `@workspace/api-server` will report `Module '@workspace/db' has no exported member 'xxx'` even when the export exists.

**Why:** TypeScript project references use `.d.ts` declarations from `lib/db/dist/`. If stale, the API server sees the old shape.

**How to apply:** `pnpm run typecheck:libs && pnpm --filter @workspace/api-server run typecheck`

## Express 5 params typing

`req.params.id` is typed as `string | string[]` in Express 5. Always use `String(req.params.id)` before passing to `parseInt()` in route handlers.

**Why:** Express 5 types `ParamsDictionary` values as `string | string[]`, not plain `string`. `parseInt(string | string[])` is a type error in strict mode.

## Analysis data flow

`simulateAnalysis()` fires async after POST /repositories. It runs 13 steps at 1.5s intervals, updating `repositories.status/progress/currentModule`. On the final step, `storeAnalysisData()` writes all module JSON to `analysis_results` table. Module GET routes read from there.

**Why:** No actual GitHub API calls — all data is generated from `generateAnalysisData(owner, name)` in repositories.ts. Rich enough to demonstrate all 12 modules.
