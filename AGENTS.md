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

JavaScript/TypeScript (run from repo root):

```
pnpm install              # install JS workspace deps
pnpm typecheck            # tsc --noEmit across the workspace
pnpm lint:js              # ESLint
pnpm lint:css             # Stylelint (CSS + styled-components)
pnpm format               # Prettier --write
pnpm test:jest            # all Jest unit tests
pnpm test:jest --projects browser        # only one package (browser | graphql-api | dataset-metadata)
pnpm jest <path-or-name>                 # single test file or -t name pattern
pnpm test:jest:debug      # Jest under node --inspect-brk
pnpm test:playwright      # Playwright e2e (needs a running backend; see below)
```

Jest is configured (`jest.config.ts`) as three projects matching `**/*.spec.(js|jsx|ts|tsx)` in the
`browser`, `graphql-api`, and `dataset-metadata` packages.

Playwright e2e tests run against a deployed/locally-running API; set `GNOMAD_API_URL`, e.g.
`GNOMAD_API_URL=http://localhost:8010/api pnpm test:playwright`.

Python data pipeline (run from `data-pipeline/`):

```
pip install -r data-pipeline/requirements.txt   # plus requirements-dev.txt and deploy/deployctl/requirements.txt
./check.sh                # pyright + black + ruff --fix + pytest (the full local check)
./check.sh --mock-data    # only mock_data tests
pytest                    # excludes mock_data/broken tests by default (see pytest.ini)
pytest tests/v4/...       # testpaths are tests/pipeline and tests/v4
black .                   # format (line length 120, see pyproject.toml)
pylint data-pipeline/src/data_pipeline
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

### Branch Submission Lifecycle

Execute these in exact order:

1. **Pre-Review:** Trigger `.agents/skills/review-changes-before-committing/SKILL.md`. This ensure you run some baseline checks for each commit. Fix any issues found.

2. **Atomic Commits:** Do NOT lump all changes into one commit. `git commit -am` and `git add .` are explicitly forbidden. Group the diff logically. Separate UI changes, API/GraphQL changes, and configuration changes into distinct, cleanly named Conventional Commits.

3. **Draft PR:** Trigger `.agents/skills/draft-pull-request-description/SKILL.md`. This will fill out the project's PR template, automatically select the Squash/Rebase merge strategy based on the commit history, and remind the user to upload UI screenshots.

### Branch Cleanup

If the user asks you to tidy up a messy commit history or fix commit names on an existing branch, you must trigger `.agents/skills/branch-cleanup/SKILL.md`. Follow its safety protocols (creating a backup branch and using `git reset --soft`) exactly. As an LLM, never use interactive rebasing, as that risks dropping existing commits.

If the user asks about opening a PR, offer to clean the branch history with the skill referenced above.
