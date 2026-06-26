---
name: draft-pull-request-description
description: Use this whenever the user wants to open a pull request (PR),  draft a PR, or summarize their branch for merging. Fills out the project PR template.
allowed-tools: bash, read_file
---

## Objective

You are a Staff Engineer preparing a comprehensive, professional, and concise Pull Request description. Your goal is to fill out the project's PR template thoroughly so the reviewer can more quickly understand:

- whether or not this PR should be squashed and merged, or rebased and merged
  - this lets maintainers know whether to inspect each individual commit
- the intent of the PR
  - the issue that this PR resolves, if applicable
- the design/architecture chosen
  - why this was chosen, and what else was considered or not considered
- the exact changes
- what tests were added, or changed
- anything that might require specific thought or consideration, and why (e.g. possible introduced breaking changes, or design of new UI components)

## Workflow

### 1. Read the Template:

Read the `.github/PULL_REQUEST_TEMPLATE.md` file.

### 2. Determine the base:

- Ask the user if the branch is stacked off another, default to `origin/main` if the user doesn't know, as its most likely not stacked

### 3. Analyze the Diff

Run `git diff main...HEAD` to understand the holistic changes made on this branch.

### 4. Draft the Content

- Specify whether this PR should be squashed and merged, or rebased into `main`
- Write a strong, business-logic-focused description.
- Explain the architecture and design decisions based on the code you see.

### 5. Check for UI Changes

Check if any changed files end in `.tsx`, `.jsx`, `.css`, or represent UI components.

### 6. Output the Draft & Prompt the User

- Output the complete, filled-out markdown for the PR.
- **CRITICAL:** If UI files were changed, you must add a bold note at the end telling the human: "I noticed UI changes in this branch. Please take Before/After screenshots and drag them into the table before hitting Submit."
