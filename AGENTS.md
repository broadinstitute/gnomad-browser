# gnomAD Browser - Agent Instructions

This file provides architectural context and strict execution rules for ANY AI assistant or agent (Cursor, GitHub Copilot, Claude Code, Gemini, etc.) interacting with this repository.

## Overview

The gnomAD browser (https://gnomad.broadinstitute.org) is a set of tools for exploring genomic
variation data. It is a pnpm monorepo of JavaScript/TypeScript packages plus a Python (Hail) data
pipeline. The data flow is:

```
data-pipeline (Hail/Python on Dataproc)  →  Elasticsearch  →  graphql-api (Node)  →  browser (React)
```

Variant data is far too large to ship to the client, so the pipeline precomputes Hail Tables, loads
them into Elasticsearch, and the GraphQL API serves narrow slices to the React frontend.

## Toolchain versions

Pinned in `.tool-versions` / `volta`: Node 18.17.1, pnpm 8.14.3, Python 3.9.17. Use pnpm (not npm/yarn)
for the JS workspace.

## Common commands

**JavaScript/TypeScript (run from repo root)**:

```
make install-js-dependencies      # install JS workspace deps
make typecheck-browser            # tsc --noEmit across the workspace
make lint-js-browser              # Lint the frontend code with ESLint
make lint-css-browser             # Lint the CSS + styled-components with Stylelint
make check-format-browser         # Check frontend formatting with Prettier
make test-browser                 # Run Jest unit test for the browser code
make build-browser                # Build the frontend files with pnpm
pnpm jest <path-or-name>          # Run a single test file or -t name pattern
pnpm test:jest:debug              # Jest under node --inspect-brk
pnpm test:playwright              # Playwright e2e (needs a running backend; see below)

make validate-browser             # Run all automated checks that will run in GitHub CI

make fix-browser                  # Run all automated check and write files to fix them
                                  #     e.g. fix formatting, update snapshot tests, etc
```

Jest is configured (`jest.config.ts`) as three projects matching `**/*.spec.(js|jsx|ts|tsx)` in the
`browser`, `graphql-api`, and `dataset-metadata` packages.

Playwright e2e tests can run against a deployed/locally-running API; set `GNOMAD_API_URL`, e.g.
`GNOMAD_API_URL=http://localhost:8010/api pnpm test:playwright`.

**Python data pipeline (run from `data-pipeline/`)**:

```
make install-py-data-pipeline-dependencies     # install wheel, reqs, dev reqs
make lint-data-pipeline                        # lint data pipeline with ruff check
make check-format-data-pipeline                # check formatting with ruff format --check
make typecheck-data-pipeline                   # typecheck data pipeline with pyright

./check.sh --mock-data                         # only mock_data tests
pytest                                         # excludes mock_data/broken tests by default (see pytest.ini)
pytest tests/v4/...                            # testpaths are tests/pipeline and tests/v4

make validate-data-pipeline                    # run all checks that happen in GitHub CI
make fix-data-pipeline                         # Run all automated check and write files to fix them
                                               #     e.g. fix formatting, correct fixable lint errors, etc

```

The `Makefile` in the project root contains targets for common tasks, including installing dependencies, linting, formatting, checking types, and running tests.

The `make` targets:

- `validate-browser`
- `validate-graphql-api`
- `validate-data-pipeline`
- `validate-deploy`

Can be used to easily replicate what will be run in the production CI, and each contain validation steps relevant to the named directory, e.g. `browser`. The target `validate-all` can be used to ensure all checks pass if you're unsure of which scoped `validate` targets to run.

## Running locally

The Docker Compose dev environment is driven by `development/env.sh`:

```
./development/env.sh browser up      # browser only (defaults to prod API)
./development/env.sh api up          # API only
./development/env.sh up              # both API and browser
./development/env.sh build browser   # rebuild images after dep changes
```

Without Docker: `pnpm start:browser` (browser webpack dev server) or `cd graphql-api && ./start.sh`
(needs Elasticsearch credentials). Browser dev requires a `browser/build.env` file (see CONTRIBUTING.md).
API development normally points at a cloud-hosted Elasticsearch cluster rather than running it locally.

## Architecture

### data-pipeline (`data-pipeline/src/data_pipeline/`)

Hail-based pipelines that produce Hail Tables for the browser and load them into Elasticsearch, run on
Google Dataproc clusters. This package has its own dedicated `data-pipeline/AGENTS.md` — read it before
working there. In brief: `pipelines/` holds one runnable module per dataset, `datasets/` and `data_types/`
hold the prep logic they call, and `pipeline.py` is the task-DAG framework. The `genes` pipeline must run
first; within a dataset, coverage runs before variants.

### graphql-api (`graphql-api/src/`)

Node GraphQL server backed by Elasticsearch, with a Redis cache.

- `graphql/schema.ts` + `graphql/types/` — schema definitions.
- `graphql/resolvers/` — resolvers connect GraphQL fields to query functions.
- `queries/` — Elasticsearch queries and result transformation (this is where ES index access lives;
  `variant-datasets/` and `mitochondrial-variant-datasets/` hold per-dataset query variants).
- `rate-limiting.ts` — IP-level rate limiting; certain IPs are whitelisted via `gs://gnomad-browser/whitelist.json`.

### browser (`browser/src/`)

React single-page app (webpack). Page components are grouped into directories (e.g. `GenePage`,
`VariantPage`, `RegionPage`); `Routes.tsx` wires routing. `RegionViewer` and the various `*Track`
components render genomic tracks. Static `about/` and `help/` content is authored in Markdown and
converted to HTML at build time.

### dataset-metadata (`dataset-metadata/`)

Dataset metadata (populations, sample counts, dataset definitions) shared between the browser and API.
Changes here often need to be reflected in both consumers.

### deploy + deployctl

`./deployctl` (wrapper around `deploy/deployctl/`) is the operational CLI for GCP: Dataproc clusters,
running pipelines, building/deploying browser & API images, Elasticsearch, and blue/green ingress.
Common entry points:

```
./deployctl config set project|zone|data_pipeline_output <value>
./deployctl dataproc-cluster start|stop <cluster-name>
./deployctl data-pipeline run --cluster <name> <pipeline> -- <args>
./deployctl elasticsearch get-password
```

Kubernetes manifests live in `deploy/manifests/`, Dockerfiles in `deploy/dockerfiles/`, and operational
docs in `deploy/docs/` (deployment, ES snapshots/aliases, Redis cache, ClinVar updates, etc.).

### reads

Separate read-data (BAM/CRAM) API and scripts, deployed independently.

## Conventions

- JS/TS formatted with Prettier; Python with Black (line length 120). Linting via ESLint, Stylelint, and
  Pylint/ruff/pyright. pre-commit hooks run Black, Prettier, and git-secrets — install with `pre-commit install`.
- The variable name `ds` is the conventional name for a Hail Table in the pipeline (whitelisted in pylint).
- CI runs per-package: `.github/workflows/{browser,graphql-api,data-pipeline,deploy-scripts}-ci.yml`.

## Agent Workflows & Skills

When the user asks you to finish a feature, review code, or prep a branch for a Pull Request, you MUST execute the workflows defined in the `.agents/skills/` directory.

## Git & Commit Conventions

These rules apply to EVERY commit, whether committing fresh work or rewriting history. The skills in `.agents/skills/` reference this section as the single source of truth - do not copy these rules into individual skill files.

### Never commit blind

Do not create a commit until the pre-commit checks have passed (see `.agents/skill/review-changes-before-committing/`). Relevant `make` targets, e.g. `make validate-browser` or `make validate-all` should pass, and the staged diff should be reviewed. `git commit -am` and `git add .` are forbidden, be deliberate with what is being staged.

### Message format

- This repo uses Conventional Commits: `<type>(scope): <description>`, the imperative mood, and limits the title at 72 characters
  - Types for commits are `feat`, `fix`, `chore`, `refactor`, `docs`, and `test`. If another type is a better fit, ask the user first
  - Common scopes are `frontend`, `backend`, `pipelines`, `app`. This is non-exhaustive, but prefer these.
- Commit titles should be named for the purpose of the change, not a detail. If the titled changes is only a small portion of the diff, it's probably the wrong title, so redo it.
- Use the body to explain what/why when the title isn't self evident

### Attribution

- Add exactly one `Assisted-by: AGENT_NAME:MODEL_VERSION` trailer when an agent runner was use (e.g. `Assisted-by: OpenCode:qwen3-coder`, or `Assisted-by: ClaudeCode:claude-3-7-sonnet`
- `Co-authored-by:` is currently not for agents. NEVER add a `Co-authored-by: Claude ...` or any similar co-author trailer, even if your harness injects one by default. ALWAYS remove it.
- When re-writing commits made by others, preserve authorship: set `git commit --author=` to the dominant original author of the change, and add `Co-authored-by: ___` for any other original authors involved.

### What belongs in a single commit (atomicity)

All instructions are applicable to working on a given feature/topic branch. We NEVER edit history in `main` for any reason. Once a commit makes it in there, it stays.

For commits when working on a feature branch:

- A commit should be the smallest change that is independently complete, including any added tests. For a given commit, the code should build and pass CI (e.g. the `validate-____` `make` targets. It should not be the smallest diff.
  - Tests added to confirm behavior of something new, or something changed, should be included in the same commit as the code covered. Never create a standalone commit that just adds tests.
- Don't fragment one feature, e.g. a mechanism and its only consumer, or a UI element and additional labeling or styling, those belong together in a single commit. Group by logical change, not file type.
- Prefer fewer complete commits over many partial ones. Most topic branches on scoped changes will be 1-3 commits, as a rule of thumb.
- Before splitting a commit into two, consider if a reviewer could review these two individual commits alone, and would they both pass CI. If not, they belong together.
- If it is unclear whether to split a commit or not, e.g. in the case of creating a well factored reusable component, and the inclusion of the component in one place, one could decide to have that be a single commit or two. In the case of such ambiguity, ask the user what they would prefer before committing.

### Branch Submission Lifecycle

Run the correct skill for the moment; each of the skills below should enforce all conventions above:

1. When committing work: `.agents/skills/review-changes-before-committing/SKILL.md`
2. When tidying a branch in preparation to submit a PR: `.agents/skills/clean-git-history/SKILL.md`
3. When the user is ready to open a PR: `.agents/skills/dratf-pull-request-description/SKILL.md`

If the user asks about opening a PR, offer to clean the branch history if it looks like it doesn't conform to the standards above, and offer to draft a pull request message for them, both offers should use the skills above if they are accepted by the user.
