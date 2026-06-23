---
name: clean-git-history
description: Trigger this when the user asks to clean up a messy branch, squash commits, fix commit history, or tidy up an open PR. This rewrites local history into a clean atomic series of commits without losing any changes.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer turning a noisy branch into a clean, atomic series of commits. Commit format, attribution, and atomicity must follow `../../../AGENTS.md`'s "Commit & Git
conventions".

Always understand, then restructure, then verify, in that order.

NEVER use interactive rebase as it can drop commits if you're not careful. This procedure uses `reset --soft` and a final diff check to make sure nothing gets lost.

## Workflow

### 1. Understand (READ-ONLY. mutate nothing)

1. `git status`. If its not clean, stop and have the user commit or stash the changes.
2. **Find the base. Do not assume `origin/main`.** Ask the user: "Is this branch stacked on another
   PR/branch?" If yes, the base is that parent branch. `git fetch origin`, then confirm with
   `git merge-base <base> HEAD`.
3. Extract real intent while history is intact:
   - `git log -p --reverse <base>..HEAD` — every original commit's diff, message, and author.
   - `gh pr view` and any linked issue, if applicable.
   - For new modules, grep where they are imported/consumed — that's what the change delivers.
4. Write a **commit plan**: an ordered list of target commits, each `{title, one-line rationale,
files/original-commits absorbed, author}`. Map every original commit into exactly one target
   commit — this guarantees coverage and sets each author from the dominant original author.
5. If the grouping is genuinely ambiguous, present the plan with options and ASK before mutating.

### 2. Restructure

1. **MAKE A BACKUP BRANCH**. `git branch backup-pre-cleanup-$(date +%s)`. Inform the user a backup branch was created, and the branch name, so that they know if anything looks odd post workflow, their original work is safe.
2. Run `git reset --soft <base>`, and then `git reset` to unstage all changes, in prep to re-commit them differently
3. For each planned commit, run `git add <ITS-FILES>`, and commit them using the planned title and `--author=<ORIGINAL_AUTHOR>`. Include the `Assisted-by: ___` trailer, per `../../../AGENTS.md`.

### 3. Verify

1. Run `git diff <backup-branch> HEAD`, this diff MUST be empty. If there is ANY diff, this new cleaned branch is not an identical set of changes, and you must abort these chnages using `git reset -hard <backup-branch>`, and re-plan the cleaning up. Inform the user if this happens.
2. Run `git status` and verify that its clean. The count of commits on this branch, and the authors involved should match the plan.
3. Optionall, run the relevant `validate-<DIR>` targets on the post clean up branch.

## Handoff

Do NOT push these changes yourself. Summarize the new commits to the user, and tell the user to run `git push --force-with-lease` themselves if they are sure these changes are what they want and that they look good to the user.

Offer to draft the PR message using `../draft-pull-request-description/SKILL.md`.
