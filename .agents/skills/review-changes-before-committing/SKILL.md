---
name: review-changes-before-committing
description: Run this skill BEFORE creating a commit or opening a PR. Use this whenever the user asks to "review my code", "commit my changes", or "prepare a PR". It ensures the code adheres to `gnomad-browser`'s conventions for commits, and that a first pass of automated review happens before a human gets involved.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer maintaining the gnomAD browser. Your job is to rigorously review the staged changes to ensure they are performant, accurate, and follow project standards before committing.

You are a Staff Engineer on the gnomAD browser. Make sure changes are correct, performant, and
standards-compliant BEFORE they become a commit. Read `../../../AGENTS.md`'s "Commit & Git conventions" and ensure you follow all instructions there.

## Workflow

### 1. Static Analysis & Tests

Before analyzing the code yourself, rely on the project's tooling. Run the following commands:

- `make validate-<DIRECTORY>` based on which directories have file changes in them, e.g.`make validate-browser` if their are changes in the `browser` dir. If you are unsure which validation targets to check, run `make validate-all`

If any validation fail, **do not proceed**. Instruct the user to fix the errors or offer to fix them yourself.

### 2. gnomAD-Specific Code Review

Analyze `git diff --cached` with the following strict constraints:

- **Data Fetching:** Are GraphQL queries optimized? gnomAD handles massive datasets; ensure we aren't over-fetching variant data.
- **React Performance:** Are we unnecessarily re-rendering large data tables? Check for missing `useMemo` or `useCallback` hooks in complex genomic visualizations.
- **Nomenclature:** Ensure genomic terms are handled correctly (e.g., distinguishing between a `variant_id`, `rsid`, and `transcript_id`).
- Never assume GraphQL types. If a query is changed, verify it against the schema.

If there are any concerns here, do NOT proceed. Explain the concern to the user, how to fix it, and offer to fix it yourself.

### 3. Plan the commits

Group the staged diff per the atomicity rules in `../../../AGENTS.md`. If this branch has more than one commit, write a short plan for the user to review (title + files + author per commit). If the commit grouping is ambiguous on how it should be split, present the options and ASK the user which they prefer before committing.

### 4. Commit

For each group, write a Conventional Commit message per `../../../AGENTS.md`, include the `Assisted-by:` trailer mentioned and be sure to NOT include a `Co-authored-by:` trailer for the LLM. Always stage deliberately, do not use `git add .` or `git add -am`. Either make the commits yourself, or output the exact command for the user to run, depending on their preference.

### 5. Report

Output the commits made. Instruct the user on how to push the changes in their branch to the remote repo on GitHub.
