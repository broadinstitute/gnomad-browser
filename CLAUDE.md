# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
for the JS workspace. The data pipeline's Python deps are managed with uv (`data-pipeline/pyproject.toml`
+ `uv.lock`); see `data-pipeline/CLAUDE.md`.

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
uv sync                   # install deps from pyproject.toml + uv.lock (runtime + dev)
./check.sh                # pyright + ruff format + ruff --fix + pytest (the full local check)
./check.sh --mock-data    # only mock_data tests
uv run pytest             # excludes mock_data/broken tests by default (see pytest.ini)
uv run pytest tests/v4/...   # testpaths are tests/pipeline and tests/v4
uv run ruff format src/data_pipeline tests   # format (line length 120, see pyproject.toml)
pylint src/data_pipeline  # pylint installed via repo-root requirements-dev.txt
```

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
Google Dataproc clusters. This package has its own dedicated `data-pipeline/CLAUDE.md` — read it before
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
