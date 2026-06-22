# gnomAD Browser - Agent Instructions - data-pipeline

This file provides guidance to LLM agents (e.g. claude.ai/code) when working in `data-pipeline/`.
See the repo-root `AGENTS.md` for the monorepo-wide picture (the pipeline feeds Elasticsearch, which the
graphql-api serves to the browser).

## What this is

Hail (Python) pipelines that transform raw gnomAD / ClinVar / reference data into Hail Tables for the
browser, then load them into Elasticsearch. Designed to run on Google Dataproc clusters but also runnable
locally against `gs://` or local paths.

Python 3.9.17 (see `.tool-versions`). Key deps (`requirements.txt`): `hail==0.2.127`, `elasticsearch~=7.17`,
`attrs`/`cattrs`, `loguru`, `tqdm`.

## Commands

```
pip install -r requirements.txt        # plus repo-root requirements-dev.txt and deploy/deployctl/requirements.txt
./check.sh                # full local gate: pyright + black + ruff --fix + pytest
./check.sh --mock-data    # run only the mock_data-marked tests
pytest                    # testpaths: tests/pipeline, tests/v4
pytest -k <expr>          # default addopts already exclude mock_data and broken (see pytest.ini)
black src/data_pipeline tests   # format, line length 120 (pyproject.toml)
ruff src/data_pipeline --fix
pylint src/data_pipeline
```

`pytest.ini` markers: `mock_data` (needs mock datasets present), `broken` (skipped), `only`. The default
`addopts` run with `-k "not mock_data and not broken"`, so plain `pytest` skips those.

## Running pipelines (Dataproc)

Driven from the repo root via `./deployctl` (see `data-pipeline/README.md` and `deploy/`):

```
./deployctl config set project|zone|data_pipeline_output <value>
./deployctl dataproc-cluster start <cluster-name>
./deployctl data-pipeline run --cluster <name> <pipeline> -- <pipeline-args>
./deployctl dataproc-cluster stop <cluster-name>
```

Ordering constraints:

- `genes` must run first (other pipelines depend on its gene/transcript tables).
- Within a dataset, coverage runs before variants.
- `genes` shuffles heavily — do NOT run it on clusters with preemptible workers.
- ClinVar pipelines run VEP — they need a cluster with the right VEP version (see
  `deploy/docs/UpdateClinvarVariants.md`).
- `export_to_elasticsearch.py` is the pipeline that loads results into Elasticsearch.

## Code layout (`src/data_pipeline/`)

- `pipeline.py` — the framework (see below).
- `config.py` — `PipelineConfig` and the `mock`/`full` `DataEnvironment` enum.
- `pipelines/` — one runnable module per output dataset (e.g. `genes.py`, `gnomad_v4_variants.py`,
  `clinvar_grch38.py`, `export_to_elasticsearch.py`). Each ends with `if __name__ == "__main__": run_pipeline(pipeline)`.
- `datasets/` — dataset-specific prep, grouped by release: `exac/`, `gnomad_v2/`, `gnomad_v3/`,
  `gnomad_v4/`, plus `clinvar.py`. The functions here are what tasks call.
- `data_types/` — cross-dataset logic: `gene.py`, `transcript.py`, `coverage.py`, `pext.py`, `locus.py`,
  GTEx expression, and `variant/` (variant IDs, annotation, VEP transcript-consequence handling).
- `helpers/` — shared utilities (e.g. `annotate_table`).
- `caids/` — scripts for fetching CAIDs from the ClinGen Allele Registry.

## How a pipeline module is structured

A pipeline is a declarative DAG of tasks built up on a module-level `pipeline = Pipeline()`. Pattern
(from `pipelines/genes.py`):

```python
from data_pipeline.pipeline import Pipeline, run_pipeline

pipeline = Pipeline()

# Download an external input to a path under the staging/output root:
pipeline.add_download_task("download_hgnc", HGNC_URL, f"/{subdir}/hgnc.tsv")

# A compute task: name, function, output .ht path, {input_name: dependency}, {param: value}
pipeline.add_task(
    "prepare_grch38_genes",
    prepare_genes,                                  # a function from datasets/ or data_types/
    f"/{subdir}/genes_grch38_base.ht",
    {"gencode_path": pipeline.get_task("download_gencode_v39_gtf"),  # wiring deps by task object
     "hgnc_path": pipeline.get_task("download_hgnc")},
    {"reference_genome": "GRCh38"},                 # plain params
)

# Name the tables other pipelines/ES export consume:
pipeline.set_outputs({"genes_grch38": "annotate_grch38_genes_step_8", ...})

if __name__ == "__main__":
    run_pipeline(pipeline)
```

Framework details (`pipeline.py`):

- `add_task(name, fn, output_path, inputs={}, params={})` — `inputs` values that are task objects become
  dependencies and are passed to `fn` resolved to their output paths; `params` are passed through verbatim.
- Tasks are **skipped if already computed** — `file_exists`/`modified_time` check for a `_SUCCESS` file
  for `.ht` outputs, against either `gs://` (Hail Hadoop FS) or the local FS.
- `run_pipeline` parses CLI args: `--output-root`, `--force <task...>` (mutually exclusive with
  `--force-all`) to recompute despite cached outputs, then calls `hl.init()` and runs tasks in declared
  order.
- `set_outputs` / `get_output` expose named outputs to downstream pipelines; `PipelineMock` substitutes
  these in tests.

When changing an external-source URL, check the surrounding comments — some (e.g. the MANE transcripts
URL in `genes.py`) require reloading all GRCh38 variants in Elasticsearch because they affect transcript
consequence ordering.

## Conventions

- `ds` is the conventional variable name for a Hail Table (whitelisted in pylint, see `pyproject.toml`).
- Formatting: Black (line length 120); linting: ruff + pylint (R/C categories disabled); types: pyright.
- Tests live in `tests/pipeline/` (framework/config tests) and `tests/v4/`.
