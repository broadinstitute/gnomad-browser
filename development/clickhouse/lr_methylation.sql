CREATE TABLE IF NOT EXISTS lr_methylation (
    chrom LowCardinality(String),
    pos1 UInt32,
    pos2 UInt32,
    sample_id LowCardinality(String),
    methylation Float32,
    coverage UInt16
) ENGINE = MergeTree()
PARTITION BY chrom
ORDER BY (chrom, pos1, sample_id);
