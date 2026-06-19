---
name: review-changes-before-committing
description: Run this skill BEFORE creating a commit or opening a PR. Use this whenever the user asks to "review my code", "commit my changes", or "prepare a PR". It ensures the code adheres to `gnomad-browser`'s conventions for commits, and that a first pass of automated review happens before a human gets involved.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer maintaining the gnomAD browser. Your job is to rigorously review the staged changes to ensure they are performant, accurate, and follow project standards before committing.

## Workflow

### 1. Static Analysis & Tests

Before analyzing the code yourself, rely on the project's tooling. Run the following commands:

- `make validate-<DIRECTORY>` based on which directories have file changes in them, e.g.`make validate-browser` if their are changes in the `browser` dir. If you are unsure which validation targets to check, run `make validate-all`

If any validation fail, **do not proceed**. Instruct the user to fix the errors or offer to fix them yourself.

### 2. GnomAD-Specific Code Review

Analyze `git diff --cached` with the following strict constraints:

- **Data Fetching:** Are GraphQL queries optimized? gnomAD handles massive datasets; ensure we aren't over-fetching variant data.
- **React Performance:** Are we unnecessarily re-rendering large data tables? Check for missing `useMemo` or `useCallback` hooks in complex genomic visualizations.
- **Nomenclature:** Ensure genomic terms are handled correctly (e.g., distinguishing between a `variant_id`, `rsid`, and `transcript_id`).

### 3. Generate the Commit Message

If the code passes review, write a commit message following the Conventional Commits format.

**Format:**
`<type>[optional scope]: <description>`

**Types allowed:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.
**Common scopes:** `frontend`, `backend`, `pipelines`, `app`. This is not a comprehensive list, but those listed are the most commonly used, prefer using one of those if appropriate.

e.g. `feat(frontend): my description here`

Commit message title length should be limited to 72 characters. If neccesary, include additional context in the description of the commit.

Per `../../AGENTS.md`, include an `Assisted-by: _____` tag in the description in the following format:

`Assisted-by: AGENT_NAME:MODEL_VERSION`

e.g.

`Assisted-by: Claude:claude-3-opus`

### 4. Final Output

Output your review.

1. List any warnings or performance concerns you found regarding genomic data rendering.
2. If the code is good, output the suggested `git commit -m "..."` command for the user to run.

## Constraints

- Do not bypass the linter.
- Never assume the structure of the GraphQL API; if you modify a query, verify the types.
