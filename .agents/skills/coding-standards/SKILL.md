---
name: coding-standards
description: Use when writing, reviewing, or otherwise working with code anywhere in this repo
---

## Use less code to achieve the same goal

- Strongly prefer introducing as little new code as possible. Try to reuse existing abstractions, or extend existing abstrations, rather than introducing a parallel abstraction.
  - Generally, introducing less new code, and make changes in less files, creates more understandtable diffs. Have a strong bias towards re-using existing codepaths.

## Comments

- Comments explain why, never what. If a comment restates what the code below it does, or details the history of why this function was written the way it was, remove it.
- Before writing a comment, try a better name instead. If a clearer name removes the need for the
  comment, rename and skip the comment.
- Reserve comments for genuinely surprising behavior: a workaround for a bug in a dependency
  (link the issue if one exists), a non-obvious ordering requirement, a constraint that isn't
  visible from the code itself.
- Delete a comment the moment the code it describes changes and the comment no longer matches. A
  stale comment is worse than no comment.
- Never comment out code "just in case." Delete it; git remembers it.

## Functions

- One function, one job. If describing it needs "and," split it.
- Keep functions short enough to read without scrolling. Extract a helper the moment a block does
  something the outer function doesn't need to know the details of.
- Name the specific thing, not its category. `clinvarVariantTrack`, not `variantTrack`, beside a
  component already named `ClinvarVariantTrack`. Prefer the longer, precise name over a shorter
  one that makes the reader infer the missing part.
- Avoid more than 3-4 parameters. Bundle related parameters into a props/options object instead of
  adding another positional argument.
- Fail loudly and immediately on invalid input (a malformed variant ID, an unrecognized dataset).
  Don't let bad state silently propagate to surface as a confusing error somewhere else — in a
  resolver, in a React render, in a Hail pipeline stage.

## Duplication and structure

- Extract a shared helper the third time the same logic appears, not the first — but the third
  time, actually do it. Watch for this specifically across `browser`/`graphql-api` boundaries and
  across sibling dataset variants (short-variant vs. mitochondrial vs. structural-variant code
  paths tend to get copy-pasted three ways).
- One authoritative place per piece of logic or fact. GraphQL schema types, dataset metadata
  (`dataset-metadata/`), and query-side filtering logic should each live in exactly one place that
  both `browser` and `graphql-api` read from, not be kept in sync by memory.
- Prefer composition over deep inheritance/nesting. Flatten conditionals and early-return over
  nesting them; avoid nested ternaries (`no-nested-ternary`).
- Group related code together. Don't scatter one concept (a track's data fetch, its transform, and
  its render) across a file for no structural reason.
- Before reaching for a new cross-cutting abstraction (a new context provider, a new wrapper
  component), check whether an existing, narrower one already covers the gap. Prefer extending an
  existing composition unit's scope over building a new one — a new abstraction is a bigger,
  harder-to-review diff than reusing what's already there, and it's more surface area to keep
  correct later.

## Errors

- Handle an error where you have enough context to do something useful with it (show a
  `StatusMessage`, retry a query, skip a malformed record in a pipeline). Otherwise let it
  propagate — don't catch-and-swallow.
- Never fail silently. A caught error either gets handled meaningfully or gets re-raised/logged
  with enough detail to diagnose (which variant, which dataset, which pipeline stage).
- Validate at the boundary: parsing GraphQL input, reading a query param, loading a Hail Table.
  Not deep inside business logic.

## Naming and magic values

- No magic numbers or strings in logic. Name them as a constant, enum, or union member — see
  `DatasetId` and friends in `dataset-metadata/`.
- Name booleans, functions, and variables for what they represent, not their type or storage
  mechanism.
- Follow the codebase's existing casing pattern even where it diverges from prose, e.g.
  `ClinvarVariantTrack`/`clinvarVariantTrack` beside the UI string "ClinVar".

## Dependencies

- Don't add a dependency for something a few lines of code already solve.
- Don't hide a widely-used library (Apollo, styled-components, Hail) behind a custom wrapper
  unless the wrapper earns its keep (multiple real implementations, a genuine need to swap it
  out).

## Commits

- Strongly prefer many individually readable commits that each introduce, modify, or remove one concept. This makes review easier, and can always be squashed later.

## Reviewing against this

Check as pass/fail: any comment that just narrates the next line? Any function doing two jobs?
Any duplicated logic past its second copy? Any error caught and silently dropped? Any magic number
without a name? Any new provider/wrapper/context introduced where extending an existing one would
do?
