# data-store

A Rust crate that uses DataFusion to read gnomAD browser data from Parquet files.

This README is a working draft while the crate takes shape.

## Requirements

Tool versions are pinned in the repo root `.tool-versions`.

## Build and test

Run these from `data-store/`, or use the `make` targets from the repo root.

```bash
cargo build
cargo test
```

The same checks CI runs (formatting, clippy, tests):

```bash
make validate-data-store   # from the repo root
make fix-data-store        # apply formatting and clippy fixes
```

The tests read only the small Parquet files in `tests/fixtures/`. They show the code works
against that shape of data, not that it works against a real export. Use the example below
for that.

## Expected Parquet layout

Readers take a root directory containing one subdirectory per dataset:

```
<DATA_ROOT>
└── clinvar_variants_grch38
    ├── chrom=1/*.parquet
    └── chrom=2/*.parquet
```

The `chrom=` directory names are read as the `chrom` column, and queries filter on it to skip
other chromosomes' files; the files themselves need no chromosome column.

`tests/fixtures/` follows this layout. A full copy of the data lives at
`gs://gnomad-v4-data-pipeline/output/parquet/demo-mirror/2026-11-02`; with the right
permissions, copy its `parquet` directory to your machine to use as `<DATA_ROOT>`.

## Run the example against a Parquet directory

```bash
cargo run --release --example read_clinvar_variant -- <DATA_ROOT> 1-66926-AG-A
```

Against the fixtures:

```bash
cargo run --example read_clinvar_variant -- tests/fixtures 1-66926-AG-A
```
