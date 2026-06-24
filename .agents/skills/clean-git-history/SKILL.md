---
name: clean-git-history
description: Trigger this when the user asks to clean up a messy branch, squash commits, fix commit history, or tidy up an open PR. This rewrites local history into a clean atomic series of commits without losing any changes.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer turning a noisy branch into a clean, atomic series of commits. Commit format, attribution, and atomicity must follow `../../../AGENTS.md`'s "Commit & Git
conventions".

Always identify the base, then understand, then restructure, then verify, in that order. You CANNOT do any of the other steps until you have identified the base branch.

NEVER use interactive rebase as it can drop commits if you're not careful. This procedure uses `reset --soft` and a final diff check to make sure nothing gets lost.

## Workflow

### 1. CRITICAL: Identify the Base Branch First

**STOP: You are FORBIDDEN from running any diff, log, or rebase commands (like `<base>..HEAD`) until you have explicitly identified and confirmed the base branch with the user. Forget any assumptions about the base branch being `main` or `master`.**

Your very first action MUST be to execute these steps in order:

1. **Find the divergence point:**
   Run `git log --oneline --graph --decorate -n 15` to see the recent branch structure and identify where the current branch diverges.
2. **Check for stacking:**
   Identify the oldest commit unique to this branch. Run `git branch -a --contains <commit-hash>`. If a branch other than the current one (and other than `main`) contains the early commits of this feature, the current branch is stacked on it.
3. **HALT AND ASK THE USER:**
   You must stop execution and ask the user a standalone question:
   _"Is this branch stacked on another PR/branch? Based on the logs, I think the base is `[Branch Name]` — please confirm or correct me."_
   (Default to `origin/main` ONLY if the logs show no intermediate branches).
4. **Confirm the Base:**
   Wait for the user's reply. Once they confirm, verify it by running `git merge-base <confirmed-base> HEAD`. It should equal the tip of the base branch.
5. **Proceed:**
   Only after step 4 is complete may you proceed to the next steps in this skill.

### 2. Understand (READ-ONLY. mutate nothing)

1. `git status`. If its not clean, stop and have the user commit or stash the changes.
2. Extract real intent while history is intact:
   - `git log -p --reverse <base>..HEAD` — every original commit's diff, message, and author.
   - `gh pr view` and any linked issue, if applicable.
   - For new modules, grep where they are imported/consumed — that's what the change delivers.
3. Write a **commit plan**: an ordered list of target commits, each `{title, one-line rationale,
files/original-commits absorbed, author}`. Map every original commit into exactly one target
   commit — this guarantees coverage and sets each author from the dominant original author.
4. If the grouping is genuinely ambiguous, present the plan with options and ASK before mutating.
5. Ask for explicit permission from the user as to if this new commit plan looks good to them. If no, ask why and re-work the plan. If yes, proceed.

### 3. Restructure

1. **MAKE A BACKUP BRANCH**. `git branch backup-$(git branch --show-current)-$(date +%Y-%m-%d--%H-%M)`. Inform the user a backup branch was created, and the branch name, so that they know if anything looks odd post workflow, their original work is safe.
2. Run `git reset --soft <base>`, and then `git reset` to unstage all changes, in prep to re-commit them differently
3. For each planned commit, run `git add <ITS-FILES>`, and commit them using the planned title and `--author=<ORIGINAL_AUTHOR>`. Include the `Assisted-by: ___` trailer, per `../../../AGENTS.md`.

### 4. Verify

1. Run `git diff <backup-branch> HEAD`, this diff MUST be empty. If there is ANY diff, this new cleaned branch is not an identical set of changes, and you must abort these chnages using `git reset -hard <backup-branch>`, and re-plan the cleaning up. Inform the user if this happens.
2. Run `git status` and verify that its clean. The count of commits on this branch, and the authors involved should match the plan.
3. Optional, run the relevant `validate-<DIR>` targets on the post clean up branch.

## Handoff

Do NOT push these changes yourself. Summarize the new commits to the user, and tell the user to run `git push --force-with-lease` themselves if they are sure these changes are what they want and that they look good to the user.

Offer to draft the PR message using `../draft-pull-request-description/SKILL.md`.
