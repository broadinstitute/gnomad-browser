CREATE TABLE IF NOT EXISTS lr_sample_metadata (
    sample_id LowCardinality(String),
    subpopulation LowCardinality(String),
    superpopulation LowCardinality(String),
    population_descriptor String,
    sex LowCardinality(String),
    collection LowCardinality(String)
) ENGINE = ReplacingMergeTree()
ORDER BY sample_id;
