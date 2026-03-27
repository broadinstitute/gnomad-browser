CREATE TABLE IF NOT EXISTS lr_coverage (
    chrom LowCardinality(String),
    pos UInt32,
    mean Float32,
    median Float32,
    over_1 Float32,
    over_5 Float32,
    over_10 Float32,
    over_15 Float32,
    over_20 Float32,
    over_25 Float32,
    over_30 Float32,
    over_50 Float32,
    over_100 Float32
) ENGINE = MergeTree()
PARTITION BY chrom
ORDER BY (chrom, pos);
