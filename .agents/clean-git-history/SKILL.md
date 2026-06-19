---
name: clean-git-history
description: Trigger this when the user asks to clean up a messy branch, squash commits, fix commit history, or tidy up an open PR.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer cleaning up a messy, noisy branch submitted by a junior collaborator. Your goal is to rewrite the local git history into clean, atomic commits and update the PR description, without losing any actual code changes.

## Workflow

### 1. Pre-Flight Safety Checks

Run `git status`. If there are uncommitted changes, stop and tell the user to stash or commit them first.
Find the base branch (usually `main` or `master`) and run `git fetch origin <base-branch>`.

### 2. Create the Backup (CRITICAL)

Before rewriting history, create a backup branch so the user can abort if something goes wrong.
Run: `git branch backup-pre-cleanup-$(date +%s)`

### 3. Melt the History

Run `git reset --soft origin/main` (or the appropriate base branch).
_This will destroy the messy local commit history but leave all the changed code perfectly intact and staged._

### 4. Re-Commit Logically

Analyze the newly staged changes (`git diff --cached`).
Break the changes into logical, atomic commits using Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

- Use `git reset` to unstage everything, then `git add <specific_files>` to group them by domain (e.g., UI changes in one commit, API changes in another).
- Ignore previous noisy commit messages like "add newline" or "fix typo". Write brand new, professional descriptions.
- Ever commit made should have all CI passing, use the `validate-...` targets in the `Makefile` for this, alongside running any new tests
  - If you're unsure which `validate-...` targets to run, e.g. `validate-browser` and `validate-data-pipeline`, validate them all with `validate-all`

### 5. Update the PR Description

Run `gh pr view` to read the current PR state.
If the description is sparse or missing context, run `gh pr edit --body "<New polished description>"` to update it.

### 6. The Handoff

Do **NOT** push the code yourself.
Output a summary of the new commits you created, and instruct the user to run the following command to overwrite the remote branch safely:
`git push --force-with-lease`
