CREATE TABLE IF NOT EXISTS lr_str_histograms (
    chrom LowCardinality(String),
    position UInt32,
    end_position UInt32,
    motif String,
    allele_size_histogram String,
    biallelic_histogram String,
    min_repeats Float32,
    mode_repeats Float32,
    mean_repeats Float32,
    stdev_repeats Float32,
    median_repeats Float32,
    p99_repeats Float32,
    max_repeats Float32,
    unique_allele_lengths UInt32,
    num_called_alleles UInt32,
    populations Map(String, String)
) ENGINE = MergeTree()
PARTITION BY chrom
ORDER BY (chrom, position);
