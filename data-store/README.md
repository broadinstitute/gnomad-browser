# data-store

A rust crate that primarily uses datafusion to read gnomAD data from parquet files, and return it as input to our existing GraphQL API.

It's built as a rust crate, and can be built as an addon to a node process, through NAPI.rs.

This README is rough working draft/runbook of information about this crate while we iron out the details.

## Requirements

Tool versions (Rust, Node, pnpm) are pinned in the repo root `.tool-versions`.

## Data

## Build

Run all commands in this README from `data-store/`. First install the Node
dependencies.

```bash
pnpm install --filter @gnomad/data-store...
```

- Build the rust library:

```bash
cargo build
```

- Build the NAPI bindings to allow linking of the rust library from a node process (faster compilation, useful for development and/or running tests:

```bash
pnpm build:native
```

- Build the NAPI bindings in release mode (better performance)

```bash
pnpm build:native:release    # release addon; use this for timing anything
```

## Running tests

- Run rust formatting, linting, etc

```bash
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings   #
```

- Run rust tests

```bash
cargo test --locked
```

Build node bindings in release mode, run the test within this repo

```bash
pnpm build:native && pnpm test:node
```

The Node tests load the built addon, so rebuild it after any change under `src/`.
These are the same steps as `.github/workflows/data-store-ci.yml`.

The tests read only the small Parquet files in `tests/fixtures/`. They prove the
code works against that shape of data, not that it works against a real export.
Use the examples below for that.

## Expected Parquet layout

The rust library expects a root directory containing one dir for each dataset

`tests/fixtures/` is a working example of this layout. Only the datasets a given
reader needs have to be present.

The example layout can be seen in `tests/fixtures` in this dir, or at `gs://gnomad-v4-data-pipeline/output/parquet/demo-mirror/2026-11-02`.

Currently, the layout is:

```
└── parquet
    ├── clinvar_variants_grch38
    ├── gene_models_grch38
    └── gnomad_variants_v4
```

`gnomad_variants_v4` is Hive-partitioned by `chrom` (no `chr` prefix, e.g. `chrom=22`) and then
`posbin`, which is `(pos - 1) // 1000000`. It has no `variant_id`, `locus`, or `alleles` columns; the
reader derives them from `chrom`, `pos`, `ref`, and `alt`.

If one has the proper permissions, you can copy the `demo-mirror/2026-11-02/parquet` dir to your machine to have a working copy of the dataset for local use.

## Run the examples against a Parquet directory

Each file in `examples/` is a small command-line reader. Point one at a real
export to check the data and the code agree. Replace `<DATA_ROOT>` with your Parquet
root directory.

```bash
# Genes
cargo run --release --example read_gene -- <DATA_ROOT> ENSG00000169174
cargo run --release --example read_genes_in_region -- <DATA_ROOT> 1 55000000 55100000

# gnomAD v4 (subset is `all` or `non_ukb`; add --print-variants for full records)
cargo run --release --example read_gnomad_v4_region -- <DATA_ROOT> 1 55039000 55040000 all
cargo run --release --example read_gnomad_v4_variant -- <DATA_ROOT> 1-55039469-T-G

# ClinVar (these take a path to a file or the dataset directory, not ROOT)
cargo run --release --example read_clinvar_region -- <DATA_ROOT>/clinvar_variants_grch38 1 55039000 55040000
```

`read_gnomad_v4_exons` and `read_clinvar_exons` take an annotation kind
(`gene` or `transcript`), an ID, a chromosome, and one or more `start:stop`
intervals; run them without arguments for the usage message.

Examples print store initialization and query timings to stderr.

## Run a local graphql-api on Parquet (work in progress)

Below is a temporary runbook to serve the limited implemented datasets from Parquet files on a local API, with a local frontend

### 1. Build the bindings

`graphql-api` depends on the workspace package `@gnomad/data-store`, so build the
bindings first, in release mode. Rebuild after any change under `src/`.

```bash
pnpm build:native:release
```

### 2. Check the data

`PARQUET_DATA_ROOT` must be a directory with `gene_models_grch38/`,
`clinvar_variants_grch38/` and `gnomad_variants_v4/`. The API opens all three
stores at startup, so all three must exist. Check the data with the examples
above first; if those fail, the API will too.

### 3. Start the API

Fully local, with no Elasticsearch, Redis or GCP access:

```bash
# from dir root
PARQUET_DATA_STORE_ENABLED=true \
PARQUET_ONLY=true \
PARQUET_DATA_ROOT=<DATA_ROOT> \
pnpm start:api
```

Where

- `PARQUET_DATA_STORE_ENABLED` is an env var that allows the API to route its requests to the new datastore, rather than to ES
- `PARQUET_ONLY` is an env var that makes the API never make a call to ES
- `PARQUET_ROOT` is the location of the `parquet/` dir with the required data within it

### 4. Check it works

GraphiQL is served at <http://localhost:8010/api> when `NODE_ENV` is not
`production` (`start.sh` sets `development`). Or query from the shell:

Use a variant ID that exists in your Parquet data; the one above is only an example.

### 5. Point the browser at it

From the repo root:

```bash
GNOMAD_API_URL=http://localhost:8010/api pnpm start:browser
```

Go to a gene/region/variant on chr22,
e.g. TST - http://localhost:8008/gene/ENSG00000128311?dataset=gnomad_r4

See `CONTRIBUTING.md` for the browser's `build.env` setup. Pages that need data
the store does not serve will be incomplete in `PARQUET_ONLY` mode.
