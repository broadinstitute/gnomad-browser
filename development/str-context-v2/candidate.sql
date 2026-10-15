-- CANDIDATE ONLY. Offline specification, never run by the generator.
-- Apply only with separate authorization to a new, isolated candidate database.
-- No IF NOT EXISTS: existing/reused destinations require explicit reconciliation.
CREATE TABLE lr_y1_str_context_histograms_v2
(
    contract LowCardinality(String),
    cohort LowCardinality(String),
    run_id String,
    task_id String,
    source_uri String,
    source_generation String,
    source_size_bytes UInt64,
    source_md5_base64 String,
    row_ordinal UInt64,
    locus_id String,
    motif String,
    chrom LowCardinality(String),
    locus_start UInt32,
    locus_end UInt32,
    source_interval String,
    context_chrom LowCardinality(String),
    context_start UInt32,
    context_end UInt32,
    source_vc Nullable(String),
    num_called_alleles UInt32,
    unique_allele_lengths UInt32,
    source_header Array(String),
    source_fields Map(String, String),
    projection_version String,
    receipt_digest String
)
ENGINE = MergeTree
ORDER BY (cohort, run_id, projection_version, receipt_digest, source_uri, source_generation, row_ordinal);

CREATE TABLE lr_y1_str_context_mapping_v2
(
    cohort LowCardinality(String),
    ancillary_run_id String,
    primary_database String,
    primary_snapshot_digest String,
    canonical_locus_id String,
    -- Sentinel only for an unavailable compound page; never select component zero.
    component_index UInt32,
    chrom LowCardinality(String),
    named_start Nullable(UInt32),
    named_end Nullable(UInt32),
    motif Nullable(String),
    mapping_status LowCardinality(String),
    context_count UInt32,
    source_uri Nullable(String),
    source_generation Nullable(String),
    source_row_ordinal Nullable(UInt64),
    primary_binding_status LowCardinality(String),
    primary_an_concordance LowCardinality(String),
    projection_version String,
    receipt_digest String
)
ENGINE = MergeTree
ORDER BY (cohort, ancillary_run_id, primary_database, primary_snapshot_digest,
          projection_version, receipt_digest, canonical_locus_id, component_index);
